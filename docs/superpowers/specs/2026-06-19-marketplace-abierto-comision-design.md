# Diseño — Marketplace abierto + comisión por conexión

> **Fase 2 del marketplace.** Construye sobre lo entregado en la Fase 1 (`exchange_requests`, `ProfileCard`, `/explorar`, `/intercambios`). Pivota de un descubrimiento por búsqueda a un **feed abierto tipo red social** y monetiza cada conexión con una **comisión por persona** cobrada vía QR (pasarela enchufable, mock por ahora).

## Objetivo

Que al iniciar sesión el usuario caiga directo en un **marketplace visible y transparente** donde ve a todas las personas, entienda el flujo de un vistazo, proponga un Ayni (ofrezco/quiero), y al concretarse la conexión **ambas partes paguen una comisión AynAI** (desbloqueo independiente) para revelar el contacto y coordinar fuera de la plataforma.

## Decisiones tomadas (brainstorming)

- **Comisión:** cobro **real** como meta, pero **sin credenciales de PSP todavía** → arquitectura de pago completa con **proveedor mock enchufable** (simula QR dinámico + webhook); el PSP real se conecta luego sin reescribir la lógica.
- **Pasarela objetivo:** **QR boliviano** (BNB / Tigo Money / QR Simple).
- **Modelo de conexión:** se **mantiene el Ayni** (ofrezco/quiero). El feed abierto reemplaza a la búsqueda como entrada. La comisión se cobra al **concretar** (después de aceptar).
- **Quién paga:** **ambas partes**.
- **Desbloqueo:** **independiente** — cada quien paga su comisión y, al pagar, ve el contacto del otro (evita el bloqueo mutuo).
- **Visibilidad:** feed visible **solo para usuarios autenticados**; login redirige directo al feed.
- **Monto:** `COMMISSION_AMOUNT_BS = 20` (constante configurable).

## Arquitectura

### Routing y navegación

- **Nueva ruta `/marketplace`** — el feed; **landing post-login**. Lista todos los perfiles (excepto el propio) usando `ProfileCard` + `ProposeExchangeButton`. Los filtros existentes (`SearchFilters`) quedan como refinamiento **opcional**: sin filtro = se ve a todos.
- **Redirecciones a `/marketplace`:**
  - `src/components/auth/AuthForm.tsx` (hoy `router.push("/dashboard")`).
  - `src/app/auth/callback/route.ts` (hoy `next ?? "/dashboard"`).
- **`/explorar` se absorbe** en `/marketplace` (mismo comportamiento, "mostrar todos por defecto"). Se mantiene un redirect `/explorar → /marketplace` para no romper enlaces.
- **`/dashboard`** deja de ser la entrada; permanece accesible como "Mi panel" desde el menú.
- **Middleware:** añadir `/marketplace` a `protectedPaths`.
- **Layout `(dashboard)`:** el enlace "Explorar" pasa a "Marketplace" → `/marketplace`. Se mantiene "Intercambios" + badge.

### Bloque "Cómo funciona"

Componente `HowItWorks` en la cabecera de `/marketplace`: 4 pasos (Explora → Propón un Ayni → Acepta → Paga la comisión y conecta), con mención explícita de que **ambas partes pagan Bs 20** al concretar. Colapsable / descartable por el usuario (preferencia local, no crítica).

### Modelo de datos (migración `0004_commission.sql`)

`exchange_requests` se conserva intacto. Se añade:

```sql
create table if not exists public.commission_payments (
  id                  uuid primary key default gen_random_uuid(),
  exchange_request_id uuid not null references public.exchange_requests(id) on delete cascade,
  payer_id            uuid not null references public.profiles(id) on delete cascade,
  amount_bs           integer not null,
  status              text not null default 'pending'
                      check (status in ('pending','paid','failed')),
  provider            text not null default 'mock',
  provider_ref        text,           -- id de cargo del PSP
  qr_payload          text,           -- contenido del QR a renderizar
  created_at          timestamptz not null default now(),
  paid_at             timestamptz,
  unique (exchange_request_id, payer_id)   -- un pago por parte por intercambio
);
```

- **RLS:** cada usuario solo ve y actualiza filas donde `payer_id = auth.uid()`. Inserción restringida a las partes del intercambio asociado.
- **Al aceptar** un Ayni, `respondToRequest(accept)` crea las **dos filas** `pending` (una para `requester_id`, otra para `recipient_id`) con `amount_bs = COMMISSION_AMOUNT_BS` y `provider = 'mock'`.

### Tipos (`src/types/database.ts`)

```ts
export type PaymentStatus = "pending" | "paid" | "failed";
export interface CommissionPayment {
  id: string;
  exchange_request_id: string;
  payer_id: string;
  amount_bs: number;
  status: PaymentStatus;
  provider: string;
  provider_ref: string | null;
  qr_payload: string | null;
  created_at: string;
  paid_at: string | null;
}
```

### Arquitectura de pago enchufable

`src/lib/payments/` :

- **`provider.ts`** — interfaz:
  ```ts
  export interface CreateChargeInput { amountBs: number; reference: string; }
  export interface Charge { chargeId: string; qrPayload: string; status: PaymentStatus; }
  export interface PaymentProvider {
    readonly name: string;
    createCharge(input: CreateChargeInput): Promise<Charge>;
    /** Verifica el payload de webhook del PSP y devuelve el id de cargo + estado. */
    parseWebhook(body: unknown): { chargeId: string; status: PaymentStatus } | null;
  }
  ```
