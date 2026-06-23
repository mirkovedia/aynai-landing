# Diseño — Capa de confianza y notificaciones del MVP

**Fecha:** 2026-06-23
**Proyecto:** AynAI — marketplace de intercambio de habilidades (Ayni)
**Rama:** `feat/mvp-confianza-notificaciones`

## Objetivo

Cerrar el bucle del MVP añadiendo las piezas que hoy faltan para que el producto
sea usable y confiable de verdad:

1. **Ciclo de vida del intercambio** con confirmación mutua y estado `completed`.
2. **Ratings** (reputación) tras un intercambio completado.
3. **AynAI Score real**, calculado en vez del `720` hardcodeado.
4. **Notificaciones** in-app (Realtime) + email (Resend).
5. **Limpieza** del legacy `waitlist` y mejoras de cold-start (seed + onboarding ligero).

Estas features comparten el ciclo de vida del intercambio y varias migraciones, por
eso van en un solo spec, pero se implementan en orden secuencial (cada una habilita a
la siguiente).

## Contexto actual (lo que ya existe)

Bucle core funcionando: `auth → perfil con skills → marketplace con búsqueda →
proponer intercambio → aceptar/rechazar → pagar comisión Bs 20 → revelar contacto`.

Tablas relevantes:
- `profiles` (`ayni_score int default 720`, `username`, `avatar_url`, `availability`, `modality`, `links jsonb`)
- `user_skills` (`kind: offer|seek`, `level`, `category`)
- `exchange_requests` (`status: pending|accepted|rejected|cancelled`, `offer_skill`, `want_skill`, `message`)
- `commission_payments` (`status: pending|paid|failed`, `provider`, `qr_payload`)
- `waitlist` (**legacy** del pivote landing→SaaS)

UI clave:
- `src/app/(dashboard)/intercambios/page.tsx` — bandeja recibidas/enviadas
- `src/components/features/marketplace/ExchangeRequestCard.tsx` — tarjeta con acciones + pago
- `src/components/features/marketplace/CommissionPayment.tsx` — pago de comisión (mock)
- `src/app/(dashboard)/dashboard/page.tsx` — muestra `ayni_score ?? 720` y lee `waitlist`
- `src/app/u/[username]/page.tsx` — perfil público

Primitivos de UI disponibles (rama base `feat/ux-polish-marketplace`): `Spinner`,
`Skeleton`, `EmptyState`, `ConfirmDialog`, sistema de `Toast`, `Button` con `loading`.

## Decisiones de diseño (acordadas)

| Tema | Decisión |
|---|---|
| Completado | **Confirmación mutua** (dos flags + trigger), no unilateral |
| Ratings | **Estrellas 1–5 + comentario opcional**, uno por parte por intercambio |
| Score | **0–1000**, pesos 50/25/15/10, nuevos = **600**, recalculado por trigger, explicable |
| Notificaciones | **In-app (Realtime) + email (Resend)** |
| Cold-start | Quitar `waitlist` de la UI + seed data + onboarding ligero (banner, no wizard) |

---

## 1. Ciclo de vida del intercambio

### Estados

```
pending ──accept──► accepted ──(ambos confirman)──► completed
   │                    │
   └─reject/cancel──► rejected / cancelled
```

### Cambios de schema (`exchange_requests`)

- `requester_confirmed boolean not null default false`
- `recipient_confirmed boolean not null default false`
- `completed_at timestamptz`
- CHECK de `status` ampliado para incluir `'completed'`.

### Trigger de completado

`before update`: cuando `requester_confirmed AND recipient_confirmed` y el status aún
no es `completed`, setea `status = 'completed'` y `completed_at = now()`. El completado
es un **hecho derivado**, no algo que una parte declara.

### Server action

`confirmExchange(requestId)` en `intercambios/actions.ts`: setea el flag de la parte
que llama (según sea requester o recipient). Tras confirmar, si el intercambio quedó
`completed`, dispara las notificaciones de "completado" a ambas partes.

### UI (`ExchangeRequestCard`)

