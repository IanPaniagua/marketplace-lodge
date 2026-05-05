# Lodge-Marketplace — Engineering Spec

> Companion to `lodge-marketplace-brief.md`. The brief defines **what** to build.
> This document defines **how** — exact schema, RLS, libraries, file structure,
> and pre-resolved technical decisions so Claude Code doesn't improvise.

---

## 1. Repository structure

```
lodge-marketplace/
├── CLAUDE.md                          # Permanent project instructions
├── README.md                          # How to run, deploy, claim Insforge
├── lodge-marketplace-brief.md         # Product brief
├── engineering-spec.md                # This file
├── tasks.md                           # Phased task list with AC/DoD
├── .mcp.json                          # Insforge MCP (created by add-mcp)
├── .env.local                         # Public anon key, project URL
├── .env.local.example
├── .claude/
│   └── skills/
│       └── lodge-marketplace-ui/
│           └── SKILL.md               # UI design system
├── public/
│   ├── manifest.json
│   ├── sw.js                          # Service worker
│   └── icons/                         # PWA icons
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── signup/page.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── pending/page.tsx        # "Waiting for approval"
│   │   ├── (app)/
│   │   │   ├── layout.tsx              # TopBar + BottomNav shell
│   │   │   ├── page.tsx                # Feed
│   │   │   ├── listings/
│   │   │   │   ├── new/page.tsx
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   └── [id]/edit/page.tsx
│   │   │   ├── chats/
│   │   │   │   ├── page.tsx            # Conversation list
│   │   │   │   └── [id]/page.tsx       # Chat view
│   │   │   ├── profile/
│   │   │   │   ├── page.tsx            # Own profile
│   │   │   │   ├── [id]/page.tsx       # Other user's profile
│   │   │   │   └── settings/page.tsx
│   │   │   └── admin/
│   │   │       ├── page.tsx
│   │   │       ├── users/page.tsx
│   │   │       ├── listings/page.tsx
│   │   │       └── reports/page.tsx
│   │   ├── api/                        # Route handlers (admin actions)
│   │   ├── layout.tsx                  # Root layout
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                         # shadcn primitives
│   │   ├── listing/
│   │   ├── chat/
│   │   ├── profile/
│   │   └── shared/
│   ├── lib/
│   │   ├── insforge.ts                 # Client SDK init
│   │   ├── insforge-server.ts          # Server-side admin client
│   │   ├── auth.ts                     # Session helpers
│   │   ├── schemas.ts                  # Zod schemas
│   │   ├── image.ts                    # Client-side compression
│   │   └── utils.ts                    # cn(), formatters
│   ├── hooks/
│   │   ├── use-session.ts
│   │   ├── use-realtime-messages.ts
│   │   └── use-toast.ts
│   └── types/
│       └── db.ts                       # Generated DB types
├── supabase-style-migrations/          # SQL migrations applied via MCP
│   ├── 001_schema.sql
│   ├── 002_rls.sql
│   └── 003_seed.sql
└── insforge-functions/
    └── notify-admin-new-listing/
        └── index.ts                    # Edge function
```

---

## 2. Library choices (locked in)

| Concern | Library | Notes |
|---|---|---|
| Framework | `next@^15` (App Router) | Server Components default, "use client" where needed |
| Lang | `typescript@^5` | `strict: true` |
| Styling | `tailwindcss@^3` | + `tailwindcss-animate` for shadcn |
| UI | `shadcn/ui` | Components added on demand, never modified |
| Forms | `react-hook-form` + `zod` + `@hookform/resolvers` | shadcn's `Form` wrapper |
| Icons | `lucide-react` | Only this icon library |
| Backend SDK | `@insforge/sdk` | Always check via MCP `fetch-docs` for current API |
| Realtime | Insforge SDK realtime channels | No extra library |
| Image compression | `browser-image-compression` | Client-side before upload |
| Toasts | `sonner` (via shadcn) | Top-right, 3s default |
| Date formatting | `date-fns` | `formatDistanceToNow` for chat timestamps |
| PWA | Manual `manifest.json` + `sw.js` (Workbox-free) | Avoid `next-pwa` — fragile with App Router |
| Lint | ESLint Next defaults + `@typescript-eslint` | |
| Format | Prettier with Tailwind plugin | |

**Forbidden:** `@supabase/*` (we use Insforge), `axios` (use `fetch`), `moment` (use `date-fns`), `react-icons` (use `lucide-react`).

---

## 3. Database schema

Run via Insforge MCP. All tables in the `public` schema unless noted. Every table has `created_at timestamptz default now()`.

