# Lodge Marketplace

Private PWA marketplace for lodge residents.

## Stack

- Next.js 15 (App Router)
- Insforge (auth, database, storage)
- shadcn/ui + Tailwind CSS

## Setup

1. Clone the repo.
2. Copy `.env.local.example` to `.env.local` and fill in the values (get them from the Insforge dashboard at `https://insforge.dev`).
3. `npm install`
4. `npm run dev`

## Setting the first admin

After the first user signs up and you approve them, run this SQL via the Insforge dashboard **SQL editor**:

```sql
-- Replace the email with the admin user's email
update profiles
set is_admin = true, is_approved = true
where id = (select id from auth.users where email = 'your@email.com');
```

## Approving a user

```sql
update profiles set is_approved = true where id = '<user-uuid>';
```

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_INSFORGE_URL` | Insforge project URL (public) |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | Insforge anon key (public) |
| `INSFORGE_SERVICE_KEY` | Insforge admin/service key (private — server-only) |

## Deploy to Vercel

1. Push to GitHub.
2. Import repo in Vercel.
3. Add the three env vars above.
4. Deploy.
