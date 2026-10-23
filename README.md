# Lodge Marketplace

Private PWA marketplace for the ~40 students living in a student lodge. Residents can post listings, chat with each other, and rate one another.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Backend / DB / Auth | [Insforge](https://insforge.dev) |
| UI | shadcn/ui + Tailwind CSS |
| Forms | react-hook-form + Zod |
| Realtime | Insforge Realtime |
| Package manager | pnpm |
| Deploy | Vercel |

## Local setup

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)

### 1. Clone and install

```bash
git clone https://github.com/your-org/lodge-marketplace.git
cd lodge-marketplace
pnpm install
```

### 2. Environment variables

Copy the example file and fill in your Insforge project credentials:

```bash
cp .env.local.example .env.local
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_INSFORGE_URL` | Insforge dashboard → Project Settings → API |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | Insforge dashboard → API (anon/public key) |
| `INSFORGE_SERVICE_KEY` | Insforge dashboard → API (service key — keep secret) |

### 3. Run dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Claiming the Insforge project

If you received a `claimUrl` from the initial setup, claim the project within 24 hours:

1. Open the `claimUrl` in your browser.
2. Sign in or create an Insforge account.
3. The project is now permanently linked to your account.

---

## Setting the first admin

The admin UI (`/admin`) requires `is_admin = true` in the `profiles` table.

**Via Insforge dashboard SQL editor:**

```sql
-- Replace with the admin user's email
UPDATE profiles
SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
```

**Via Table Editor:** Database → Table Editor → `profiles` → find your row → set `is_admin = true`.

---

## New user access

New profiles are active immediately after signup. There is no manual administrator approval step.

---

## Deploying to Vercel

### Option A — Vercel dashboard (recommended)

1. Push to GitHub.
2. Import the repo at [vercel.com/new](https://vercel.com/new).
3. Add the three environment variables in Settings → Environment Variables.
4. Deploy. Vercel auto-detects `pnpm-lock.yaml` and uses pnpm.

### Option B — Vercel CLI

```bash
pnpm add -g vercel
vercel                    # first deploy / link
vercel env add NEXT_PUBLIC_INSFORGE_URL
vercel env add NEXT_PUBLIC_INSFORGE_ANON_KEY
vercel env add INSFORGE_SERVICE_KEY   # mark as Sensitive
vercel --prod             # production deploy
```

---

## Backups & data export

All application data lives in two places:

- **PostgreSQL tables** (via Insforge): `profiles`, `listings`, `listing_photos`, `conversations`, `messages`, `ratings`, `reports`, `blocks`
- **Storage buckets** (via Insforge): `listing-photos`, `avatars`

### Recommended cadence

Monthly manual export is sufficient for ~40 residents. Do it before any major schema change or platform migration.

### Exporting database tables

**Option A — Insforge dashboard (easiest)**

1. Open [your Insforge project dashboard](https://app.insforge.dev).
2. Go to **Database → Table Editor**.
3. Select a table → click **Export CSV**.
4. Repeat for each table above.

**Option B — SQL dump via Insforge MCP (more complete)**

In a Claude session with the Insforge MCP connected, run a `run-raw-sql` call for each table you want to back up. Example for `profiles`:

```
mcp: run-raw-sql
query: SELECT * FROM profiles
```

Copy the JSON result to a local file.

### Exporting storage files

1. Open **Storage** in the Insforge dashboard.
2. Browse each bucket (`listing-photos`, `avatars`).
3. Select all files → Download.

### Where to store exports

Save dumps to a local folder **outside** this repository, e.g.:

```
~/Documents/lodge-backups/YYYY-MM-DD/
  profiles.csv
  listings.csv
  ... (one file per table)
  listing-photos/   (downloaded bucket contents)
  avatars/
```

Never commit exports — they contain PII (names, email addresses, room numbers).

### Restore

Restoring from a CSV export: **Database → Table Editor → Import CSV** in the Insforge dashboard, or use `run-raw-sql` with `INSERT` statements. Restore storage files by re-uploading to the relevant bucket via the dashboard.

> **Privacy note:** Exports fall under the app's privacy policy. Only the admin (Ian) should handle them.

---

## Seeding the database

Creates Ian as admin + 2 sample listings. Safe to run multiple times (idempotent).

```bash
pnpm tsx scripts/seed.ts
```

Requires `INSFORGE_SERVICE_KEY` and `NEXT_PUBLIC_INSFORGE_URL` in `.env.local`.

---

## Push notifications setup

Push notifications require three additional environment variables. Generate VAPID keys once, then paste them into Vercel and `.env.local`.

```bash
npx web-push generate-vapid-keys
```

| Variable | Value | Where |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public key output above | Vercel + `.env.local` |
| `VAPID_PRIVATE_KEY` | Private key output above | Vercel only (mark Sensitive) |
| `VAPID_SUBJECT` | `mailto:your@email.com` | Vercel + `.env.local` |

> **Security:** `VAPID_PRIVATE_KEY` must never be added as a `NEXT_PUBLIC_*` variable. Keep it server-side only.

### iOS limitation

Web Push on iOS requires the PWA to be **installed** (Add to Home Screen) and iOS 16.4+. The permission banner automatically detects this and shows instructions instead when running in Safari without install.

### Testing

Because the service worker only registers in production (`NODE_ENV === 'production'`), test push on a Vercel preview deployment, not on `pnpm dev`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Missing env vars | Copy `.env.local.example` → `.env.local` and fill all three values |
| `/admin` redirects to `/` | `is_admin = false` on your profile — set via DB |
| Realtime messages not arriving | Verify Insforge plan supports Realtime; check `NEXT_PUBLIC_INSFORGE_URL` |
| `pnpm install` warns about build scripts | Run `pnpm approve-builds --all` (approves `sharp` + `unrs-resolver`) |
