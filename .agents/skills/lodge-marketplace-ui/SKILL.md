---
name: lodge-marketplace-ui
description: >
  Design system for the Lodge-Marketplace PWA. Use this skill whenever creating
  ANY UI for the app — pages, components, modals, forms, listing cards, chat
  bubbles, profile screens, admin views. Triggers on any frontend work in the
  lodge-marketplace project: "build a page", "create a component", "style this",
  "make a screen", or any shadcn/ui or Tailwind work in the repo. Defines the
  blue-to-cyan brand palette, modern mobile-first layout rules,
  typography, spacing scale, component patterns, and shadcn customizations.
  Always load and apply this skill — never default to generic shadcn defaults.
---

# Lodge-Marketplace UI System

A modern, clean, mobile-first design system for a private resident marketplace.
The aesthetic is **fresh, calm, and approachable**: pale blue surfaces and white
space do the heavy lifting, dark navy handles structure, and the blue-to-cyan
gradient identifies primary actions and brand moments.

Apply every rule here without exception across the whole frontend.

> **Palette lock:** The blue/cyan system below is the product's source of truth.
> Feature work must preserve it. Never replace the palette, logo treatment, or
> component style as a side effect of implementing an unrelated feature. A palette
> change requires an explicit user request.

---

## 1. Design principles

1. **Mobile-first, always.** Design for a 360px viewport first. Desktop is just a wider version of the mobile layout.
2. **One brand gradient.** Use the blue-to-cyan gradient for the logo and primary CTAs. Use solid blue for focus, links, prices, and selected states. Do not introduce a competing brand color.
3. **Whitespace is a feature.** Generous padding, never cramped. Default to more space, not less.
4. **Soft modern, not brutalist.** Subtle rounded corners (`rounded-lg`, never `rounded-full` for cards). No hard offset shadows. No newspaper-grid borders.
5. **Content over chrome.** Listing photos and user content are the stars — frames around them are quiet.
6. **Predictable.** Same component looks the same everywhere. No bespoke one-off designs.

---

## 2. Color tokens

### CSS variables (drop into `app/globals.css`)

```css
@layer base {
  :root {
    /* Brand */
    --background: 214 32% 98%;          /* pale blue-gray */
    --foreground: 222 47% 11%;          /* dark navy */
    --primary: 221 83% 53%;             /* brand blue */
    --primary-foreground: 0 0% 100%;
    --brand-start: 221 83% 53%;         /* blue */
    --brand-end: 190 90% 45%;           /* cyan */

    /* Surfaces */
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --muted: 214 32% 95%;
    --muted-foreground: 215 16% 47%;
    --border: 214 25% 89%;
    --input: 214 25% 86%;

    /* Semantic */
    --destructive: 0 72% 51%;           /* destructive actions only */
    --destructive-foreground: 0 0% 100%;
    --ring: 221 83% 53%;

    /* Other shadcn slots */
    --secondary: 214 32% 95%;
    --secondary-foreground: 222 47% 11%;
    --accent: 214 100% 96%;
    --accent-foreground: 221 83% 40%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 4%;

    --radius: 0.75rem;
  }

  .dark {
    --background: 0 0% 7%;              /* #121212 */
    --foreground: 0 0% 98%;
    --primary: 217 91% 60%;
    --primary-foreground: 0 0% 100%;
    --brand-start: 217 91% 60%;
    --brand-end: 188 86% 53%;
    --card: 0 0% 9%;
    --card-foreground: 0 0% 98%;
    --muted: 0 0% 14%;
    --muted-foreground: 0 0% 65%;
    --border: 0 0% 18%;
    --input: 0 0% 18%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;
    --ring: 217 91% 60%;
    --secondary: 0 0% 14%;
    --secondary-foreground: 0 0% 98%;
    --accent: 0 0% 14%;
    --accent-foreground: 0 0% 98%;
    --popover: 0 0% 9%;
    --popover-foreground: 0 0% 98%;
  }
}
```

### Usage rules

| Slot | Use for |
|---|---|
| `bg-background` / `text-foreground` | Default page surface and text |
| `bg-card` + `border` | Cards, panels, listing tiles |
| `bg-muted` / `text-muted-foreground` | Secondary surfaces, placeholder text, captions |
| `brand-gradient` / `brand-gradient-text` | Primary CTAs and the Lodge Market wordmark |
| `bg-primary` / `text-primary` | Prices, links, active tab indicator, focus, "FREE" badge background |
| `border-primary` | Selected / focused state on key elements only |
| `bg-destructive` | Genuinely destructive actions only: Delete account, Block, Reject listing |

**Never** use red as a brand or primary action color. Red is reserved for destructive actions and error states.

### Brand utilities

Keep these utilities in `app/globals.css`; do not replace them with a solid color:

