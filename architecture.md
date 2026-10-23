# Lodge-Marketplace — Architecture & Technical Overview

> Documentación técnica complementaria al MVP. Para la vista de producto ver [mvp-themes-epics.md](mvp-themes-epics.md), para detalle por fase ver [tasks.md](tasks.md), para la spec completa (RLS, edge functions, validaciones) ver [engineering-spec.md](engineering-spec.md).

---

## 1. Modelo de datos (las 8 tablas del MVP)

Schema en PostgreSQL gestionado por Insforge. Todas las tablas viven en `public`, todas tienen `created_at timestamptz` y RLS habilitada.

### Tablas y propósito

| # | Tabla | Qué guarda |
|---|---|---|
| 1 | **profiles** | Datos del residente: `display_name`, `avatar_url`, `bio`, `room_number`, flags `is_admin` / `is_approved`, `deleted_at` (soft-delete). PK = `auth.users.id` (1:1 con el usuario de Auth). |
| 2 | **listings** | Anuncio: `owner_id`, `title`, `description`, `price_eur` o `is_gift`, `category`, `condition`, `status` (`draft / pending / live / sold / archived`), `rejection_reason`, `first_approved_at` (anti-rebote en re-aprobaciones). |
| 3 | **listing_photos** | Foto de un listing: `listing_id`, `storage_path`, `sort_order`. 1–5 por listing. Los binarios viven en Storage. |
| 4 | **conversations** | Chat 1:1 sobre un listing: `listing_id`, `buyer_id`, `seller_id`, `last_message_at`. `UNIQUE(listing_id, buyer_id)` → un chat por (listing, comprador). |
| 5 | **messages** | Mensaje de chat: `conversation_id`, `sender_id`, `body` (1–2000 chars), `read_at`. Un trigger actualiza `conversations.last_message_at` en cada insert. |
| 6 | **ratings** | Calificación post-chat: `rater_id`, `ratee_id`, `listing_id`, `stars` (1–5), `comment` (≤280), `edit_locked_at` (now + 7 días). `UNIQUE(rater, ratee, listing)`. |
| 7 | **blocks** | Bloqueo mutuo: PK = `(blocker_id, blocked_id)`. Si A bloquea a B, ambos dejan de verse en perfiles, listings, chats y ratings. |
| 8 | **reports** | Denuncia: `reporter_id`, `target_type` (`user / listing / conversation`), `target_id`, `reason`, `status` (`open / resolved / dismissed`), `resolved_by`, `resolved_at`. |

> Nota: existe una 9ª tabla `push_subscriptions` ya creada en el schema, pero es parte de V2 (push notifications). No cuenta en el MVP. Ver [v2-roadmap.md](v2-roadmap.md).

### Mapa conceptual de relaciones

```
auth.users (Insforge Auth)
    │ 1:1
    ▼
profiles ─────────────────────────────────┐
    │ 1:N (owner)                         │ N:N self (blocks)
    ▼                                     │
listings ──── 1:N ──→ listing_photos      │
    │ 1:N (about)                         │
    ▼                                     │
conversations (buyer + seller → profiles) │
    │ 1:N                                 │
    ▼                                     │
messages                                  │
                                          │
ratings: rater + ratee → profiles, sobre  │
         un listing (eligible solo si ≥1  │
         mensaje en una conversation)     │
                                          │
reports: reporter → profiles, target =    │
         user | listing | conversation ───┘
```

### Invariantes clave (enforced por la DB, no solo por código)

- Un usuario no se puede calificar a sí mismo (`rater_id <> ratee_id`)
- Un comprador no puede ser también vendedor en la misma conversación (`buyer_id <> seller_id`)
- Un listing tiene precio **o** está marcado como gift, nunca ambos ni ninguno
- Una rating es editable solo durante 7 días (`now() < edit_locked_at`, enforced por RLS)
- Solo perfiles activos pueden insertar listings / mensajes / ratings / reports (RLS via función `is_approved()`)

---

## 2. Arquitectura y seguridad

### Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router, Server Components por defecto) |
| Lenguaje | TypeScript strict |
| Backend + DB + Auth + Storage + Realtime + Edge Functions | **Insforge** (`@insforge/sdk`) |
| UI | shadcn/ui + Tailwind CSS |
| Forms | react-hook-form + Zod |
| Iconos | lucide-react |
| Fechas | date-fns |
| Compresión imágenes | browser-image-compression (cliente) |
| Toasts | sonner |
| Package manager | pnpm |
| Deploy | Vercel |

**Prohibidos en el repo:** `@supabase/*`, `axios`, `moment`, `react-icons`.

### Auth — flujo exacto

Auth nativa de Insforge, email + password.

1. **Signup** (`/signup`): Insforge SDK crea el `auth.user`. A continuación se inserta la fila en `profiles`; la base de datos asigna `is_approved = true` por defecto e impide crearla como administradora.
2. **Login** (`/login`): Insforge SDK estándar, devuelve sesión.
3. **Profile gate**: `src/middleware.ts` corre en todas las rutas `(app)/*`, valida sesión vía Insforge SDK y exige un perfil existente que no esté eliminado.
4. **Admin gate**: el mismo middleware extiende la regla en `/admin/*` exigiendo `is_admin = true`; si no, redirige a `/`.

> El cliente no puede modificar `is_admin` ni `is_approved`: los permisos por columna excluyen ambos campos y la política de inserción exige `is_admin = false` e `is_approved = true`.

### Realtime — Insforge directamente