- Cuando `status === 'accepted'`: botón **"Marcar como completado"**.
- Tras confirmar mi parte pero no la otra: estado **"Esperando confirmación de la otra parte"**.
- Cuando `status === 'completed'`: badge "Completado" + bloque de rating (sección 2).
- Nuevo label/color de status para `completed` en los `Record<ExchangeStatus, ...>`.

---

## 2. Ratings (reputación)

### Migración `0005_ratings.sql`

```sql
create table public.ratings (
  id                  uuid primary key default gen_random_uuid(),
  exchange_request_id uuid not null references public.exchange_requests(id) on delete cascade,
  rater_id            uuid not null references public.profiles(id) on delete cascade,
  ratee_id            uuid not null references public.profiles(id) on delete cascade,
  stars               int  not null check (stars between 1 and 5),
  comment             text,
  created_at          timestamptz not null default now(),
  unique (exchange_request_id, rater_id),
  check (rater_id <> ratee_id)
);
create index ratings_ratee_idx on public.ratings(ratee_id);
```

### RLS

- **insert:** `rater_id = auth.uid()` Y existe un `exchange_requests` con ese id en
  estado `completed` donde `auth.uid()` es parte y `ratee_id` es la contraparte.
- **select:** autenticados (lectura pública, para mostrar en perfiles).

### UI

- Formulario de estrellas (1–5) + textarea opcional dentro de `ExchangeRequestCard`
  cuando `status === 'completed'` y la parte aún no calificó (`unique` evita duplicados).
- Componente `StarRating` reutilizable en `src/components/ui/`.
- En `/u/[username]`: promedio de estrellas + cantidad + últimos comentarios.

---

## 3. AynAI Score real

### Migración `0006_score.sql`

Función `recalc_ayni_score(p_user_id uuid)` (`security definer`), devuelve y persiste
un entero 0–1000 en `profiles.ayni_score`:

| Factor | Peso | Cálculo |
|---|---|---|
| Promedio de ratings recibidos | 50% | `coalesce(avg(stars),3)/5 * 500` |
| Intercambios completados | 25% | `least(ln(1+n)/ln(1+20), 1) * 250` |
| Tasa de cumplimiento | 15% | `completed / nullif(accepted_or_more, 0) * 150` |
| Completitud del perfil | 10% | 5 ítems (avatar, ≥1 skill offer, ≥1 skill seek, ≥1 link, availability≠unavailable) × 20 |

- **Arranque neutro:** si el usuario no tiene ratings recibidos NI intercambios
  completados, la función hace **early-return = 600** (punto de partida acordado). La
  fórmula ponderada solo gobierna una vez que hay actividad real; así evitamos que un
  perfil recién creado (que con suma ponderada daría ~300) arranque castigado.
- `accepted_or_more` = intercambios que llegaron al menos a `accepted` (accepted +
  completed), para que la tasa de cumplimiento mida "acepté y cumplí".

### Triggers

- `after insert on ratings` → `recalc_ayni_score(new.ratee_id)`.
- `after update on exchange_requests` cuando pasa a `completed` → recalcular ambas partes.

### Cambios

- Default de `profiles.ayni_score` pasa de `720` a `600` (migración `alter column`).
- Backfill: recalcular el score de todos los perfiles existentes una vez en la migración.

### UI (dashboard)

- Quitar el `?? 720` hardcodeado; usar `profile.ayni_score` real.
- Mostrar **desglose explicable**: las 4 barras/factores con su aporte, para que el
  número sea entendible ("subió porque completaste un intercambio").

---

## 4. Notificaciones in-app + email

### Migración `0007_notifications.sql`

```sql
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,   -- request_received | request_accepted | request_rejected |
                               -- commission_paid | exchange_completed | rating_received
  title      text not null,
  body       text,
  link       text,            -- ruta interna a la que lleva (ej. /intercambios)
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, read);
```

RLS: `select`/`update` solo `user_id = auth.uid()`. El insert lo hacen las server
actions vía cliente service-role-equivalente (server client autenticado como la parte
que origina, con policy de insert que permita crear notificaciones para la contraparte
dentro de un intercambio compartido — o, más simple, una función `security definer`
`notify(user_id, type, title, body, link)`).

