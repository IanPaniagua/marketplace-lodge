# Analytics — Lodge-Marketplace

This document describes **what** we measure and **why**, followed by **how** it is
implemented in the codebase. It is the single reference for the analytics dashboard
that lives at `/admin/analytics`.

The product is a private PWA for ~40 students in one lodge. The analytics scope is
deliberately small: we only need to answer two questions on a weekly cadence —
*is this app being used?* and *is the marketplace healthy?*

No third-party analytics tool is used. No Google Analytics. No PostHog. No Vercel
Analytics. All KPIs are derived from the existing application database.

---

## Part 1 — What we measure

KPIs are grouped into five sections. The dashboard at `/admin/analytics` mirrors
this grouping. Every KPI that is window-sensitive (counts within a period) honours
the window selector at the top of the page: `7d`, `30d`, `90d`, `all time`.
Window-independent KPIs are explicitly noted.

### 1. Adoption — *did the app reach its market?*

| KPI | Meaning | Formula |
|---|---|---|
| **Lodge adoption** | Share of the lodge that signed up and was approved. The headline number. | `approved_users / 40` |
| **Approved users** | Total active accounts (not soft-deleted, approved). | `count(profiles where is_approved AND deleted_at IS NULL)` |
| **Pending approvals** | Backlog of signups awaiting admin review. | `count(profiles where NOT is_approved AND deleted_at IS NULL)` |
| **New signups** *(window)* | Registrations created inside the selected window. Tracks acquisition cadence. | `count(profiles where created_at ≥ cutoff)` |

> Lodge size is hardcoded to **40**. Update `LODGE_SIZE` in `src/lib/metrics.ts`
> if the building's actual capacity changes.

### 2. Engagement — *do people come back?*

These KPIs are fixed at standard windows (7 and 30 days) regardless of the page's
window selector. They are the textbook engagement metrics.

| KPI | Meaning | Formula |
|---|---|---|
| **WAU** | Weekly active users — distinct users that opened the app in the last 7 days. | `count(profiles where last_active_at ≥ now − 7d)` |
| **MAU** | Monthly active users — distinct users that opened the app in the last 30 days. | `count(profiles where last_active_at ≥ now − 30d)` |
| **Stickiness** | What share of monthly users come back weekly. Industry rule of thumb: 20% is OK, 50% is exceptional. | `WAU / MAU` |

"Active" means *opened any authenticated page* — not just users who posted or
chatted. See *How — last_active_at* below for the mechanism.

### 3. Marketplace — *is supply moving?*

| KPI | Meaning | Formula |
|---|---|---|
| **Live listings** | Current visible inventory. | `count(listings where status = 'live')` |
| **New listings** *(window)* | Supply being added. | `count(listings where created_at ≥ cutoff)` |
| **Sold** *(window)* | Transactions completed (status flipped to `sold`). | `count(listings where status = 'sold' AND updated_at ≥ cutoff)` |
| **Time to sold** | Median days a listing stays live before being marked sold. All time. | `median(updated_at − created_at)` over `status = 'sold'` |
| **Sell-through rate** | Of everything that ever went live, what share got sold. All time. | `count(sold) / count(live + sold)` |

### 4. Conversation — *does interest convert to contact?*

| KPI | Meaning | Formula |
|---|---|---|
| **Conversations started** *(window)* | New 1-to-1 threads opened from a listing. Proxy for buyer interest. | `count(conversations where created_at ≥ cutoff)` |
| **Listings with chat** | Of live and sold listings, the share that received at least one conversation. All time. | `distinct(conversations.listing_id) / count(live + sold)` |
| **Avg messages per chat** | Average thread length. Higher generally means better match quality (people negotiating, not bouncing). All time. | `count(messages) / count(conversations)` |

### 5. Operational health — *can the admin keep up?*

| KPI | Meaning | Formula |
|---|---|---|
| **Open reports** | Reports awaiting moderation. Should stay near zero. | `count(reports where status = 'open')` |
| **Time to resolve** | Median hours from report creation to resolution. All time. | `median(resolved_at − created_at)` over `status = 'resolved'` |

---

## Part 2 — How it is implemented

### Architecture at a glance

```
┌──────────────────────────────────────────────────────────────┐
│  Insforge Postgres                                           │
│  - profiles (incl. last_active_at)                           │
│  - listings, conversations, messages, reports                │
└────────────┬─────────────────────────────────────────────────┘
             │ admin client (service role) — server-side only
             ▼
┌──────────────────────────────────────────────────────────────┐
│  src/lib/metrics.ts                                          │
│  getMetrics(window) → MetricsPayload                         │
│  Runs ~16 queries in parallel, computes medians in-process.  │
└─────────┬──────────────────────────────────────┬─────────────┘
          │                                      │
          ▼                                      ▼
┌────────────────────────┐         ┌──────────────────────────┐
│  /admin/analytics      │         │  GET /api/admin/metrics  │
│  Server Component      │         │  Same payload, JSON.     │
│  Renders stat cards.   │         │  For future client use.  │
└────────────────────────┘         └──────────────────────────┘
```

