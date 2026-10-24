# Círculo Market — V2 Roadmap

> Features ya implementadas localmente pero **fuera del MVP actual**. Pendientes de commit, review y deploy a producción.
> Para el alcance del MVP ya en GitHub, ver [mvp-themes-epics.md](mvp-themes-epics.md).

---

## Theme — Engagement & Re-activation

El MVP cubre el flujo dentro de la app. V2 vuelve a activar al usuario cuando no la tiene abierta, para que no pierda mensajes, invitaciones ni productos relevantes de sus amigos.

---

### Epic 10 — Push Notifications

**Goal:** Avisar a usuarios y administradores de eventos relevantes sin tener la app abierta.

Features ya implementadas localmente:

- **Edge functions de Insforge (fan-out)**
  - `push-new-listing` — notifica a usuarios aprobados cuando un listing se publica por primera vez ([insforge-functions/push-new-listing/](insforge-functions/push-new-listing/))
  - `push-new-message` — notifica al destinatario de un nuevo mensaje de chat ([insforge-functions/push-new-message/](insforge-functions/push-new-message/))
  - `push-admin-new-listing` — notifica al admin de un listing en review ([insforge-functions/push-admin-new-listing/](insforge-functions/push-admin-new-listing/))
  - Código compartido en [insforge-functions/_shared/](insforge-functions/_shared/)

- **Cliente Web Push**
  - Suscripción / unsubscribe ([src/lib/push-notifications.ts](src/lib/push-notifications.ts))
  - Banner de permisos no-intrusivo ([src/components/shared/PushPermissionBanner.tsx](src/components/shared/PushPermissionBanner.tsx))
  - Toggle de notificaciones en settings ([src/components/profile/NotificationsToggle.tsx](src/components/profile/NotificationsToggle.tsx))

- **API routes**
  - [src/app/api/push/](src/app/api/push/) — subscribe / unsubscribe / store endpoint
  - [src/app/api/notify/](src/app/api/notify/) — disparar notificación desde el backend

- **Service Worker actualizado** ([public/sw.js](public/sw.js)) — handler de `push` event

- **Schema**
  - Tabla `push_subscriptions` ya definida en `engineering-spec.md` §3.10 (endpoint, p256dh_key, auth_key, user_agent + RLS)

- **Env vars necesarias** (añadidas a [.env.local.example](.env.local.example))
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_SUBJECT`

---

### Epic 11 — App Badges

**Goal:** Mostrar el conteo de unread directamente sobre el icono de la PWA instalada.

Features ya implementadas localmente:

- Wrapper de la Badging API ([src/lib/badge.ts](src/lib/badge.ts))
- Tipos de `navigator.setAppBadge` ([src/types/navigator.d.ts](src/types/navigator.d.ts))
- Integración con el unread count de chat:
  - [src/components/chat/ChatView.tsx](src/components/chat/ChatView.tsx) (limpia el badge al abrir la conversación)
  - [src/app/(app)/layout.tsx](src/app/(app)/layout.tsx) (escribe el badge cuando llega un mensaje)

---

## Pasos pendientes antes de prod

1. Generar par de VAPID keys y guardarlas en Vercel env vars (preview + production)
2. Probar suscripción + recepción en preview deployment (al menos un Android Chrome real)
3. Verificar el `setAppBadge` en Android (Chrome / Edge) — iOS es best-effort, documentar limitación
4. Probar fan-out de listings con varios usuarios suscritos sin saturar
5. Revisar que admin notifications no spamean en bulk approvals (rate limit o batch)
6. Limpiar suscripciones inválidas (410 Gone del push service) en el endpoint
7. Commit + PR + merge a `main`
8. Setear env vars en Vercel
9. Deploy a producción