```sql
-- 3.1 profiles -------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  avatar_url text,
  bio text check (char_length(bio) <= 200),
  room_number text check (char_length(room_number) <= 10),
  is_admin boolean not null default false,
  is_approved boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index profiles_is_approved_idx on profiles(is_approved) where deleted_at is null;

-- 3.2 listings -------------------------------------------------------------
create type listing_status as enum ('draft','pending','live','sold','archived');
create type listing_category as enum ('furniture','kitchen','electronics','books','clothes','other');
create type listing_condition as enum ('new','like_new','used','worn');

create table listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  description text not null check (char_length(description) between 10 and 2000),
  price_eur numeric(10,2) check (price_eur is null or price_eur >= 0),
  is_gift boolean not null default false,
  category listing_category not null,
  condition listing_condition not null,
  status listing_status not null default 'pending',
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint price_or_gift check (
    (is_gift = true and price_eur is null) or
    (is_gift = false and price_eur is not null)
  )
);
create index listings_status_created_idx on listings(status, created_at desc);
create index listings_owner_idx on listings(owner_id);

-- 3.3 listing_photos ------------------------------------------------------
create table listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index listing_photos_listing_idx on listing_photos(listing_id, sort_order);

-- 3.4 conversations -------------------------------------------------------
create table conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  buyer_id uuid not null references profiles(id) on delete cascade,
  seller_id uuid not null references profiles(id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id),                  -- one chat per (listing, buyer)
  check (buyer_id <> seller_id)
);
create index conversations_buyer_idx on conversations(buyer_id, last_message_at desc);
create index conversations_seller_idx on conversations(seller_id, last_message_at desc);

-- 3.5 messages ------------------------------------------------------------
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on messages(conversation_id, created_at);

-- 3.6 ratings -------------------------------------------------------------
create table ratings (
  id uuid primary key default gen_random_uuid(),
  rater_id uuid not null references profiles(id) on delete cascade,
  ratee_id uuid not null references profiles(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text check (char_length(comment) <= 280),
  created_at timestamptz not null default now(),
  edit_locked_at timestamptz not null default (now() + interval '7 days'),
  unique (rater_id, ratee_id, listing_id),
  check (rater_id <> ratee_id)
);
create index ratings_ratee_idx on ratings(ratee_id, created_at desc);

-- 3.7 blocks --------------------------------------------------------------
create table blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- 3.8 reports -------------------------------------------------------------
create type report_target_type as enum ('user','listing','conversation');
create type report_status as enum ('open','resolved','dismissed');

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_type report_target_type not null,
  target_id uuid not null,
  reason text not null check (char_length(reason) between 5 and 1000),
  status report_status not null default 'open',
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- 3.9 trigger to update conversation last_message_at ----------------------
create or replace function bump_conversation_last_message()
returns trigger as $$
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

create trigger messages_bump_conv
after insert on messages
for each row execute function bump_conversation_last_message();
```

---

## 4. Row-Level Security (RLS)

Enable RLS on **every** table. Below are the canonical policies.

```sql
-- Helpers
create or replace function is_admin() returns boolean
language sql stable as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

create or replace function is_approved() returns boolean
language sql stable as $$
  select coalesce(
    (select is_approved and deleted_at is null from profiles where id = auth.uid()),
    false
  );
$$;

create or replace function is_blocked_by(target uuid) returns boolean
language sql stable as $$
  select exists(
    select 1 from blocks
    where (blocker_id = target and blocked_id = auth.uid())
       or (blocker_id = auth.uid() and blocked_id = target)
  );
$$;
```

### profiles
```sql
alter table profiles enable row level security;

-- Read: any approved user can read approved profiles, hiding blocked ones.
-- Admin reads everyone.
create policy profiles_select on profiles for select using (
  is_admin()
  or (
    is_approved()
    and deleted_at is null
    and (id = auth.uid() or (is_approved and not is_blocked_by(id)))
  )
);

-- Insert: a new auth user inserts their own profile row, default not approved.
create policy profiles_insert on profiles for insert with check (
  id = auth.uid() and is_admin = false and is_approved = false
);

-- Update: own profile only. is_admin & is_approved are not user-writable
-- (enforce in app via column-level check or via edge function for admin actions).
create policy profiles_update on profiles for update using (id = auth.uid())
  with check (id = auth.uid());
```