- Canal: Insforge SDK realtime (no Pusher, no Ably, no librería externa).
- En la vista de chat (`/chats/[id]`): subscripción a inserts en `messages` filtrados por `conversation_id`.
- Para el unread badge global: subscripción a inserts en `messages` donde `sender_id != auth.uid()` y la `conversation_id` pertenece al usuario.
- Las suscripciones se cierran en `useEffect` cleanup al desmontar.

### Seguridad — modelo en capas

| Capa | Qué bloquea |
|---|---|
| **Middleware** | Rutas `(app)/*` y `/admin/*` — redirige si no hay sesión, falta el perfil, está eliminado o la ruta exige admin |
| **RLS** | Cada query directa del cliente — implementa visibilidad, propiedad, bloqueos, ventanas de edición, prevención de auto-rating |
| **Server-only routes** (`/api/admin/*`) | Las únicas que usan el service-role. Verifican `is_admin` en la sesión antes de hacer la llamada con service-role. |
| **Edge functions** (Insforge) | `notify-admin-new-listing` (email) — disparada desde un route handler post-insert, no desde un trigger DB |
| **Storage policies** | Bucket `listing-photos` con lectura pública, write solo al owner del listing en `listings/{listing_id}/...` |

### Rate limits (in-app, in-memory)

Implementados con token bucket por usuario en memoria del servidor (suficiente para ~40 usuarios):

- Mensajes: 30 / min / usuario
- Creación de listings: 10 / día / usuario
- Reports: 5 / día / usuario

Si la lodge crece > 200 usuarios, migrar a counter en DB o edge function.

### Service-role isolation — la regla cero

`INSFORGE_SERVICE_KEY` **nunca** va prefijada con `NEXT_PUBLIC_*`. Solo se usa en:
- Route handlers bajo `src/app/api/admin/*` (que verifican `is_admin` antes)
- Edge functions de Insforge

Lo mismo aplica a `VAPID_PRIVATE_KEY` cuando entre V2.

---

## 3. Estructura del repo

```
lodge-marketplace/
├── CLAUDE.md                           # Instrucciones permanentes del proyecto
├── README.md                           # Setup, deploy, claim Insforge, push setup
├── lodge-marketplace-brief.md          # Product brief (el "qué")
├── engineering-spec.md                 # Spec técnica (el "cómo") — schema, RLS, libs
├── tasks.md                            # Plan por fases con AC/DoD
├── mvp-themes-epics.md                 # Vista de producto: 9 epics en 3 themes
├── v2-roadmap.md                       # Push notifications + badges (post-MVP)
├── architecture.md                     # Este documento
├── .claude/skills/lodge-marketplace-ui/SKILL.md   # Design system
├── public/
│   ├── manifest.json
│   ├── sw.js                           # Service worker
│   └── icons/
├── src/
│   ├── app/
│   │   ├── (auth)/                     # signup, login, pending
│   │   ├── (app)/                      # feed, listings, chats, profile, admin
│   │   └── api/                        # Route handlers — admin actions, notify
│   ├── components/
│   │   ├── ui/                         # shadcn primitives (no modificar)
│   │   ├── listing/ chat/ profile/ shared/
│   ├── lib/
│   │   ├── insforge.ts                 # Cliente del browser
│   │   ├── insforge-server.ts          # Service-role (server only)
│   │   ├── auth.ts                     # Helpers de sesión
│   │   ├── schemas.ts                  # Zod
│   │   ├── image.ts                    # Compresión cliente
│   │   └── metrics.ts                  # Analytics dashboard (Phase 7)
│   ├── hooks/                          # use-session, use-realtime-messages, use-toast
│   └── types/db.ts                     # Tipos generados
├── scripts/
│   └── seed.ts                         # Ian como admin + 2 listings de ejemplo
└── insforge-functions/
    └── notify-admin-new-listing/       # Email al admin cuando entra un listing
```

---

## 4. Setup local y deploy

### Prerequisites
- Node.js 20+
- pnpm (`npm install -g pnpm`)

### Setup
```bash
git clone <repo>
cd lodge-marketplace
pnpm install
cp .env.local.example .env.local      # rellenar las 3 vars
pnpm dev                               # http://localhost:3000
```

### Env vars (MVP)

| Variable | Tipo |
|---|---|
| `NEXT_PUBLIC_INSFORGE_URL` | Público |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | Público |
| `INSFORGE_SERVICE_KEY` | **Server only** — nunca `NEXT_PUBLIC_*` |

### Primer admin (manual)

```sql
UPDATE profiles
SET is_admin = true, is_approved = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
```

### Deploy a Vercel

- Push a GitHub → Import en `vercel.com/new` → añadir las 3 env vars → deploy
- Vercel detecta `pnpm-lock.yaml` y usa pnpm automáticamente
- Seed: `pnpm tsx scripts/seed.ts` (idempotente — Ian como admin + 2 listings)

### Backups

- DB: Insforge Dashboard → Database → Table Editor → Export CSV por tabla
- Storage: Dashboard → Storage → descargar buckets `listing-photos` y `avatars`
- Guardar fuera del repo (contienen PII: nombres, emails, room numbers)
- Cadencia recomendada: mensual o antes de cualquier cambio de schema

---

## 5. Out of scope del MVP

- Push notifications + app badges → [v2-roadmap.md](v2-roadmap.md)
- Pagos in-app, verificación SMS, shipping/logística
- Discovery público / SEO
- Multi-idioma, multi-tenant
- Eventos, group chats
- Charts / time-series / session replay / error monitoring externo
- CI/CD pipeline, tests E2E automatizados