```css
@layer components {
  .brand-gradient {
    background-image: linear-gradient(135deg, hsl(var(--brand-start)), hsl(var(--brand-end)));
  }

  .brand-gradient-text {
    background-image: linear-gradient(135deg, hsl(var(--brand-start)), hsl(var(--brand-end)));
    background-clip: text;
    color: transparent;
    -webkit-background-clip: text;
  }
}
```

---

## 3. Typography

Use system fonts via Tailwind defaults — no custom fonts, no Georgia. Modern sans-serif throughout.

```ts
// tailwind.config.ts
fontFamily: {
  sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
  mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
},
```

### Scale

| Class | Use case |
|---|---|
| `text-3xl font-semibold tracking-tight` | Page H1 (mobile: `text-2xl`) |
| `text-xl font-semibold tracking-tight` | Section H2, modal title |
| `text-lg font-medium` | Card title, listing title |
| `text-base` | Body text, descriptions |
| `text-sm text-muted-foreground` | Captions, metadata, timestamps |
| `text-xs uppercase tracking-wider font-medium text-muted-foreground` | Labels above fields, category tags |
| `text-2xl font-bold text-primary tabular-nums` | Price display |

**Rules**

- Headings always `tracking-tight` and `font-semibold` (never `font-bold` for headings — too heavy).
- Body text never below `text-sm`.
- Use `tabular-nums` for any number that updates (price, rating, counts).
- Never use uppercase for body or headings — only for small labels and category pills.

---

## 4. Spacing & layout

### Page shell (mobile-first)

```tsx
// app/(app)/layout.tsx pattern
<div className="min-h-dvh bg-background">
  <TopBar />
  <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4 md:max-w-4xl md:px-6">
    {children}
  </main>
  <BottomNav /> {/* mobile only */}
</div>
```

- **Max content width:** `max-w-2xl` (672px) for feeds and forms; `max-w-4xl` (896px) for admin dashboards.
- **Horizontal padding:** `px-4` mobile, `md:px-6` desktop.
- **Bottom padding:** always `pb-24` so bottom nav doesn't cover content.
- **Vertical rhythm:** `space-y-4` between cards in a list, `space-y-6` between sections, `space-y-2` inside a card.

### Bottom nav (mobile)

Fixed bottom bar with 4 icons: **Browse · New listing · Chats · Profile**.
Active item gets `text-primary`; everyone else `text-muted-foreground`.
Hide on `md:` and up — replace with top nav.

### Top bar

- 56px tall, white bg, bottom border `border-b`.
- Logo / title left, optional action button right.
- Sticky: `sticky top-0 z-40`.

---

## 5. Component patterns

### 5.1 Listing card (the most-used component)

```tsx
<Link href={`/listings/${listing.id}`} className="group block">
  <article className="overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
    <div className="relative aspect-square w-full bg-muted">
      <Image
        src={photo}
        alt={listing.title}
        fill
        className="object-cover transition-transform group-hover:scale-[1.02]"
      />
      {listing.is_gift && (
        <span className="absolute left-2 top-2 rounded-md brand-gradient px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          FREE
        </span>
      )}
    </div>
    <div className="space-y-1 p-3">
      <h3 className="line-clamp-1 text-base font-medium">{listing.title}</h3>
      <p className="text-lg font-semibold tabular-nums">
        {listing.is_gift ? 'Free' : `€${listing.price_eur}`}
      </p>
      <p className="text-xs text-muted-foreground">{listing.category} · {listing.condition}</p>
    </div>
  </article>
</Link>
```

**Grid:** 2 columns on mobile, 3 on `md:`, 4 on `lg:`. `grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4`.

### 5.2 Buttons (shadcn `Button`)

| Variant | When |
|---|---|
| `default` (blue/cyan gradient) | Primary CTA per screen — only one. "Post listing", "Send message", "Save". |
| `secondary` (gray bg) | Secondary actions — "Cancel", "Edit". |
| `outline` | Tertiary — "View profile", filter chips. |
| `ghost` | Inside cards or nav, low-emphasis. |
| `destructive` | Delete, Block, Reject |

The shared `Button` default variant must contain `brand-gradient`. Do not replace
it with `bg-primary`, a red token, or a page-specific color while implementing a
feature. The gradient is a stable part of the product identity.

**Sizes:** default `h-10`. Use `size="lg"` (`h-11`) for the main CTA on a form. Use `size="sm"` for inline actions in cards.

**Full-width on mobile:** primary form CTAs are `w-full` on mobile, `md:w-auto` on desktop.

### 5.3 Forms

- Use `react-hook-form` + `zod` + shadcn `Form`.
- Labels: `text-sm font-medium`, above the input.
- Helper text: `text-xs text-muted-foreground` below.
- Error: `text-xs text-destructive`.
- Inputs: `h-11` on mobile (touch target), `md:h-10` on desktop.
- Spacing between fields: `space-y-4`.

