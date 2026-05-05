# CLAUDE.md — Lodge-Marketplace

You are working on **Lodge-Marketplace**, a private PWA marketplace for the ~40 students living in a student lodge. Read this file in full before doing anything else in this repo.

---

## Read these first, in this order

1. `lodge-marketplace-brief.md` — what we're building and for whom (the **what**).
2. `engineering-spec.md` — exact schema, RLS, libraries, file structure (the **how**).
3. `tasks.md` — phased build plan with Acceptance Criteria and Definition of Done. **This is your roadmap.** Work one phase at a time. Stop after each phase and ask the user to verify.
4. `.claude/skills/lodge-marketplace-ui/SKILL.md` — the UI design system. Apply on every visual change.

If any of these files are missing, **stop and tell the user** — do not improvise.

---

## How to work in this repo

### Workflow rules

- Work **one phase at a time** as defined in `tasks.md`.
- Before starting a phase, restate its goal and ACs in one sentence so the user can confirm.
- After finishing a phase, run the DoD checklist explicitly and report results before moving on.
- **Never skip ahead.** If you finish Phase 2 and Phase 4 looks easy, still stop and ask.
- If you discover a decision the spec doesn't cover, **ask** rather than guess. One question is cheaper than rework.
- If a spec rule and a user request conflict, surface the conflict — don't silently override either.

### Backend — use the Insforge MCP

All backend work goes through the **Insforge MCP**, never raw SQL files run by hand and never the Supabase CLI.

- Use the MCP to: create tables, define RLS, create storage buckets, create edge functions, deploy functions, run admin queries.
- If the MCP isn't connected (no `insforge` tools available), **stop** and tell the user to run `npx add-mcp https://mcp.insforge.dev/mcp` and `claude /mcp`.
- Before doing any non-trivial backend work, call the MCP's `fetch-docs` tool to ground yourself in the current Insforge API. Their SDK and conventions evolve.
- Never put the admin/service key into any `NEXT_PUBLIC_*` variable. Service-role calls happen only in Next.js Route Handlers under `src/app/api/admin/*` or in edge functions.

### Frontend — apply the UI skill

- The skill at `.claude/skills/lodge-marketplace-ui/SKILL.md` is **authoritative** for any UI work.
- Use shadcn/ui primitives. Don't modify them; theme via the CSS variables defined in the skill.
- Mobile-first: design for 360px, then enhance up.
- One accent color (dark red `#8B1A1A`). Used sparingly.
- No emojis in UI copy unless the user explicitly asks.

### Code conventions

- TypeScript `strict: true`. No `any` — use `unknown` and narrow.
- Server Components by default. `"use client"` only when you need state, refs, or browser APIs.
- Forms: `react-hook-form` + `zod`. Schemas live in `src/lib/schemas.ts`.
- Async server actions return `{ data, error }` tuples; toasts on the client handle errors.
- File naming: components `PascalCase.tsx`, pages/routes lowercase per Next conventions, hooks `use-camel-case.ts`, libs `kebab-case.ts`.
- Imports use the `@/` alias.
- No `axios`, no `moment`, no `react-icons`. Use `fetch`, `date-fns`, `lucide-react`.

---

## Hard rules (do not violate)

1. **Never bypass RLS by using the service-role client on routes the user can hit directly.** Service key is server-only and only for endpoints under `/api/admin/*` (which themselves verify `is_admin`).
2. **Never expose private profile fields** (`room_number`, admin-only fields) on public profile views.
3. **Never invent product features.** If `tasks.md` doesn't list it, ask before building it.
4. **Never paper over a failing AC.** If you can't satisfy an AC, stop, explain why, and propose options.
5. **Never commit secrets.** Verify `.env.local` is gitignored before any commit.
6. **English only.** No leftover Spanish/German strings in UI, errors, comments, or commit messages.
7. **No payments code.** Even scaffolding. Out of scope for V1.

---

## When stuck

If you're stuck, the order of escalation is:

1. Re-read the relevant section of `engineering-spec.md`.
2. Call the Insforge MCP `fetch-docs` for the relevant domain (auth, storage, realtime, etc.).
3. Ask the user a focused, single question. Don't dump three paragraphs of context — propose 2-3 options if possible.

---

## Reporting back

After each phase, give the user:

- One-paragraph summary of what changed.
- Checked DoD list with ✅/❌ per item.
- Any deviations from the spec, with reason.
- The exact thing they need to do next (e.g., "claim the project at <url>", "flip `is_approved` for user X", "test signup flow on mobile").

Keep the report short. The user will ask if they want more.