### listings
```sql
alter table listings enable row level security;

-- Public read: only 'live' or 'sold' listings, owner not blocked, owner not deleted.
-- Owner reads all of their own (any status).
-- Admin reads all.
create policy listings_select on listings for select using (
  is_admin()
  or owner_id = auth.uid()
  or (
    is_approved()
    and status in ('live','sold')
    and not is_blocked_by(owner_id)
    and exists (select 1 from profiles p where p.id = owner_id and p.deleted_at is null)
  )
);

create policy listings_insert on listings for insert with check (
  is_approved() and owner_id = auth.uid() and status in ('draft','pending')
);

create policy listings_update_own on listings for update using (
  owner_id = auth.uid() and is_approved()
) with check (owner_id = auth.uid());

create policy listings_delete_own on listings for delete using (
  owner_id = auth.uid() or is_admin()
);
```

### listing_photos
Same access pattern as the parent listing — readable when the listing is readable.
```sql
alter table listing_photos enable row level security;

create policy listing_photos_select on listing_photos for select using (
  exists (select 1 from listings l where l.id = listing_id) -- relies on listings RLS
);
create policy listing_photos_insert on listing_photos for insert with check (
  exists (select 1 from listings l where l.id = listing_id and l.owner_id = auth.uid())
);
create policy listing_photos_delete on listing_photos for delete using (
  exists (select 1 from listings l where l.id = listing_id and l.owner_id = auth.uid())
  or is_admin()
);
```

### conversations
```sql
alter table conversations enable row level security;

create policy conversations_select on conversations for select using (
  is_admin()
  or (
    (auth.uid() in (buyer_id, seller_id))
    and not is_blocked_by(case when buyer_id = auth.uid() then seller_id else buyer_id end)
  )
);
create policy conversations_insert on conversations for insert with check (
  is_approved()
  and buyer_id = auth.uid()
  and not is_blocked_by(seller_id)
);
```

### messages
```sql
alter table messages enable row level security;

create policy messages_select on messages for select using (
  exists (
    select 1 from conversations c
    where c.id = conversation_id
      and (auth.uid() in (c.buyer_id, c.seller_id) or is_admin())
  )
);
create policy messages_insert on messages for insert with check (
  is_approved()
  and sender_id = auth.uid()
  and exists (
    select 1 from conversations c
    where c.id = conversation_id
      and auth.uid() in (c.buyer_id, c.seller_id)
      and not is_blocked_by(case when c.buyer_id = auth.uid() then c.seller_id else c.buyer_id end)
  )
);
-- Update only allowed for marking read_at
create policy messages_update_read on messages for update using (
  exists (
    select 1 from conversations c
    where c.id = conversation_id
      and auth.uid() in (c.buyer_id, c.seller_id)
      and sender_id <> auth.uid()
  )
);
```

### ratings
```sql
alter table ratings enable row level security;

create policy ratings_select on ratings for select using (
  is_approved() and not is_blocked_by(ratee_id) and not is_blocked_by(rater_id)
);
create policy ratings_insert on ratings for insert with check (
  is_approved()
  and rater_id = auth.uid()
  and exists (                                  -- a chat must exist between them about this listing
    select 1 from conversations c
    join messages m on m.conversation_id = c.id
    where c.listing_id = ratings.listing_id
      and auth.uid() in (c.buyer_id, c.seller_id)
      and ratee_id in (c.buyer_id, c.seller_id)
  )
);
create policy ratings_update_own on ratings for update using (
  rater_id = auth.uid() and now() < edit_locked_at
);
```

### blocks
```sql
alter table blocks enable row level security;
create policy blocks_select_own on blocks for select using (blocker_id = auth.uid());
create policy blocks_insert_own on blocks for insert with check (blocker_id = auth.uid());
create policy blocks_delete_own on blocks for delete using (blocker_id = auth.uid());
```

### reports
```sql
alter table reports enable row level security;
create policy reports_select on reports for select using (
  is_admin() or reporter_id = auth.uid()
);
create policy reports_insert on reports for insert with check (
  is_approved() and reporter_id = auth.uid()
);
create policy reports_update_admin on reports for update using (is_admin());
```

---

## 5. Privileged actions (server-only)

These need the **service-role key** (admin) and live in Next.js Route Handlers (`src/app/api/admin/*`) or edge functions. Never call from the client.

| Action | Where | Why server-only |
|---|---|---|
| Approve user (`is_approved = true`) | `POST /api/admin/users/[id]/approve` | RLS forbids users updating their own `is_approved` |
| Set/unset admin | `POST /api/admin/users/[id]/admin` | Same |
| Soft-delete user | `POST /api/admin/users/[id]/delete` | Anonymizes profile, cascades |
| Approve listing (`status = 'live'`) | `POST /api/admin/listings/[id]/approve` | Status transitions need validation |
| Reject listing | `POST /api/admin/listings/[id]/reject` | Stores `rejection_reason` |
| Resolve report | `POST /api/admin/reports/[id]/resolve` | |
| Send email on new listing | Insforge edge function `notify-admin-new-listing` | Triggered on insert via DB trigger or app |