### 5.4 Chat bubbles

```tsx
// Outgoing (current user)
<div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm brand-gradient px-4 py-2 text-primary-foreground">
  {body}
</div>

// Incoming (other user)
<div className="mr-auto max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2 text-foreground">
  {body}
</div>
```

- Timestamp: `text-[10px] text-muted-foreground` below, aligned to bubble side.
- Spacing between bubbles: `space-y-1`, between groups (different sender): `space-y-3`.

### 5.5 Empty states

Always provide one. Centered, with: small icon (`h-8 w-8 text-muted-foreground`), one-line headline (`text-base font-medium`), one-line subtext (`text-sm text-muted-foreground`), and optionally one CTA button.

### 5.6 Pending / status badges

```tsx
const variants = {
  draft:   'bg-muted text-muted-foreground',
  pending: 'bg-yellow-50 text-yellow-900 border border-yellow-200',
  live:    'bg-green-50 text-green-900 border border-green-200',
  sold:    'bg-muted text-muted-foreground line-through',
  rejected:'bg-red-50 text-red-900 border border-red-200',
};
```

These muted semantic colors are the **only** exception to the "no other colors" rule, and only for status badges — never anywhere else in the UI.

### 5.7 Star rating

- Use Lucide `Star` icon, `h-4 w-4`.
- Filled = `fill-primary text-primary`.
- Empty = `fill-none text-muted-foreground`.
- Average rating display: `★ 4.8 · 12 ratings`.

---

## 6. Iconography

- **Library:** `lucide-react` only.
- **Default size:** `h-5 w-5` in nav and buttons, `h-4 w-4` inline with text.
- **Color:** inherit from parent (`currentColor`). Never colorize icons except active nav (`text-primary`).
- **Stroke width:** default (2). Don't change.

---

## 7. Imagery rules

- Listing photos: `aspect-square`, `object-cover`, never stretched.
- Avatars: circular, `h-9 w-9` in lists, `h-20 w-20` on profile pages. Fallback = first letter of name on `bg-muted` with `text-muted-foreground`.
- All images must have `alt` text. Listing photos use the listing title.
- Use `next/image` everywhere with explicit `width`/`height` or `fill` + sized parent.

---

## 8. Motion

- **Default duration:** `duration-150` for hover, `duration-200` for transforms.
- **Easing:** Tailwind default (`ease-in-out`).
- **Allowed:** opacity fades, subtle scale on hover (`hover:scale-[1.02]`), shadow changes, slide-in for mobile drawers/sheets.
- **Forbidden:** bounces, wobbles, parallax, scroll-triggered animations, anything decorative.

---

## 9. PWA-specific

- Theme color in manifest: `#0F172A` (dark navy, matching `--foreground`).
- Background color in manifest: `#FFFFFF`.
- Status bar style on iOS: `default`.
- App icon: brand-blue background, white "L." monogram, optional cyan accent dot.
- Splash screen: white background, centered logo.

---

## 10. shadcn/ui setup checklist

When initializing shadcn in this project, after `npx shadcn@latest init`:

1. Replace the generated `app/globals.css` `:root` block with the tokens in §2.
2. Confirm `tailwind.config.ts` has `darkMode: 'class'`.
3. Install these components by default: `button`, `input`, `textarea`, `label`, `form`, `card`, `dialog`, `sheet`, `dropdown-menu`, `avatar`, `badge`, `tabs`, `toast` (via sonner), `skeleton`.
4. Preserve the existing shared component variants. In particular, keep
   `brand-gradient` on the default button variant. Do not restyle primitives as
   a side effect of feature work.

---

## 11. Quick "do / don't"

| Do | Don't |
|---|---|
| `rounded-lg` on cards, `rounded-md` on inputs | `rounded-full` on cards or `rounded-none` everywhere |
| One primary CTA per screen | Multiple primary buttons competing |
| `text-muted-foreground` for secondary text | Light gray hex codes inline |
| `gap-3` to `gap-6` between elements | `gap-1` (cramped) or `gap-12` (sparse) |
| System sans-serif | Custom Google fonts, Georgia, serifs |
| Lucide icons at default stroke | Mixed icon libraries |
| Subtle `hover:shadow-md` | Hard offset shadows like `shadow-[8px_8px_0_0_#000]` |
| Blue-to-cyan gradient for brand moments | Red, orange, purple, or another competing brand palette |

---

## 12. Aesthetic DNA

> Fresh · Calm · Generous whitespace · Blue-to-cyan identity ·
> Mobile-first · Photo-led · Predictable · Quiet confidence

When in doubt: less color, more space, smaller type, simpler component.