- **`mock-provider.ts`** — `MockQrProvider`: `createCharge` devuelve un `qrPayload` simulado (texto determinístico tipo `AYNI-MOCK:<reference>:<amount>`) y `status: 'pending'`; `parseWebhook` acepta un body `{ chargeId, status }` directo.
- **`index.ts`** — `getPaymentProvider()` devuelve la instancia activa (hoy `MockQrProvider`; futura selección por env `PAYMENT_PROVIDER`).
- **`constants.ts`** — `COMMISSION_AMOUNT_BS = 20`.

### Server actions y endpoints de pago

`src/app/(dashboard)/intercambios/actions.ts` (extender):

- **`startCommissionPayment({ exchangeRequestId })`** — para el usuario autenticado (debe ser parte del intercambio y estar `accepted`): busca/crea su `commission_payments`, llama `provider.createCharge`, guarda `provider_ref` + `qr_payload`, devuelve `{ qrPayload, chargeId }`. Validado con Zod.
- **`confirmMockPayment({ chargeId })`** — solo para `provider = 'mock'`: marca el pago `paid` + `paid_at`. Simula la confirmación del PSP. (En producción esto lo hará el webhook.)

`src/app/api/payments/webhook/route.ts` — endpoint que el PSP real llamará: usa `provider.parseWebhook`, ubica el `commission_payments` por `provider_ref` y lo marca `paid`/`failed`. Para el mock queda inerte/protegido. `revalidatePath("/intercambios")`.

### Revelado de contacto (independiente)

En `ExchangeRequestCard`, para un intercambio `accepted`:

- Se carga el `commission_payments` **del usuario actual** para ese intercambio.
- Si `status !== 'paid'` → mostrar **"Paga tu comisión (Bs 20) para ver el contacto de {nombre}"** + botón que llama `startCommissionPayment`, renderiza el QR (mock), y un botón **"Ya pagué (simular)"** que llama `confirmMockPayment`.
- Si `status === 'paid'` → revelar los **links de contacto** del otro (como ya hace hoy).
- El estado del otro pagador **no** condiciona mi revelado (desbloqueo independiente).

### Helper de feed

`src/lib/marketplace/search.ts` (extender o nuevo `listProfiles`):

- **`listProfiles({ excludeUserId, kind?, loc?, avail?, limit?, offset? })`** — devuelve `SearchResult[]` de todos los perfiles (sin email), con filtros opcionales y paginación simple. Reusa `PUBLIC_COLUMNS`. El `searchProfiles` actual se mantiene para búsqueda por `q`; el feed sin `q` usa `listProfiles`.

## Flujo de datos (camino feliz)

1. A entra → `/marketplace` → ve el feed (todos, sin email) + "Cómo funciona".
2. A "Propone Ayni" a B (`createExchangeRequest`) → fila `pending`.
3. B en `/intercambios` (badge) → **Aceptar** (`respondToRequest`) → estado `accepted` + se crean 2 `commission_payments` `pending`.
4. A y B, cada uno en su tarjeta `accepted`, pagan su comisión (`startCommissionPayment` → QR mock → `confirmMockPayment`).
5. En cuanto **A** paga, A ve el contacto de B. En cuanto **B** paga, B ve el de A. (Independiente.)

## Manejo de errores

- Todas las nuevas actions devuelven `ActionResult` (`{ error, code, details? }`).
- Códigos nuevos: `NOT_ACCEPTED` (intentar pagar un intercambio no aceptado), `ALREADY_PAID`, `PAYMENT_PROVIDER_ERROR`, `FORBIDDEN` (no eres parte).
- Validación Zod en `startCommissionPaymentSchema` y `confirmMockPaymentSchema`.
- El webhook valida firma/forma vía `provider.parseWebhook`; payloads inválidos → 400.

## Testing

- **Vitest:** schemas nuevos (`startCommissionPaymentSchema`, `confirmMockPaymentSchema`); `MockQrProvider.createCharge`/`parseWebhook`; helper de monto/estado.
- **Type gate:** `npx tsc --noEmit` sin errores nuevos (línea base: `button.tsx:50`).
- **Manual:** flujo de dos cuentas A/B incluyendo los dos pagos y el revelado independiente del contacto.

## Componentes y archivos

**Crear:**
- `supabase/migrations/0004_commission.sql`
- `src/lib/payments/constants.ts`, `provider.ts`, `mock-provider.ts`, `index.ts`
- `src/lib/payments/mock-provider.test.ts`
- `src/components/features/marketplace/HowItWorks.tsx`
- `src/components/features/marketplace/CommissionPayment.tsx` (QR + botón simular)
- `src/app/(dashboard)/marketplace/page.tsx`
- `src/app/api/payments/webhook/route.ts`

**Modificar:**
- `src/types/database.ts` (+ `PaymentStatus`, `CommissionPayment`)
- `src/lib/marketplace/search.ts` (+ `listProfiles`)
- `src/lib/marketplace/schema.ts` (+ schemas de pago) y `schema.test.ts`
- `src/app/(dashboard)/intercambios/actions.ts` (+ creación de pagos al aceptar, `startCommissionPayment`, `confirmMockPayment`)
- `src/components/features/marketplace/ExchangeRequestCard.tsx` (gate de pago/revelado)
- `src/components/auth/AuthForm.tsx` y `src/app/auth/callback/route.ts` (redirect → `/marketplace`)
- `src/lib/supabase/middleware.ts` (+ `/marketplace`)
- `src/app/(dashboard)/layout.tsx` (enlace Marketplace)
- `src/app/(dashboard)/explorar/page.tsx` (redirect a `/marketplace`)

## Fuera de alcance (futuro)

- PSP real (adaptador queda listo).
- Facturación/NIT de la comisión, reembolsos, reintentos de pago.
- Bloqueo mutuo (desbloqueo conjunto).
- Chat/mensajería, escrow on-chain, notificaciones por email.
- Paginación infinita avanzada / ranking del feed (orden inicial: `created_at` desc o `ayni_score` desc).