All admin routes verify the caller's `is_admin` via the user's session **before** using the service-role client.

---

## 6. Storage

One bucket: `listing-photos`.

- **Public read** (so listings render fast without signed URLs).
- **Authenticated write** with policy: only the listing's owner can upload to paths matching `listings/{listing_id}/...`.
- Path convention: `listings/{listing_id}/{uuid}.webp`.
- Client compresses to WebP, max 1280×1280, quality 0.82, target ≤ 300 KB before upload.

---

## 7. Realtime

Subscribe in the chat page to inserts on `messages` filtered by `conversation_id = X`. Use Insforge SDK's realtime channel. Unsubscribe on unmount.

For the unread badge in `BottomNav`, subscribe to all `messages` where `conversation_id` is in the user's conversations and `sender_id != auth.uid()`. Count unread (`read_at is null`) client-side.

---

## 8. PWA

- `public/manifest.json` with `name`, `short_name: "Lodge"`, `theme_color: "#0A0A0A"`, `background_color: "#FFFFFF"`, `display: "standalone"`, `start_url: "/"`, icons 192/512/maskable.
- `public/sw.js`: cache-first for `/icons/*` and `/_next/static/*`, network-first for all else. No fancy offline mutations.
- Register SW only in production.
- Lighthouse PWA score must be ≥ 90.

---

## 9. Auth flow details

1. **Signup** (`POST` via Insforge SDK): create auth user → in same flow, create `profiles` row with `is_approved = false`. Both client-side, in sequence; rollback profile insert error to user with retry.
2. **Login**: standard Insforge email/password. Middleware checks `is_approved` and redirects to `/pending` if false.
3. **Middleware** (`src/middleware.ts`): runs on every `(app)` route, validates session via Insforge SDK, fetches `profiles` row, gates by `is_approved` and `deleted_at is null`.
4. **Admin gate**: separate middleware check on `/admin/*` for `is_admin = true`.

---

## 10. Edge function: `notify-admin-new-listing`

Triggered by the app after a successful insert into `listings` (call from server-side route handler post-insert, **not** from a DB trigger — keeps the function code small and avoids replication issues).

```
input:  { listing_id: string }
output: { sent: boolean }
work:   - fetch listing + owner profile
        - fetch all admin emails (profiles.is_admin = true)
        - send via Insforge SMTP: subject "New listing pending review: <title>"
                                  link to /admin/listings?id=<id>
```

---

## 11. Validation schemas (zod)

Centralize in `src/lib/schemas.ts`. Examples:

```ts
export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  display_name: z.string().min(2).max(40),
});

export const ListingSchema = z.object({
  title: z.string().min(3).max(80),
  description: z.string().min(10).max(2000),
  category: z.enum(['furniture','kitchen','electronics','books','clothes','other']),
  condition: z.enum(['new','like_new','used','worn']),
  is_gift: z.boolean(),
  price_eur: z.number().nonnegative().nullable(),
  photos: z.array(z.instanceof(File)).min(1).max(5),
}).refine(d => d.is_gift ? d.price_eur === null : d.price_eur !== null, {
  message: 'Set a price or mark as gift',
});

export const MessageSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const RatingSchema = z.object({
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(280).optional(),
});
```

---

## 12. Rate limits (in-app)

Implement on the server using a simple in-memory token bucket per user (acceptable for ~40 users):

- Messages: 30 / min / user.
- Listing creation: 10 / day / user.
- Reports: 5 / day / user.

If the lodge grows past 200 users, swap for Insforge edge function + DB-backed counter.

---

## 13. Conventions

- **Naming:** files `kebab-case.tsx`, components `PascalCase`, hooks `useCamelCase`.
- **Imports:** absolute via `@/` alias.
- **Server vs client components:** default to server. Add `"use client"` only when needed (forms, realtime, hooks).
- **Errors:** all server actions return `{ data, error }` tuples; client toasts on error.
- **Loading:** every async UI uses skeletons from `components/ui/skeleton`.
- **Env vars:** `NEXT_PUBLIC_INSFORGE_URL`, `NEXT_PUBLIC_INSFORGE_ANON_KEY`. Service-role key is server-only as `INSFORGE_SERVICE_KEY`.

---

## 14. Out of scope for this spec
- CI/CD pipeline (manual `vercel deploy` is fine).
- Automated end-to-end tests (manual smoke test against the AC checklist in `tasks.md`).
- Internationalization (English only).
- Native mobile builds.