> Decisión: usar una función `security definer` `create_notification(...)` para evitar
> tener que abrir una policy de insert cruzada. Las server actions la llaman vía RPC.

### Capa de aplicación (`src/lib/notifications/`)

- `index.ts` — `notify({ userId, type, title, body, link })`:
  1. Inserta la fila vía RPC `create_notification`.
  2. Dispara email con Resend (best-effort, no bloquea ni rompe la acción si falla).
- `email.ts` — plantillas por tipo (asunto + HTML simple).
- `RESEND_API_KEY` en env; si falta, se omite el email silenciosamente (mismo patrón
  que el emailService de otros proyectos). El registro in-app **siempre** se crea.

### In-app (Realtime)

- `NotificationBell` (client) en el navbar (`(dashboard)/layout.tsx`):
  - Carga inicial de no-leídas (server).
  - Suscripción Realtime `postgres_changes` (insert) filtrada por `user_id=eq.<id>`.
  - Badge con contador + panel desplegable; click marca leído (`update read=true`).

### Eventos → notificación

| Origen (server action) | Evento | Destinatario |
|---|---|---|
| `proposeExchange` | `request_received` | recipient |
| `respondToRequest(accept)` | `request_accepted` | requester |
| `respondToRequest(reject)` | `request_rejected` | requester |
| `confirmMockPayment` | `commission_paid` | la otra parte |
| `confirmExchange` (→ completed) | `exchange_completed` | ambas partes |
| `submitRating` | `rating_received` | ratee |

---

## 5. Limpieza + cold-start

- **Quitar `waitlist` del dashboard**: eliminar la query y el bloque de UI en
  `dashboard/page.tsx` (la tabla y su tipo `WaitlistEntry` quedan, pero sin uso en la
  app autenticada). Limpiar el import de `WaitlistEntry` si queda huérfano.
- **Seed data** (`supabase/seed.sql`): ~8 perfiles demo con username, skills `offer`/
  `seek` variadas y avatares placeholder, para que el marketplace no esté vacío en
  desarrollo/demo. Idempotente.
- **Onboarding ligero**: banner en el dashboard "Completá tu perfil (N/5)" con link a
  `/perfil/editar`, visible solo si la completitud < 5. Reusa el cálculo de
  completitud del factor de perfil del score. **No** un wizard multipaso (YAGNI).

---

## Orden de implementación

Cada paso es un commit propio, con `npx tsc --noEmit`, `npx vitest run` y `npm run build`
en verde antes de seguir:

1. **Limpieza** — quitar `waitlist` del dashboard.
2. **Ciclo de vida + Ratings** — migraciones 0005, flags/trigger de completado, server
   actions, `StarRating`, UI en `ExchangeRequestCard` y `/u/[username]`.
3. **AynAI Score** — migración 0006, función + triggers, default 600, backfill, desglose
   en dashboard.
4. **Notificaciones** — migración 0007, RPC `create_notification`, `src/lib/notifications/`,
   `NotificationBell` con Realtime, cableado de eventos en las server actions, Resend.

## Testing

- **Unit (Vitest):** función pura de cálculo de score (extraer la fórmula a TS para
  testearla en espejo del SQL, o testear vía esquemas Zod de los formularios de rating
  y de las plantillas de notificación). Schemas Zod de `rating` (stars 1–5, comment
  opcional) con tests como los de `marketplace/schema.test.ts`.
- **RLS / DB:** verificación manual de policies (no se puede insertar rating sin
  intercambio completado; no se ve notificación ajena).
- **Build/typecheck:** verde en cada paso.

## Variables de entorno nuevas

- `RESEND_API_KEY` — clave de Resend (opcional; sin ella, el email se omite y solo
  queda la notificación in-app). Documentar en `.env.example`.

## Fuera de alcance (post-MVP)

- PSP real boliviano (QR Simple / Tigo Money / BNB) — el webhook ya está listo.
- Matching con IA / embeddings.
- Capa Web3 (Avalanche, reputación on-chain, Ayllu pools).
- Wizard de onboarding multipaso.
