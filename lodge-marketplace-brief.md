# Lodge-Marketplace — Product Brief

> A private, lightweight PWA marketplace for the ~40 students living in the lodge.
> Buy, sell, and gift items between residents — moderated, safe, free.

---

## 1. Problem

Residents stay in the lodge for **6–24 months**. They arrive needing furniture, kitchenware, lamps, bedding, study gear; they leave needing to offload all of it. Today these exchanges happen via WhatsApp groups, paper notes, or luck — items get thrown away, money is wasted, new arrivals start from scratch.

**Goal:** make it dead simple for any resident to list, find, claim, and chat about items inside the building.

---

## 2. Users & roles

| Role | What they can do |
|---|---|
| **Resident** | Browse, list, edit, delete own items. Chat 1:1. Rate other residents after a chat. Block users. Report. |
| **Admin (Ian)** | Approve new users. Approve every listing before it goes live. Delete users / listings. Resolve reports. |
| **Visitor** (with invite link) | Cannot see anything until signed up and admin-approved. |

---

## 3. Scope — V1

### In scope
- Invite-link signup + admin approval
- Email/password auth (Insforge native)
- Profiles (create, edit, delete)
- Listings: photos (1–5), title, description, category, condition, price OR "free/gift" toggle
- Listings CRUD with status flow: `draft → pending → live → sold/archived`
- Admin moderation queue (every new/edited listing reviewed before going live)
- Realtime 1:1 chat (Insforge Realtime)
- 1–5 star ratings + optional comment, only after a chat exists
- Block user
- Report user / listing / conversation
- PWA (installable, offline shell)
- English only
- Mobile-first

### Out of scope (V1)
- In-app payments
- Phone / SMS verification
- Shipping / logistics (handover happens in person)
- Public discovery / SEO
- Multi-language
- Events
- Group chats
- Push notifications

### Phase 2 (future)
- Resident-proposed events
- Multi-language
- Web push notifications
- Phone verification if abuse becomes a problem

---

## 4. Feature spec

### 4.1 Onboarding & access
1. Admin shares a single invite link (rotatable).
2. User signs up: email + password + display name.
3. Account starts in `pending_approval` — no access to listings yet.
4. Admin approves the user from the admin panel → full access.
5. Admin can delete any user at any time (soft-delete, listings/chats anonymized).

### 4.2 Profile
- Fields: display name, avatar (optional), short bio (optional), `is_admin`, `is_approved`.
- Public profile shows: name, avatar, average rating, total listings, "member since".
- User can edit any field, or delete their own account.

### 4.3 Listings
- Fields: `title`, `description`, `photos[1..5]`, `price_eur` (nullable) OR `is_gift` (bool), `category` (Furniture · Kitchen · Electronics · Books · Clothes · Other), `condition` (New · Like new · Used · Worn).
- Status flow: `draft → pending → live → sold | archived`.
- Owner can edit / delete anytime.
- Editing price, photos, or title on a `live` listing → re-enters `pending`.
- Feed sorted by newest first; filter by category and "free only".

### 4.4 Admin moderation queue
- Route: `/admin`, gated by `is_admin` flag.
- Tabs: Pending users · Pending listings · Reports · All users · All listings.
- Each pending listing shows full preview + Approve / Reject (with optional reason).
- Admin gets an email on every new submission (Insforge edge function + SMTP).

### 4.5 Realtime chat
- Strictly 1:1, private. Started from a listing detail page ("Message seller").
- Implemented with Insforge Realtime subscription on the `messages` table.
- Each chat = one `conversation` row tied to a listing + 2 users.
- Read receipts + unread badge in the nav.
- "Report this conversation" button.

### 4.6 Ratings
- 1–5 stars + optional comment (max 280 chars).
- Available **only after at least one message has been exchanged** between the two users.
- Public on the rated user's profile, with rater's name shown.
- One rating per `(rater, ratee, listing)` tuple — editable for 7 days, then locked.

### 4.7 Block
- From any profile or chat: "Block user".
- Blocked users cannot see each other's profile, listings, or chats. Existing chats are hidden on both sides.
- Unblock from Settings.

---

