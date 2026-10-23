# Lodge-Marketplace — Task List

> Phased build plan. Each **phase** is a complete, demoable slice of the app.
> Do not start phase N+1 until every Acceptance Criterion (AC) and the
> Definition of Done (DoD) of phase N are checked off. After each phase, stop
> and ask the user to verify before continuing.

---

## Definition of Done — applies to every phase

A phase is **Done** only when ALL of the following are true:

- [ ] All Acceptance Criteria for the phase are demonstrably true.
- [ ] TypeScript compiles with **zero errors** (`npx tsc --noEmit`).
- [ ] ESLint passes with zero errors (`npm run lint`).
- [ ] The dev server runs without console errors on the affected pages.
- [ ] All new UI follows the `lodge-marketplace-ui` skill (no exceptions).
- [ ] No `any` types introduced (use `unknown` + narrow, or define the type).
- [ ] No hardcoded text outside the supported English copy (no Spanish/German leftovers).
- [ ] Mobile (360px viewport) verified: layout doesn't break, tap targets ≥ 44px.
- [ ] No secrets committed (`.env.local` in `.gitignore`).
- [ ] A short summary of what changed is reported to the user.

If any AC cannot be satisfied, **stop and ask** — don't paper over it.

---

## Phase 0 — Project bootstrap

**Goal:** A linked, running Next.js app connected to a fresh Insforge project, with the UI skill and conventions in place.

### Tasks
1. Confirm Insforge MCP is connected (`fetch-docs` works). If not, halt and tell the user to run `npx add-mcp https://mcp.insforge.dev/mcp` and `claude /mcp`.
2. Provision a trial project via the Insforge `signup` flow. Persist `accessApiKey`, `projectUrl`, `claimUrl`.
3. Run `npx @insforge/cli link --api-base-url <projectUrl> --api-key <accessApiKey> --template nextjs` to scaffold the app.
4. `cd` into the scaffolded folder. Move/copy these files into the repo root:
   - `lodge-marketplace-brief.md`
   - `engineering-spec.md`
   - `tasks.md`
   - `CLAUDE.md`
   - `.claude/skills/lodge-marketplace-ui/SKILL.md`
5. Initialize shadcn/ui: `npx shadcn@latest init` with neutral base. Install: `button input textarea label form card dialog sheet dropdown-menu avatar badge tabs skeleton sonner`.
6. Replace `app/globals.css` `:root` with the tokens from the UI skill §2.
7. Configure `tailwind.config.ts` font stack from the UI skill §3.
8. Add Prettier with `prettier-plugin-tailwindcss`.
9. Set up `@/` path alias.
10. Create the directory skeleton in `engineering-spec.md` §1 (empty placeholder files OK).
11. Create `.env.local.example` with `NEXT_PUBLIC_INSFORGE_URL`, `NEXT_PUBLIC_INSFORGE_ANON_KEY`, `INSFORGE_SERVICE_KEY`.
12. Confirm `npm run dev` boots and the default page renders.

### Acceptance Criteria
- [ ] `claudeURL` and `projectUrl` are saved somewhere visible (e.g., printed at end of phase).
- [ ] `npm run dev` boots without errors; root page is reachable.
- [ ] `npx tsc --noEmit` and `npm run lint` are green.
- [ ] shadcn primitives importable from `@/components/ui/*`.
- [ ] CSS tokens in `globals.css` match the UI skill exactly.
- [ ] `.env.local.example` exists and `.env.local` is gitignored.

### Hand-off to user
Before starting Phase 1, ask the user to claim the Insforge project at the printed `claimUrl` (24h trial limit).

---

## Phase 1 — Schema + RLS + Auth

