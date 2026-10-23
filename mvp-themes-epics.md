# Lodge-Marketplace — MVP: Themes & Epics

> Vista de producto del MVP actual. Para detalle técnico por fase y acceptance criteria, ver [tasks.md](tasks.md).
> Para features de la próxima versión (push notifications, badges), ver [v2-roadmap.md](v2-roadmap.md).

---

## Resumen

PWA privada para los ~40 residentes del lodge para comprar, vender y regalar items entre vecinos — moderada, segura, gratis. Solo accesible por invitación + aprobación del admin.

**Stack:** Next.js 15 (App Router) · Insforge (DB + Auth + Storage + Realtime + Edge Functions) · shadcn/ui · Tailwind · TypeScript strict · Vercel.

---

## Themes

El MVP cubre 9 epics agrupados en 3 themes:

### Theme A — Acceso y comunidad cerrada
- Epic 1: Onboarding & Access
- Epic 2: Profile Management
- Epic 8: PWA & Installability

### Theme B — Marketplace
- Epic 3: Listings Management
- Epic 4: Admin Moderation
- Epic 7: Ratings & Reputation

### Theme C — Comunicación y salud del producto
- Epic 5: Realtime Chat & Messaging
- Epic 6: Reporting & Safety
- Epic 9: Analytics & Metrics

---

## Epics

### Epic 1 — Onboarding & Access
**Goal:** Solo residentes aprobados del lodge pueden entrar a la app.

Features:
- Signup (email + password + display name) + Login
- Perfiles activos inmediatamente después del registro, sin aprobación manual
- Middleware que protege rutas `(app)/*` y exige sesión y perfil no eliminado
- Flags `is_admin` + `is_approved` en `profiles`
- RLS habilitada en las 8 tablas del schema
- Service-role aislado al servidor (nunca en `NEXT_PUBLIC_*`)

### Epic 2 — Profile Management
**Goal:** Cada residente tiene un perfil público sin exponer datos privados.

Features:
- Editar perfil propio: display name, avatar y bio
- Avatar upload con compresión client-side
- Vista pública `/profile/[id]` (sin flags admin)
- `/profile/settings`: cambiar password, soft-delete account
- TopBar con dropdown de avatar (perfil / logout)

### Epic 3 — Listings Management
**Goal:** Un residente aprobado puede vender o regalar cosas dentro del lodge.

Features:
- `/listings/new`: formulario con multi-foto (1–5), compresión WebP ≤300KB, drag-to-reorder
- Categorías + condición + precio / "Free" toggle
- `/listings/[id]`: photo gallery con swipe, seller mini-card, "Message seller"
- `/listings/[id]/edit`: editar precio/fotos/título revierte status a `pending` automáticamente
- "Mark as sold" para el dueño
- Estados: `draft → pending → live → sold/archived`
- Feed `/` con filtros por categoría + toggle "Free only"
- BottomNav con 4 secciones

### Epic 4 — Admin Moderation
**Goal:** Ian (admin) puede moderar listings, usuarios y reportes.

Features:
- `/admin` shell con tabs: pending users · pending listings · reports · all users · all listings
- Aprobar / rechazar listings con razón visible para el dueño
- Aprobar / rechazar usuarios pendientes
- Email automático al admin cuando entra un listing a review (edge function)
- Eliminar listings o usuarios desde admin
- Service-role solo en rutas `/api/admin/*` (verifican `is_admin`)

### Epic 5 — Realtime Chat & Messaging
**Goal:** Comprador y vendedor pueden conversar en tiempo real sobre un listing.

Features:
- "Message seller" desde `/listings/[id]` crea/encuentra conversación
- `/chats` ordenada por `last_message_at`, con preview + unread count
- `/chats/[id]` con composer sticky y scroll al último mensaje
- Subscripción realtime (Insforge) — append sin refresh
- Optimistic rendering de mensajes salientes
- Read receipts (`read_at`)
- Rate limit: 30 msgs/min/usuario (in-memory bucket)
- Validación: 1–2000 chars con contador cerca del límite

### Epic 6 — Reporting & Safety
**Goal:** Los residentes pueden reportar y bloquear; el admin lo resuelve.

Features:
- Reportar conversación / usuario / listing
- Bloquear usuario: oculta perfil, listings y chats en ambos lados
- Unblock desde `/profile/settings`
- `/admin/reports` con resolve / dismiss y filtro open/resolved
- Bloqueos respetados también en ratings (no se ven entre sí)

### Epic 7 — Ratings & Reputation
**Goal:** Tras intercambiar al menos un mensaje, los usuarios pueden calificarse mutuamente.

Features:
- Dialog con 1–5 estrellas + comentario (≤280 chars)
- Eligible solo si hay ≥1 mensaje intercambiado (RLS lo enforce)
- Una rating por (rater, ratee, listing)
- Edit window: 7 días, luego locked
- Average + count + comentarios recientes en `/profile/[id]`
- `tabular-nums` para el número de rating

### Epic 8 — PWA & Installability
**Goal:** Se instala como app en iOS/Android y carga rápido.

Features:
- `manifest.json` + iconos (192, 512, maskable)
- Service worker `public/sw.js` (cache-first estático, network-first dinámico)
- Registro de SW solo en producción
- Install prompt en Android (`beforeinstallprompt`) e instrucciones en iOS
- Lighthouse PWA ≥90, Performance ≥80, Accessibility ≥90
- Deploy en Vercel

### Epic 9 — Analytics & Metrics
**Goal:** El admin puede medir adopción y salud del marketplace sin SDKs externos.

Features:
- `profiles.last_active_at` actualizado vía middleware (throttle 1/hora/usuario)
- `/admin/analytics` con 5 secciones de KPIs:
  - **Adoption:** % del lodge (aprobados / 40), nuevos signups, pendientes
  - **Engagement:** WAU, MAU, stickiness (WAU/MAU)
  - **Marketplace:** live listings, sold, median time-to-sold, sell-through rate
  - **Conversation:** convs iniciadas, % listings con ≥1 conv, avg msgs/conv
  - **Health:** reportes abiertos, median time-to-resolve
- Window selector (7d / 30d / 90d / all)
- `GET /api/admin/metrics` como single source of truth (misma data que el dashboard)
- Cero dependencias externas (no GA, no PostHog)

---

## Out of scope (MVP)

- Push notifications y app badges → ver [v2-roadmap.md](v2-roadmap.md)
- In-app payments
- Eventos del lodge / group chats
- Charts, time-series, session replay, error monitoring externo
- Multi-language
- Multi-tenant