Both consumers go through the same `getMetrics()` function — there is one source
of truth.

### Data: how `last_active_at` is captured

Standard timestamps (`created_at`, `updated_at`, `resolved_at`) already existed on
all the tables we need. The only schema change for analytics is a single column on
`profiles`:

```sql
ALTER TABLE profiles ADD COLUMN last_active_at timestamptz;
CREATE INDEX profiles_last_active_at_idx
  ON profiles (last_active_at) WHERE deleted_at IS NULL;
```

The column is updated by `src/middleware.ts` on every authenticated request, with
a **throttle of one write per hour per user**. This avoids hammering the database
on every navigation while keeping the metric honest.

```ts
// src/middleware.ts (excerpt)
const LAST_ACTIVE_THROTTLE_MS = 60 * 60 * 1000;

const lastActiveMs = profile.last_active_at
  ? new Date(profile.last_active_at).getTime() : 0;
if (Date.now() - lastActiveMs > LAST_ACTIVE_THROTTLE_MS) {
  await touchLastActive(token, user.id);
}
```

The write is wrapped in `try/catch` — a failed analytics write must never block
navigation. RLS allows the user to update their own row (`id = auth.uid()`), so no
extra policy is needed.

### Query layer: `src/lib/metrics.ts`

A single function does all the work:

```ts
export async function getMetrics(window: MetricsWindow): Promise<MetricsPayload>;
```

Design choices:

- **Service-role client.** Metrics aggregate across all users, so the admin client
  (`createAdminClient()`) is used. The endpoint and page each verify `is_admin`
  before invoking it.
- **All queries in parallel.** `Promise.all` over ~16 queries. At the 40-user
  scale this completes in a few hundred milliseconds.
- **Medians in JavaScript.** For median time-to-sold and median time-to-resolve
  we fetch the relevant rows (typically under 1,000) and compute the median in
  memory. Cheap enough at this scale and avoids needing custom PostgreSQL
  functions.
- **No caching.** Page is `dynamic = 'force-dynamic'`, endpoint sends
  `cache-control: no-store`. Numbers are always current. If the database grows
  enough to make this slow, the natural next step is `unstable_cache` with a
  short TTL.

### Routes

| Route | Type | Purpose |
|---|---|---|
| `/admin/analytics` | Server Component page | Renders the dashboard. Uses `getMetrics()` directly — no API round-trip. |
| `/admin/analytics?window=7d\|30d\|90d\|all` | Same page | The window selector uses plain `<Link>` elements with search params — no client JS. |
| `GET /api/admin/metrics?window=7d` | Route Handler | Returns the JSON payload. Exists for future client-side refresh, scripts, or external dashboards. |

### Access control

Both consumers replicate the same two-step check used by every other admin route:

1. Middleware (`src/middleware.ts`) blocks non-admins from any path under
   `/admin/*`.
2. The page and the endpoint each call `getServerProfile()` and verify
   `profile.is_admin` before doing anything else.

The service-role key is never exposed: it is only read inside
`src/lib/insforge-server.ts#createAdminClient` which is server-only.

### UI

- All KPI numbers render in shadcn `Card` components with `tabular-nums` for
  alignment.
- The dark red accent (`text-primary`) is reserved for the single headline KPI —
  *Lodge adoption*. Other numbers stay neutral, matching the
  `lodge-marketplace-ui` skill's rule of *one accent, used sparingly*.
- The grid collapses to two columns at 360px and expands to up to five columns
  on wide viewports.
- Missing data (e.g. no sold listings yet) renders as `—` rather than `0` or
  `NaN`.

### What this implementation explicitly does **not** do

These are intentional omissions — V1 is small on purpose. If any of them becomes
necessary later, add it as a follow-up phase, not as a side change.

- **No charts or time-series.** Numbers only. Add `recharts` if a sparkline
  becomes valuable.
- **No page-view or funnel tracking.** With 40 users, individual-event tracking
  is overkill.
- **No delta-vs-previous-period indicators.** Easy to add by running the same
  queries against a shifted window.
- **No external analytics integration.** No GA, no PostHog, no Vercel Analytics.
  Keeps student data inside the project's database — no third party gets a copy.
- **No materialized views or pre-aggregation jobs.** All metrics are computed on
  request. Will be revisited if/when row counts grow.

### How to add a new KPI

1. Decide which of the five sections it belongs to.
2. Add the computation to `src/lib/metrics.ts`:
   - Build the query alongside the existing ones (use the admin client).
   - Add the result to the relevant section of `MetricsPayload`.
3. Add a `<Stat>` card to the right section in
   `src/app/(app)/admin/analytics/page.tsx`.
4. Update the table in **Part 1** of this document.
5. Run `npx tsc --noEmit` and `npm run lint` before committing.

If the new KPI needs a new column or table, do the migration via the Insforge
MCP (`run-raw-sql`) and update `src/types/db.ts` to match — never store schema
changes only in a local SQL file.