**Goal:** A user can sign up, see "waiting for approval", an admin can approve them via DB (we'll build the admin UI in Phase 4), and an approved user can log in to a placeholder feed.

### Tasks
1. Apply schema from `engineering-spec.md` §3 via Insforge MCP. All 8 tables, indexes, types, trigger.
2. Apply RLS policies from §4. Verify each table has RLS enabled.
3. Create the `listing-photos` storage bucket per §6.
4. Build `src/lib/insforge.ts` (browser client) and `src/lib/insforge-server.ts` (server admin client using service key).
5. Build pages: `/(auth)/signup` and `/(auth)/login`.
6. Signup form: email + password + display name. On submit, create auth user, then insert profile row.
7. Login form: email + password.
8. Implement `src/middleware.ts` per §9: protects `/(app)` routes and requires a valid, non-deleted profile.
9. Build the `(app)/layout.tsx` shell with TopBar + (placeholder) BottomNav and a stub `page.tsx` saying "Feed coming soon".
10. Add a temporary admin helper: a SQL snippet in the README explaining how to manually flip `is_admin` and `is_approved` via Insforge dashboard for the first user.

### Acceptance Criteria
- [ ] All 8 tables exist with correct columns, constraints, and indexes (verify via MCP `list-tables`).
- [ ] RLS is **enabled** on every table.
- [ ] A new user can register at `/signup` and enter the app directly.
- [ ] A user without a valid profile cannot access `/`.
- [ ] Manually flipping `is_approved = true` in DB allows that user to access `/`.
- [ ] Trying to insert a `listings` row as an unapproved user is blocked by RLS.
- [ ] No service-role key is exposed in any `NEXT_PUBLIC_*` var.

---

## Phase 2 — Profiles & feed shell

**Goal:** A logged-in user can view their own profile, edit it, view someone else's profile, and the feed page lists `live` listings (still empty — listings come in Phase 3).

### Tasks
1. Build `/profile` (own) with edit form: display name, avatar and bio.
2. Avatar upload: client-side compress, upload to `listing-photos` (or a separate `avatars` bucket — create one if convenient) at path `avatars/{user_id}.webp`. Store URL in `profiles.avatar_url`.
3. Build `/profile/[id]` (other user's public view): name, avatar, bio, member since, average rating (placeholder until Phase 5), listings count.
4. Build `/profile/settings` page: change password (Insforge SDK), delete my account button (calls a server route that soft-deletes).
5. Build the feed page `/(app)/page.tsx`: server component that queries `live` listings ordered by `created_at desc`, with category filter chips and a "Free only" toggle. Empty state component when no listings.
6. BottomNav with 4 items wired to routes.
7. TopBar with Lodge logo (text "Lodge." + dot in dark red) and a profile-avatar dropdown linking to `/profile` and Logout.

### Acceptance Criteria
- [ ] `/profile` shows current user's data and allows editing all editable fields.
- [ ] Avatar upload works, image is visible immediately after save.
- [ ] `/profile/[id]` for another user shows their public info, no private fields.
- [ ] `/profile/settings` "Delete my account" actually soft-deletes (sets `deleted_at`) and logs out.
- [ ] Feed loads in < 2s on a fast connection (visually).
- [ ] Filters update the feed without a full page reload (use search params, server components).
- [ ] BottomNav active state uses `text-primary` per the UI skill.
- [ ] All forms use `react-hook-form` + zod schemas from `lib/schemas.ts`.

---

## Phase 3 — Listings CRUD + moderation queue

**Goal:** A user can create, edit, delete listings; admin can approve/reject; approved listings appear in the feed.

### Tasks
1. Build `/listings/new`: full form per `engineering-spec.md` §11, with multi-photo upload (1–5), client-side compression, drag-to-reorder.
2. On submit, insert listing with `status = 'pending'`, then insert photo rows, then call `/api/notify-new-listing` which triggers the edge function.
3. Build `/listings/[id]`: photo gallery (swipe on mobile), title, price/Free, description, category + condition pills, seller mini-card linking to their profile, "Message seller" button (placeholder for Phase 4).
4. Build `/listings/[id]/edit` for the owner. Editing price/photos/title resets `status` to `pending` and calls notify again.
5. "Mark as sold" button on owner's view, sets `status = 'sold'`.
6. Listing card on feed (per UI skill §5.1).
7. Build `/admin` shell with sidebar/tabs: Pending users · Pending listings · Reports · All users · All listings.
8. `/admin/listings` Pending tab: list of pending listings with full preview; Approve and Reject (with reason) buttons → call `/api/admin/listings/[id]/approve` or `/reject`.
9. Implement those server routes using the service-role client; verify caller is admin.
10. Implement the `notify-admin-new-listing` edge function per §10.

### Acceptance Criteria
- [ ] Creating a listing as a non-admin lands it in `pending`, not `live`.
- [ ] Pending listings do **not** appear in the feed (verify via RLS).
- [ ] Admin sees pending listings in `/admin/listings`.
- [ ] Approving moves listing to `live` and it appears in the feed within seconds (refresh OK).
- [ ] Rejecting requires/accepts a reason; owner sees the reason on their own listing detail page.
- [ ] Editing price/photos/title on a `live` listing reverts it to `pending` and triggers notification.
- [ ] Owner can delete their own listing; admin can delete any listing.
- [ ] Photo upload respects: max 5 photos, max 5MB raw, compressed to ≤ 300KB WebP before upload.
- [ ] Admin email arrives on a fresh pending listing.

---

## Phase 4 — Realtime chat + reporting

**Goal:** Buyer and seller can have a 1:1 realtime chat about a specific listing.

### Tasks
1. From `/listings/[id]`, "Message seller" creates a `conversation` (or finds the existing one for that listing+buyer pair) and navigates to `/chats/[id]`.
2. `/chats` (list): all conversations involving the user, sorted by `last_message_at desc`, showing the other party's name + avatar, last message preview, unread count.
3. `/chats/[id]`: header with other user's name + report/block menu, message list, sticky composer.
4. Realtime subscription per spec §7. New messages append without refresh. Outgoing messages render optimistically.
5. Mark messages as read: when the chat is open and a new message arrives from the other party (or on mount for unread ones), set `read_at`.
6. Unread badge in BottomNav: subscribe globally to messages in user's conversations.
7. "Report this conversation" → opens a dialog, inserts into `reports` (target_type = 'conversation').
8. Block button in chat header → inserts into `blocks`. Blocked conversations disappear from `/chats` for both sides.
9. Admin reports tab `/admin/reports`: list with filter (open/resolved), Resolve and Dismiss buttons.
10. Server-side rate limiting per §12 (in-memory bucket).

### Acceptance Criteria
- [ ] Two devices logged in as different users see new messages appear in real time without refresh.
- [ ] Composer enforces 1–2000 char range; clearly shows count near the limit.
- [ ] Blocking immediately hides the conversation, the other user's profile, and their listings on both sides.
- [ ] Unblocking from settings restores visibility (existing chat re-appears).
- [ ] Sending more than 30 messages in 1 minute returns a friendly toast and does not insert.
- [ ] Reports show up in admin queue and can be marked resolved/dismissed.
- [ ] Read receipts: a message sent by user A shows "read" (or equivalent indicator) once user B has the chat open.

---

## Phase 5 — Ratings

**Goal:** After exchanging at least one message in a conversation, both users can rate each other (1–5 stars + optional comment), edit for 7 days, and the average appears on the public profile.

### Tasks
1. On `/listings/[id]` (when status is `sold` or after first message exchanged), show a "Rate seller / buyer" CTA in the conversation header and on the listing page for the relevant party.
2. Rating dialog: 5 star input + 280-char textarea.
3. Insert into `ratings` (RLS will enforce eligibility).
4. On `/profile/[id]`: show average stars, count, list of recent comments. Use `tabular-nums` for the number.
5. On own profile, show "Edit" pencil on ratings still within `edit_locked_at`.
6. After 7 days, edits return an RLS error → handle with a friendly toast.

### Acceptance Criteria
- [ ] User cannot rate someone they have never messaged about a given listing (RLS rejects, UI shows nothing).
- [ ] One rating per (rater, ratee, listing) — second submit edits the existing or returns a clear error.
- [ ] Edits work for 7 days, then are locked.
- [ ] Average rating updates on the rated user's profile within seconds (refresh OK).
- [ ] Ratings respect blocks: blocked users don't see each other's ratings.

---

## Phase 6 — PWA + polish + deploy

**Goal:** Installable PWA, Lighthouse PWA score ≥ 90, deployed to Vercel, README complete.

### Tasks
1. Add `public/manifest.json`, icons (192, 512, maskable), `theme-color` meta in root layout.
2. Add `public/sw.js` with cache-first for static, network-first for everything else.
3. Register service worker only in production (`NODE_ENV === 'production'`).
4. Add an "Install app" prompt on iOS (manual instructions) and Android (`beforeinstallprompt` handler).
5. Add an empty "Phase 2: Events" placeholder route at `/events` linking to a "Coming soon" page (so the feature flag is wired but inactive).
6. Run Lighthouse against production build, fix issues until PWA ≥ 90, Performance ≥ 80, Accessibility ≥ 90.
7. Write `README.md` with: stack, setup, env vars, how to claim the Insforge project, how to set the first admin, how to deploy to Vercel, troubleshooting.
8. Deploy to Vercel. Set env vars. Verify the live URL works end-to-end.
9. Seed: 1 admin user (Ian) + 2 example listings via a `seed.ts` script using the service-role client.

### Acceptance Criteria
- [ ] Manifest is valid (Chrome DevTools → Application → Manifest, no errors).
- [ ] App is installable on Chrome desktop and Android. iOS shows the right "Add to Home Screen" experience.
- [ ] Service worker caches static assets; offline shell renders for the home page.
- [ ] Lighthouse PWA score ≥ 90 on the deployed Vercel URL.
- [ ] README contains every step a new dev needs, top to bottom.
- [ ] Seed script runs idempotently and creates Ian as admin + 2 sample listings (one priced, one free).
- [ ] The deployed URL works on a real phone (sign up, browse, chat, rate).

---

## Phase 7 — Analytics dashboard

**Goal:** An admin can open `/admin/analytics` and see the key KPIs that answer "is this app being used and is the marketplace healthy?" — without any external tracking tool (no GA, no PostHog).

### Tasks
1. Add `last_active_at timestamptz` + index to `profiles` via Insforge MCP. Update the `Profile` TS type.
2. Update `src/middleware.ts` to PATCH `profiles.last_active_at` on every authenticated request, throttled to 1 write/hour per user.
3. Build `src/lib/metrics.ts` with `getMetrics(window)` exposing the KPI payload (adoption, engagement, marketplace, conversation, health). All queries use the service-role admin client.
4. Build `src/app/api/admin/metrics/route.ts` (GET, `?window=7d|30d|90d|all`) that verifies `is_admin` and returns the payload.
5. Build `src/app/(app)/admin/analytics/page.tsx` (Server Component): grid of stat cards grouped into 5 sections, window selector via search params.
6. Add an "Analytics" entry to `src/app/(app)/admin/page.tsx`.

### KPIs surfaced
- **Adoption**: lodge adoption % (approved / 40), new signups in window, pending approvals, approved users.
- **Engagement**: WAU (7d), MAU (30d), stickiness (WAU/MAU).
- **Marketplace**: live listings, new listings in window, sold in window, median time-to-sold, sell-through rate.
- **Conversation**: conversations started in window, % of listings with ≥1 conversation, avg messages per conversation.
- **Health**: open reports, median time-to-resolve.

### Acceptance Criteria
- [ ] `profiles.last_active_at` exists with an index; the column is in the `Profile` TS type.
- [ ] Browsing any authenticated page updates `last_active_at` (verify in DB after first hit; verify a second hit within 1h does **not** rewrite it).
- [ ] `/admin/analytics` is blocked for non-admin users (middleware redirect to `/`).
- [ ] `/admin/analytics?window=7d` and `?window=30d` produce different numbers when there is data in only one window (seed if needed).
- [ ] All 5 sections render with at least one populated stat card for a freshly seeded DB.
- [ ] At 360px viewport, the page does not horizontally scroll; cards are at least 2 per row.
- [ ] `GET /api/admin/metrics?window=30d` returns the same payload the page renders (single source of truth via `getMetrics`).
- [ ] No external analytics SDK is added to `package.json`.
- [ ] `last_active_at` writes remain throttled to at most once per hour per active user.

### Out of scope (do not build in this phase)
- Charts or time-series visualisations (numbers only in V1).
- Per-page or per-funnel tracking, session replay, error monitoring.
- Delta-vs-previous-period indicators.
- Caching layer for the metrics endpoint (40-user volume is trivial).

---

## Final hand-off

When all phases pass, deliver:

- The deployed Vercel URL.
- The Insforge dashboard URL (Ian needs to claim within 24h).
- The admin login credentials for Ian (force password reset on first login).
- The README.

Don't write a celebratory paragraph. A short bullet list with the URLs and credentials is enough.