## 5. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript | PWA via manifest + service worker |
| UI | shadcn/ui + Tailwind CSS | Mobile-first |
| Backend | Insforge | Postgres + Auth + Storage + Realtime + Edge Functions |
| Auth | Insforge email/password | + admin approval gate |
| Storage | Insforge Storage | Bucket `listing-photos`, public read, auth write |
| Realtime | Insforge Realtime | Subscriptions on `messages` |
| Hosting | Vercel | Free tier handles ~40 users |
| Email | Insforge SMTP | Admin notifications, password reset |

### Brand & UI
- **Palette:** white `#FFFFFF`, black `#0A0A0A`, dark red `#8B1A1A` (accents/CTAs only).
- **Aesthetic:** clean, modern, mobile-first. Generous whitespace. One accent color used sparingly. Subtle rounded corners, no decorative gradients.
- A dedicated **`lodge-marketplace-ui` skill** is included as a separate file — Claude Code must load it before writing any UI component.

---

## 6. Data model

| Table | Key fields |
|---|---|
| `profiles` | `id (= auth.users.id)`, display_name, avatar_url, bio, is_admin, is_approved, deleted_at, created_at |
| `listings` | id, owner_id, title, description, price_eur (nullable), is_gift, category, condition, status, rejection_reason, created_at, updated_at |
| `listing_photos` | id, listing_id, storage_path, sort_order |
| `conversations` | id, listing_id, buyer_id, seller_id, last_message_at, created_at |
| `messages` | id, conversation_id, sender_id, body, read_at, created_at |
| `ratings` | id, rater_id, ratee_id, listing_id, stars, comment, created_at, edit_locked_at |
| `blocks` | blocker_id, blocked_id, created_at |
| `reports` | id, reporter_id, target_type, target_id, reason, status, created_at |

All tables use row-level security. Admin role bypasses RLS via service-role calls in protected edge functions.

---

## 7. Core user flows

### Signing up
1. Open invite link → land on signup page.
2. Enter email, password, display name → submit.
3. See "Waiting for admin approval" screen.
4. Admin approves → user can log in and use the app.

### Selling
1. Tap "+ New listing" → upload photos, fill title, price (or toggle "Free"), category, condition.
2. Submit → status `pending`.
3. Admin approves → status `live` → appears in feed.
4. Buyer messages → seller replies → arrange handover in person.
5. Seller marks `sold` → both can rate each other.

### Buying
1. Browse feed (newest first) or filter by category / free-only.
2. Open listing → photos, description, seller profile + rating.
3. Tap "Message" → realtime chat.
4. Agree, meet in the building, exchange item.
5. Rate the seller.

---

## 8. Non-functional requirements

- **Mobile-first PWA:** installable on iOS & Android. Offline shell. Manifest + service worker. Lighthouse PWA score ≥ 90.
- **Performance:** image upload max 5 MB/photo, auto-compressed client-side before upload. Feed initial load < 2s on 4G.
- **Security:** RLS on all tables. Admin actions via edge functions only. Rate-limit messages (max 30/min per user).
- **Privacy:** soft-delete users (data anonymized, not purged immediately). One user-facing "Delete my account" button. GDPR-friendly.
- **Accessibility:** keyboard-navigable, semantic HTML, sufficient contrast, alt text on listing photos.
- **No analytics/trackers in V1.** Just basic server logs.

---

## 9. Out-of-app conventions

- Handover happens in person inside the building.
- Payment happens in person (cash, Revolut, PayPal — between residents, not via app).
- Disputes go to admin (Ian) via report button or in-person.

---

## 10. Success metrics (informal)

- ≥ 50% of residents register within first month.
- ≥ 20 listings live in first month.
- ≥ 5 successful handovers ( = listing marked `sold` + both parties rated each other) per month.
- Zero abuse reports unresolved > 24h.

---

## 11. Deliverables for Claude Code

1. Insforge project provisioned via `npx @insforge/cli` (use the `nextjs` template).
2. All tables + RLS policies + storage bucket created.
3. Edge function for admin email notifications on new pending listings.
4. Full Next.js app implementing every feature in §4.
5. PWA manifest + service worker.
6. Seed script with 1 admin user (Ian) + 2 example listings.
7. README with: how to run locally, how to claim the Insforge project, how to set Ian as admin.
8. The `lodge-marketplace-ui` skill applied throughout the UI.
