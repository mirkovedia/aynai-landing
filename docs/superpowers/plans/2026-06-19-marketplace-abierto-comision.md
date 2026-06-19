# Marketplace Abierto + Comisión por Conexión — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que al iniciar sesión el usuario caiga en un feed abierto de todas las personas (`/marketplace`), proponga un Ayni, y al aceptarse, cada parte pague una comisión de Bs 20 por QR (proveedor mock enchufable) para desbloquear de forma independiente el contacto del otro.

**Architecture:** Server-rendered sobre la Fase 1. `/marketplace` es un Server Component que lista todos los perfiles (sin email). Se conserva `exchange_requests`; al aceptar se crean dos `commission_payments` pendientes. Los pagos pasan por una interfaz `PaymentProvider` con una implementación `MockQrProvider` (QR simulado + confirmación que emula el webhook del PSP). El revelado de contacto es independiente: cada quien paga y ve al otro.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Supabase (Postgres + RLS), Zod, Vitest, Tailwind CSS.

## Global Constraints

- **Sin dependencias nuevas.** Solo lo ya instalado (Zod, Vitest, lucide-react, Supabase SSR). El QR simulado se renderiza como texto/código, NO como imagen (evita librería de QR).
- **El email NUNCA se expone** en el feed. Reusar `PUBLIC_COLUMNS` = `"id, full_name, ayni_score, bio, skills, location, username, avatar_url, availability, modality, links, created_at"` (sin `email`).
- **Forma de error de las Server Actions:** `{ error: string, code: string, details?: unknown }` (tipo `ActionResult` ya definido en `src/app/(dashboard)/intercambios/actions.ts`).
- **Monto de comisión:** constante `COMMISSION_AMOUNT_BS = 20` en `src/lib/payments/constants.ts`. Nunca hardcodear el número en otro lado.
- **Desbloqueo independiente:** el estado de pago del otro NO condiciona mi revelado. Solo mi propio `commission_payments.status === 'paid'` revela el contacto del otro.
- **UUID en Zod:** reusar el helper `uuid` (regex) ya definido en `src/lib/marketplace/schema.ts`. NO usar `z.string().uuid()`.
- **Gate de tipos:** `npx tsc --noEmit` es el validador real (`next.config.mjs` tiene `typescript.ignoreBuildErrors: true`). Línea base de error preexistente: `src/components/ui/button.tsx:50`. No introducir errores nuevos.
- **Idioma:** UI y comentarios en español; identificadores en inglés.
- **Cliente Supabase:** servidor → `createClient` de `@/lib/supabase/server` (`async`, siempre `await`). Browser → `createClient` de `@/lib/supabase/client`.
- **Botón:** `Button` de `@/components/ui/button`. Variantes: `"primary" | "outline" | "gold" | "ghost"`. Tamaños: `"sm" | "md" | "lg"`. Como `<button>` usar `as="button"` (o sin `as`); como ancla `as="a"`.

---

## File Structure

**Crear:**
- `supabase/migrations/0004_commission.sql` — tabla `commission_payments` + índices + RLS.
- `src/lib/payments/constants.ts` — `COMMISSION_AMOUNT_BS`.
- `src/lib/payments/provider.ts` — interfaz `PaymentProvider` + tipos `Charge`, `CreateChargeInput`.
- `src/lib/payments/mock-provider.ts` — `MockQrProvider`.
- `src/lib/payments/index.ts` — `getPaymentProvider()`.
- `src/lib/payments/mock-provider.test.ts` — tests del mock.
- `src/components/features/marketplace/HowItWorks.tsx` — bloque "Cómo funciona".
- `src/components/features/marketplace/CommissionPayment.tsx` — QR simulado + botones de pago.
- `src/app/(dashboard)/marketplace/page.tsx` — feed (landing post-login).
- `src/app/api/payments/webhook/route.ts` — endpoint de webhook del PSP (real futuro; inerte para mock).

**Modificar:**
- `src/types/database.ts` — añadir `PaymentStatus` y `CommissionPayment`.
- `src/lib/marketplace/search.ts` — añadir `listProfiles`.
- `src/lib/marketplace/schema.ts` — añadir `startCommissionPaymentSchema`, `confirmMockPaymentSchema` + tipos.
- `src/lib/marketplace/schema.test.ts` — tests de los nuevos schemas.
- `src/app/(dashboard)/intercambios/actions.ts` — crear pagos al aceptar + `startCommissionPayment` + `confirmMockPayment`.
- `src/app/(dashboard)/intercambios/page.tsx` — cargar el pago propio de cada intercambio y pasarlo a la card.
- `src/components/features/marketplace/ExchangeRequestCard.tsx` — gate de pago / revelado por pago propio.
- `src/components/auth/AuthForm.tsx:48` — redirect `→ /marketplace`.
- `src/app/auth/callback/route.ts:8` — `next ?? "/marketplace"`.
- `src/lib/supabase/middleware.ts:36` — añadir `/marketplace`.
- `src/app/(dashboard)/layout.tsx` — enlace "Marketplace" → `/marketplace`.
- `src/app/(dashboard)/explorar/page.tsx` — redirect a `/marketplace`.

---

## Task 1: Migración 0004 + tipos de pago + constante

**Files:**
- Create: `supabase/migrations/0004_commission.sql`
- Create: `src/lib/payments/constants.ts`
- Modify: `src/types/database.ts` (al final, después de `ExchangeRequest`)

**Interfaces:**
- Consumes: tabla `exchange_requests(id)` y `profiles(id)` existentes.
- Produces: tabla `commission_payments`; tipos `PaymentStatus`, `CommissionPayment`; constante `COMMISSION_AMOUNT_BS`.

- [ ] **Step 1: Escribir la migración SQL**

Crear `supabase/migrations/0004_commission.sql`:

```sql
create table if not exists public.commission_payments (
  id uuid primary key default gen_random_uuid(),
  exchange_request_id uuid not null references public.exchange_requests(id) on delete cascade,
  payer_id uuid not null references public.profiles(id) on delete cascade,
  amount_bs integer not null,
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  provider text not null default 'mock',
  provider_ref text,
  qr_payload text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (exchange_request_id, payer_id)
);

create index if not exists commission_payer_idx on public.commission_payments(payer_id);
create index if not exists commission_exchange_idx on public.commission_payments(exchange_request_id);
create index if not exists commission_provider_ref_idx on public.commission_payments(provider_ref);

alter table public.commission_payments enable row level security;

-- Cada usuario ve solo sus propios pagos.
drop policy if exists "commission_select_own" on public.commission_payments;
create policy "commission_select_own" on public.commission_payments
  for select to authenticated
  using (payer_id = auth.uid());

-- Cualquiera de las dos partes del intercambio puede crear filas de pago
-- (el destinatario, al aceptar, inserta las filas de ambas partes).
drop policy if exists "commission_insert_party" on public.commission_payments;
create policy "commission_insert_party" on public.commission_payments
  for insert to authenticated
  with check (
    exists (
      select 1 from public.exchange_requests er
      where er.id = exchange_request_id
        and auth.uid() in (er.requester_id, er.recipient_id)
    )
  );

-- Cada usuario solo actualiza su propio pago.
drop policy if exists "commission_update_own" on public.commission_payments;
create policy "commission_update_own" on public.commission_payments
  for update to authenticated
  using (payer_id = auth.uid())
  with check (payer_id = auth.uid());
```

- [ ] **Step 2: Aplicar la migración en Supabase**

Pegar el contenido de `0004_commission.sql` en el SQL Editor del proyecto Supabase (mismo flujo manual que `0003`) y ejecutar. Verificar en Table Editor que `commission_payments` aparece con RLS (candado verde) y 3 políticas.

Expected: tabla creada, 3 políticas, sin errores.

- [ ] **Step 3: Crear la constante de comisión**

Crear `src/lib/payments/constants.ts`:

```typescript
/** Comisión de AynAI por persona, en bolivianos, al concretar una conexión. */
export const COMMISSION_AMOUNT_BS = 20;
```

- [ ] **Step 4: Extender los tipos de TypeScript**

Añadir al final de `src/types/database.ts` (después de `ExchangeRequest`):

```typescript

/** Estado de un pago de comisión. */
export type PaymentStatus = "pending" | "paid" | "failed";

/** Fila de la tabla commission_payments (una por parte por intercambio). */
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

- [ ] **Step 5: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos (solo `button.tsx:50`).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0004_commission.sql src/lib/payments/constants.ts src/types/database.ts
git commit -m "feat: migración 0004 commission_payments + tipos y constante de comisión"
```

---

## Task 2: Proveedor de pago enchufable (mock) — TDD

**Files:**
- Create: `src/lib/payments/provider.ts`
- Create: `src/lib/payments/mock-provider.ts`
- Create: `src/lib/payments/index.ts`
- Test: `src/lib/payments/mock-provider.test.ts`

**Interfaces:**
- Consumes: `PaymentStatus` de `@/types/database`.
- Produces:
  - `interface CreateChargeInput { amountBs: number; reference: string }`
  - `interface Charge { chargeId: string; qrPayload: string; status: PaymentStatus }`
  - `interface PaymentProvider { readonly name: string; createCharge(input: CreateChargeInput): Promise<Charge>; parseWebhook(body: unknown): { chargeId: string; status: PaymentStatus } | null }`
  - `class MockQrProvider implements PaymentProvider`
  - `getPaymentProvider(): PaymentProvider`

- [ ] **Step 1: Escribir la interfaz del proveedor**

Crear `src/lib/payments/provider.ts`:

```typescript
import type { PaymentStatus } from "@/types/database";

export interface CreateChargeInput {
  amountBs: number;
  /** Referencia única del cargo (ej: el id del commission_payments). */
  reference: string;
}

export interface Charge {
  chargeId: string;
  /** Contenido del QR a renderizar (texto). */
  qrPayload: string;
  status: PaymentStatus;
}

/** Abstracción de pasarela de pago. El PSP real (BNB/Tigo/etc.) implementa esta interfaz. */
export interface PaymentProvider {
  readonly name: string;
  createCharge(input: CreateChargeInput): Promise<Charge>;
  /** Verifica el payload de webhook del PSP y devuelve el cargo + estado, o null si es inválido. */
  parseWebhook(body: unknown): { chargeId: string; status: PaymentStatus } | null;
}
```

- [ ] **Step 2: Escribir los tests que fallan**

Crear `src/lib/payments/mock-provider.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { MockQrProvider } from "@/lib/payments/mock-provider";

const provider = new MockQrProvider();

describe("MockQrProvider.createCharge", () => {
  it("devuelve un cargo pendiente con chargeId y qrPayload derivados de la referencia", async () => {
    const charge = await provider.createCharge({ amountBs: 20, reference: "ref-123" });
    expect(charge.status).toBe("pending");
    expect(charge.chargeId).toContain("ref-123");
    expect(charge.qrPayload).toContain("ref-123");
    expect(charge.qrPayload).toContain("20");
  });

  it("es determinístico: misma referencia produce el mismo chargeId", async () => {
    const a = await provider.createCharge({ amountBs: 20, reference: "ref-x" });
    const b = await provider.createCharge({ amountBs: 20, reference: "ref-x" });
    expect(a.chargeId).toBe(b.chargeId);
  });
});

describe("MockQrProvider.parseWebhook", () => {
  it("acepta un body con chargeId y status válidos", () => {
    const r = provider.parseWebhook({ chargeId: "AYNI-MOCK-ref-1", status: "paid" });
    expect(r).toEqual({ chargeId: "AYNI-MOCK-ref-1", status: "paid" });
  });

  it("rechaza un status desconocido", () => {
    expect(provider.parseWebhook({ chargeId: "x", status: "weird" })).toBeNull();
  });

  it("rechaza un body sin chargeId", () => {
    expect(provider.parseWebhook({ status: "paid" })).toBeNull();
  });

  it("rechaza un body que no es objeto", () => {
    expect(provider.parseWebhook("nope")).toBeNull();
  });
});

describe("MockQrProvider.name", () => {
  it("se identifica como 'mock'", () => {
    expect(provider.name).toBe("mock");
  });
});
```

- [ ] **Step 3: Correr los tests para verificar que fallan**

Run: `npx vitest run src/lib/payments/mock-provider.test.ts`
Expected: FAIL — no se puede importar `@/lib/payments/mock-provider`.

- [ ] **Step 4: Implementar el proveedor mock**

Crear `src/lib/payments/mock-provider.ts`:

```typescript
import type { PaymentStatus } from "@/types/database";
import type { Charge, CreateChargeInput, PaymentProvider } from "./provider";

const VALID_STATUS: PaymentStatus[] = ["pending", "paid", "failed"];

/**
 * Proveedor de pago simulado. Genera un "QR" textual determinístico y acepta
 * confirmaciones directas. Reemplazable por el PSP real sin tocar la lógica de negocio.
 */
export class MockQrProvider implements PaymentProvider {
  readonly name = "mock";

  async createCharge({ amountBs, reference }: CreateChargeInput): Promise<Charge> {
    const chargeId = `AYNI-MOCK-${reference}`;
    const qrPayload = `AYNI-MOCK|ref=${reference}|monto=Bs ${amountBs}`;
    return { chargeId, qrPayload, status: "pending" };
  }

  parseWebhook(body: unknown): { chargeId: string; status: PaymentStatus } | null {
    if (typeof body !== "object" || body === null) return null;
    const { chargeId, status } = body as Record<string, unknown>;
    if (typeof chargeId !== "string" || chargeId.length === 0) return null;
    if (typeof status !== "string" || !VALID_STATUS.includes(status as PaymentStatus)) return null;
    return { chargeId, status: status as PaymentStatus };
  }
}
```

- [ ] **Step 5: Implementar el selector de proveedor**

Crear `src/lib/payments/index.ts`:

```typescript
import type { PaymentProvider } from "./provider";
import { MockQrProvider } from "./mock-provider";

const mock = new MockQrProvider();

/** Devuelve el proveedor de pago activo. Hoy: mock. Futuro: selección por env PAYMENT_PROVIDER. */
export const getPaymentProvider = (): PaymentProvider => mock;

export type { PaymentProvider, Charge, CreateChargeInput } from "./provider";
```

- [ ] **Step 6: Correr los tests para verificar que pasan**

Run: `npx vitest run src/lib/payments/mock-provider.test.ts`
Expected: PASS — todos verdes.

- [ ] **Step 7: Commit**

```bash
git add src/lib/payments/provider.ts src/lib/payments/mock-provider.ts src/lib/payments/index.ts src/lib/payments/mock-provider.test.ts
git commit -m "feat: arquitectura de pago enchufable con proveedor mock (QR simulado)"
```

---

## Task 3: Schemas Zod de pago — TDD

**Files:**
- Modify: `src/lib/marketplace/schema.ts`
- Modify: `src/lib/marketplace/schema.test.ts`

**Interfaces:**
- Consumes: helper `uuid` ya definido en `schema.ts`.
- Produces:
  - `startCommissionPaymentSchema` → `StartCommissionPaymentInput = { exchangeRequestId: string }`
  - `confirmMockPaymentSchema` → `ConfirmMockPaymentInput = { chargeId: string }`

- [ ] **Step 1: Añadir los tests que fallan**

Añadir al final de `src/lib/marketplace/schema.test.ts` (e incluir los nuevos nombres en el `import` existente desde `@/lib/marketplace/schema`):

```typescript
import {
  startCommissionPaymentSchema,
  confirmMockPaymentSchema,
} from "@/lib/marketplace/schema";

describe("startCommissionPaymentSchema", () => {
  const uuid = "11111111-1111-1111-1111-111111111111";

  it("acepta un exchangeRequestId uuid", () => {
    expect(startCommissionPaymentSchema.safeParse({ exchangeRequestId: uuid }).success).toBe(true);
  });

  it("rechaza un exchangeRequestId que no es uuid", () => {
    expect(startCommissionPaymentSchema.safeParse({ exchangeRequestId: "x" }).success).toBe(false);
  });
});

describe("confirmMockPaymentSchema", () => {
  it("acepta un chargeId no vacío", () => {
    expect(confirmMockPaymentSchema.safeParse({ chargeId: "AYNI-MOCK-abc" }).success).toBe(true);
  });

  it("rechaza un chargeId vacío", () => {
    expect(confirmMockPaymentSchema.safeParse({ chargeId: "" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run src/lib/marketplace/schema.test.ts`
Expected: FAIL — `startCommissionPaymentSchema` / `confirmMockPaymentSchema` no existen.

- [ ] **Step 3: Implementar los schemas**

Añadir al final de `src/lib/marketplace/schema.ts` (reusando el `uuid` ya definido arriba en el archivo):

```typescript

/** Inicia el pago de la comisión del usuario para un intercambio aceptado. */
export const startCommissionPaymentSchema = z.object({
  exchangeRequestId: uuid,
});

/** Confirma (simula) el pago de un cargo mock. */
export const confirmMockPaymentSchema = z.object({
  chargeId: z.string().min(1),
});

export type StartCommissionPaymentInput = z.infer<typeof startCommissionPaymentSchema>;
export type ConfirmMockPaymentInput = z.infer<typeof confirmMockPaymentSchema>;
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `npx vitest run src/lib/marketplace/schema.test.ts`
Expected: PASS — todos verdes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/marketplace/schema.ts src/lib/marketplace/schema.test.ts
git commit -m "feat: schemas Zod de pago de comisión (iniciar + confirmar mock)"
```

---

## Task 4: Server actions de pago + webhook

**Files:**
- Modify: `src/app/(dashboard)/intercambios/actions.ts`
- Create: `src/app/api/payments/webhook/route.ts`

**Interfaces:**
- Consumes: `startCommissionPaymentSchema`, `confirmMockPaymentSchema` (Task 3); `getPaymentProvider` (Task 2); `COMMISSION_AMOUNT_BS` (Task 1); `CommissionPayment`, `ExchangeRequest` de `@/types/database`; `createClient` de `@/lib/supabase/server`.
- Produces:
  - Modifica `respondToRequest`: al aceptar, inserta dos `commission_payments` `pending`.
  - `startCommissionPayment(input: StartCommissionPaymentInput): Promise<ActionResult & { qrPayload?: string; chargeId?: string }>`
  - `confirmMockPayment(input: ConfirmMockPaymentInput): Promise<ActionResult>`

- [ ] **Step 1: Importar lo nuevo en actions.ts**

En `src/app/(dashboard)/intercambios/actions.ts`, ampliar el import existente de `@/lib/marketplace/schema` para incluir los nuevos schemas y tipos, y añadir imports de pago. El bloque de imports debe quedar así:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createExchangeSchema,
  respondSchema,
  cancelSchema,
  canRespond,
  startCommissionPaymentSchema,
  confirmMockPaymentSchema,
  type CreateExchangeInput,
  type RespondInput,
  type CancelInput,
  type StartCommissionPaymentInput,
  type ConfirmMockPaymentInput,
} from "@/lib/marketplace/schema";
import { getPaymentProvider } from "@/lib/payments";
import { COMMISSION_AMOUNT_BS } from "@/lib/payments/constants";
import type { ExchangeRequest, CommissionPayment } from "@/types/database";
```

- [ ] **Step 2: Crear los pagos al aceptar**

En `respondToRequest`, justo antes de `revalidatePath("/intercambios");` y solo cuando `action === "accept"`, insertar las dos filas de comisión. Reemplazar el bloque final de `respondToRequest` (desde el `update` hasta el `return {}`) por:

```typescript
  const newStatus = action === "accept" ? "accepted" : "rejected";
  const { error: updateError } = await supabase
    .from("exchange_requests")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("recipient_id", user.id);
  if (updateError) {
    console.error("respondToRequest update error:", updateError);
    return { error: "No pudimos actualizar la solicitud", code: "DB_ERROR" };
  }

  // Al aceptar, crear las comisiones pendientes de ambas partes (idempotente por unique).
  if (action === "accept") {
    const provider = getPaymentProvider();
    const { error: paymentsError } = await supabase.from("commission_payments").insert([
      { exchange_request_id: requestId, payer_id: row.requester_id, amount_bs: COMMISSION_AMOUNT_BS, provider: provider.name },
      { exchange_request_id: requestId, payer_id: row.recipient_id, amount_bs: COMMISSION_AMOUNT_BS, provider: provider.name },
    ]);
    if (paymentsError) {
      console.error("respondToRequest payments insert error:", paymentsError);
      // No bloquea la aceptación: las filas pueden crearse luego en startCommissionPayment.
    }
  }

  revalidatePath("/intercambios");
  return {};
```

- [ ] **Step 3: Implementar `startCommissionPayment`**

Añadir al final de `src/app/(dashboard)/intercambios/actions.ts`:

```typescript

/** Inicia (o reanuda) el pago de la comisión del usuario para un intercambio aceptado. */
export const startCommissionPayment = async (
  input: StartCommissionPaymentInput
): Promise<ActionResult & { qrPayload?: string; chargeId?: string }> => {
  const parsed = startCommissionPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado", code: "UNAUTHENTICATED" };

  const { exchangeRequestId } = parsed.data;

  // El intercambio debe existir, el usuario ser parte y estar aceptado.
  const { data: exchange } = await supabase
    .from("exchange_requests")
    .select("*")
    .eq("id", exchangeRequestId)
    .maybeSingle<ExchangeRequest>();
  if (!exchange) return { error: "Solicitud no encontrada", code: "NOT_FOUND" };
  if (![exchange.requester_id, exchange.recipient_id].includes(user.id)) {
    return { error: "No eres parte de este intercambio", code: "FORBIDDEN" };
  }
  if (exchange.status !== "accepted") {
    return { error: "El intercambio aún no está aceptado", code: "NOT_ACCEPTED" };
  }

  // Buscar el pago propio (lo crea respondToRequest; si faltara, se crea aquí).
  let { data: payment } = await supabase
    .from("commission_payments")
    .select("*")
    .eq("exchange_request_id", exchangeRequestId)
    .eq("payer_id", user.id)
    .maybeSingle<CommissionPayment>();

  if (payment?.status === "paid") {
    return { error: "Ya pagaste esta comisión", code: "ALREADY_PAID" };
  }

  const provider = getPaymentProvider();

  if (!payment) {
    const { data: created, error: insertError } = await supabase
      .from("commission_payments")
      .insert({ exchange_request_id: exchangeRequestId, payer_id: user.id, amount_bs: COMMISSION_AMOUNT_BS, provider: provider.name })
      .select("*")
      .single<CommissionPayment>();
    if (insertError || !created) {
      console.error("startCommissionPayment insert error:", insertError);
      return { error: "No pudimos iniciar el pago", code: "DB_ERROR" };
    }
    payment = created;
  }

  // Reusar el cargo si ya existe; si no, crearlo con el proveedor.
  if (payment.provider_ref && payment.qr_payload) {
    return { qrPayload: payment.qr_payload, chargeId: payment.provider_ref };
  }

  const charge = await provider.createCharge({ amountBs: payment.amount_bs, reference: payment.id });

  const { error: chargeError } = await supabase
    .from("commission_payments")
    .update({ provider_ref: charge.chargeId, qr_payload: charge.qrPayload })
    .eq("id", payment.id)
    .eq("payer_id", user.id);
  if (chargeError) {
    console.error("startCommissionPayment charge update error:", chargeError);
    return { error: "No pudimos generar el cobro", code: "PAYMENT_PROVIDER_ERROR" };
  }

  return { qrPayload: charge.qrPayload, chargeId: charge.chargeId };
};
```

- [ ] **Step 4: Implementar `confirmMockPayment`**

Añadir al final de `src/app/(dashboard)/intercambios/actions.ts`:

```typescript

/** Confirma (simula) el pago de la comisión del usuario. En producción esto lo hará el webhook del PSP. */
export const confirmMockPayment = async (
  input: ConfirmMockPaymentInput
): Promise<ActionResult> => {
  const parsed = confirmMockPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado", code: "UNAUTHENTICATED" };

  const { chargeId } = parsed.data;

  const { data: payment } = await supabase
    .from("commission_payments")
    .select("*")
    .eq("provider_ref", chargeId)
    .eq("payer_id", user.id)
    .maybeSingle<CommissionPayment>();
  if (!payment) return { error: "Cobro no encontrado", code: "NOT_FOUND" };
  if (payment.status === "paid") return {};

  const { error: updateError } = await supabase
    .from("commission_payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", payment.id)
    .eq("payer_id", user.id);
  if (updateError) {
    console.error("confirmMockPayment update error:", updateError);
    return { error: "No pudimos confirmar el pago", code: "DB_ERROR" };
  }

  revalidatePath("/intercambios");
  return {};
};
```

- [ ] **Step 5: Implementar el endpoint de webhook (PSP real, futuro)**

Crear `src/app/api/payments/webhook/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";

/**
 * Webhook del PSP: el proveedor real notifica aquí el resultado del cobro.
 * Para el proveedor mock, la confirmación se hace vía confirmMockPayment (server action),
 * así que este endpoint queda listo pero no se usa hasta conectar un PSP real.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido", code: "INVALID_BODY" }, { status: 400 });
  }

  const provider = getPaymentProvider();
  const parsed = provider.parseWebhook(body);
  if (!parsed) {
    return NextResponse.json({ error: "Webhook inválido", code: "INVALID_WEBHOOK" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("commission_payments")
    .update({
      status: parsed.status,
      paid_at: parsed.status === "paid" ? new Date().toISOString() : null,
    })
    .eq("provider_ref", parsed.chargeId);
  if (error) {
    console.error("payments webhook update error:", error);
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(dashboard)/intercambios/actions.ts" "src/app/api/payments/webhook/route.ts"
git commit -m "feat: server actions de comisión (crear al aceptar, iniciar, confirmar) + webhook"
```

---

## Task 5: CommissionPayment + gate en ExchangeRequestCard + página

**Files:**
- Create: `src/components/features/marketplace/CommissionPayment.tsx`
- Modify: `src/components/features/marketplace/ExchangeRequestCard.tsx`
- Modify: `src/app/(dashboard)/intercambios/page.tsx`

**Interfaces:**
- Consumes: `startCommissionPayment`, `confirmMockPayment` (Task 4); `CommissionPayment`, `PaymentStatus` de `@/types/database`; `Button`.
- Produces:
  - `CommissionPayment({ exchangeRequestId, counterpartName, amountBs })` (componente cliente).
  - `ExchangeRequestCard` acepta una nueva prop `myPayment: CommissionPayment | null`.

- [ ] **Step 1: Implementar el componente de pago**

Crear `src/components/features/marketplace/CommissionPayment.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { startCommissionPayment, confirmMockPayment } from "@/app/(dashboard)/intercambios/actions";

interface CommissionPaymentProps {
  exchangeRequestId: string;
  counterpartName: string;
  amountBs: number;
}

/** Flujo de pago de la comisión: genera un QR simulado y permite confirmarlo (mock). */
export const CommissionPayment = ({ exchangeRequestId, counterpartName, amountBs }: CommissionPaymentProps) => {
  const router = useRouter();
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [chargeId, setChargeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleStart = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await startCommissionPayment({ exchangeRequestId });
      if (result.error) {
        setError(result.error);
        return;
      }
      setQrPayload(result.qrPayload ?? null);
      setChargeId(result.chargeId ?? null);
    } catch {
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!chargeId) return;
    setError(null);
    setBusy(true);
    try {
      const result = await confirmMockPayment({ chargeId });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-gold/40 bg-gold/5 p-4 text-sm">
      <p className="font-semibold text-cocoa">
        Paga tu comisión (Bs {amountBs}) para ver el contacto de {counterpartName}.
      </p>

      {error && <p className="mt-2 text-sm text-red">{error}</p>}

      {!qrPayload ? (
        <Button as="button" type="button" size="sm" className="mt-3" disabled={busy} onClick={handleStart}>
          {busy ? "Generando..." : `Pagar comisión (Bs ${amountBs})`}
        </Button>
      ) : (
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-xs text-cocoa/60">Escanea este QR (simulado) para pagar:</p>
            <pre className="mt-1 overflow-x-auto rounded-xl border border-cream-300 bg-white px-3 py-3 text-xs text-cocoa">{qrPayload}</pre>
          </div>
          <Button as="button" type="button" size="sm" disabled={busy} onClick={handleConfirm}>
            {busy ? "Confirmando..." : "Ya pagué (simular)"}
          </Button>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Añadir la prop `myPayment` y el gate en ExchangeRequestCard**

En `src/components/features/marketplace/ExchangeRequestCard.tsx`:

1. Ampliar imports: añadir `CommissionPayment` y el tipo `CommissionPayment as CommissionPaymentRow`:

```typescript
import { CommissionPayment } from "./CommissionPayment";
import type { ExchangeRequest, ExchangeStatus, ProfileLinks, CommissionPayment as CommissionPaymentRow } from "@/types/database";
```

2. Añadir `myPayment` a las props:

```typescript
interface ExchangeRequestCardProps {
  request: ExchangeRequest;
  /** "received" = soy el destinatario; "sent" = yo la envié. */
  role: "received" | "sent";
  counterpart: ExchangeParty;
  /** Mi pago de comisión para este intercambio (null si aún no existe). */
  myPayment: CommissionPaymentRow | null;
}
```

3. Actualizar la firma del componente: `export const ExchangeRequestCard = ({ request, role, counterpart, myPayment }: ExchangeRequestCardProps) => {`

4. Reemplazar el bloque de revelado actual (el que empieza con `{/* Al aceptar, revelar links de contacto ... */}` y su `{request.status === "accepted" && ( ... )}`) por este gate:

```typescript
      {/* Conexión concretada: revelar contacto solo si YO pagué mi comisión (desbloqueo independiente). */}
      {request.status === "accepted" && (
        myPayment?.status === "paid" ? (
          <div className="mt-4 rounded-2xl border border-green/30 bg-green/5 p-4 text-sm">
            <p className="font-semibold text-cocoa">Contacto de {name}:</p>
            {hasLinks ? (
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-cocoa/80">
                {counterpart.links?.web && <li><a className="hover:underline" href={counterpart.links.web} target="_blank" rel="noopener noreferrer">Web</a></li>}
                {counterpart.links?.linkedin && <li><a className="hover:underline" href={counterpart.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></li>}
                {counterpart.links?.github && <li><a className="hover:underline" href={counterpart.links.github} target="_blank" rel="noopener noreferrer">GitHub</a></li>}
                {counterpart.links?.x && <li><a className="hover:underline" href={counterpart.links.x} target="_blank" rel="noopener noreferrer">X</a></li>}
              </ul>
            ) : (
              <p className="mt-1 text-cocoa/60">
                {counterpart.username
                  ? <>Visita su perfil: <a className="font-semibold text-red hover:underline" href={`/u/${counterpart.username}`}>@{counterpart.username}</a></>
                  : "Esta persona aún no agregó enlaces de contacto."}
              </p>
            )}
          </div>
        ) : (
          <CommissionPayment
            exchangeRequestId={request.id}
            counterpartName={name}
            amountBs={myPayment?.amount_bs ?? 20}
          />
        )
      )}
```

- [ ] **Step 3: Cargar el pago propio en la página de intercambios**

En `src/app/(dashboard)/intercambios/page.tsx`:

1. Ampliar el import de tipos: `import type { ExchangeRequest, CommissionPayment } from "@/types/database";`

2. Después de construir `partyById` (y antes de `const tabClass = ...`), añadir la carga de pagos propios:

```typescript
  // Mis pagos de comisión para los intercambios visibles (para el gate de revelado).
  const rowIds = rows.map((r) => r.id);
  const { data: myPayments } = await supabase
    .from("commission_payments")
    .select("*")
    .eq("payer_id", user.id)
    .in("exchange_request_id", rowIds.length > 0 ? rowIds : ["00000000-0000-0000-0000-000000000000"])
    .returns<CommissionPayment[]>();
  const paymentByExchange = new Map((myPayments ?? []).map((p) => [p.exchange_request_id, p]));
```

3. En el `.map` que renderiza las cards, pasar la prop `myPayment`:

```typescript
            return (
              <ExchangeRequestCard
                key={request.id}
                request={request}
                role={activeTab}
                counterpart={party}
                myPayment={paymentByExchange.get(request.id) ?? null}
              />
            );
```

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/marketplace/CommissionPayment.tsx src/components/features/marketplace/ExchangeRequestCard.tsx "src/app/(dashboard)/intercambios/page.tsx"
git commit -m "feat: gate de comisión en intercambios (pago propio revela contacto)"
```

---

## Task 6: Helper listProfiles + HowItWorks + página /marketplace

**Files:**
- Modify: `src/lib/marketplace/search.ts`
- Create: `src/components/features/marketplace/HowItWorks.tsx`
- Create: `src/app/(dashboard)/marketplace/page.tsx`

**Interfaces:**
- Consumes: `createClient` de `@/lib/supabase/server`; `PublicProfile` de `@/components/features/profile/ProfileCard`; `UserSkill` de `@/types/database`; `SearchResult` (ya en `search.ts`); `ResultsGrid`, `SearchFilters` (Fase 1); `COMMISSION_AMOUNT_BS` (Task 1).
- Produces: `listProfiles(filters): Promise<SearchResult[]>` con `filters = { excludeUserId: string; kind?: "offer" | "seek"; loc?: string; avail?: string; limit?: number; offset?: number }`.

- [ ] **Step 1: Añadir `listProfiles` a search.ts**

Añadir al final de `src/lib/marketplace/search.ts` (reusa `PUBLIC_COLUMNS` y los tipos del archivo):

```typescript

export interface ListProfilesInput {
  excludeUserId: string;
  kind?: "offer" | "seek";
  loc?: string;
  avail?: string;
  limit?: number;
  offset?: number;
}

/**
 * Lista perfiles para el feed abierto (sin email), ordenados por ayni_score desc.
 * Sin filtro = todos. Con kind se exige que el perfil tenga al menos una skill de ese tipo.
 */
export const listProfiles = async (filters: ListProfilesInput): Promise<SearchResult[]> => {
  const { excludeUserId, kind, loc, avail, limit = 50, offset = 0 } = filters;
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select(kind ? `${PUBLIC_COLUMNS}, user_skills!inner(id)` : PUBLIC_COLUMNS)
    .neq("id", excludeUserId)
    .order("ayni_score", { ascending: false })
    .range(offset, offset + limit - 1);

  if (kind) query = query.eq("user_skills.kind", kind);
  if (loc?.trim()) query = query.ilike("location", `%${loc.trim()}%`);
  if (avail) query = query.eq("availability", avail);

  const { data: matches, error } = await query.returns<PublicProfile[]>();
  if (error) {
    console.error("listProfiles error:", error);
    return [];
  }
  if (!matches || matches.length === 0) return [];

  // Deduplica por id (el join por kind puede repetir filas).
  const byId = new Map<string, PublicProfile>();
  for (const p of matches) byId.set(p.id, p);
  const profiles = [...byId.values()];

  const ids = profiles.map((p) => p.id);
  const { data: allSkills } = await supabase
    .from("user_skills")
    .select("*")
    .in("user_id", ids)
    .returns<UserSkill[]>();

  const skillsByUser = new Map<string, UserSkill[]>();
  for (const s of allSkills ?? []) {
    const list = skillsByUser.get(s.user_id) ?? [];
    list.push(s);
    skillsByUser.set(s.user_id, list);
  }

  return profiles.map((profile) => ({
    profile,
    skills: skillsByUser.get(profile.id) ?? [],
  }));
};
```

- [ ] **Step 2: Implementar el bloque "Cómo funciona"**

Crear `src/components/features/marketplace/HowItWorks.tsx`:

```typescript
interface HowItWorksProps {
  amountBs: number;
}

const steps = [
  { n: 1, title: "Explora", desc: "Mira a todas las personas y sus habilidades." },
  { n: 2, title: "Propón un Ayni", desc: "Elige qué ofreces y qué quieres de alguien." },
  { n: 3, title: "Acepta", desc: "Si la otra parte acepta, se concreta la conexión." },
];

/** Explica el flujo del marketplace y la comisión por conexión. */
export const HowItWorks = ({ amountBs }: HowItWorksProps) => (
  <section className="rounded-3xl border border-cream-300 bg-white p-6 shadow-sm">
    <h2 className="font-serif text-xl font-bold text-cocoa">Cómo funciona</h2>
    <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((s) => (
        <li key={s.n} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cocoa text-sm font-bold text-cream">
            {s.n}
          </span>
          <div>
            <p className="text-sm font-semibold text-cocoa">{s.title}</p>
            <p className="text-xs text-cocoa/60">{s.desc}</p>
          </div>
        </li>
      ))}
      <li className="flex gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red text-sm font-bold text-cream">
          4
        </span>
        <div>
          <p className="text-sm font-semibold text-cocoa">Paga y conecta</p>
          <p className="text-xs text-cocoa/60">
            Ambas partes pagan Bs {amountBs} y se revela el contacto para coordinar.
          </p>
        </div>
      </li>
    </ol>
  </section>
);
```

- [ ] **Step 3: Implementar la página /marketplace**

Crear `src/app/(dashboard)/marketplace/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SearchFilters } from "@/components/features/marketplace/SearchFilters";
import { ResultsGrid } from "@/components/features/marketplace/ResultsGrid";
import { HowItWorks } from "@/components/features/marketplace/HowItWorks";
import { listProfiles, searchProfiles } from "@/lib/marketplace/search";
import { COMMISSION_AMOUNT_BS } from "@/lib/payments/constants";
import type { UserSkill } from "@/types/database";

interface PageProps {
  searchParams: Promise<{ q?: string; kind?: string; loc?: string; avail?: string }>;
}

/** Feed abierto del marketplace. Landing post-login: lista a todas las personas. */
export default async function MarketplacePage({ searchParams }: PageProps) {
  const { q, kind, loc, avail } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Skills que YO ofrezco (para precargar el formulario de propuesta).
  const { data: mySkills } = await supabase
    .from("user_skills")
    .select("*")
    .eq("user_id", user.id)
    .eq("kind", "offer")
    .returns<UserSkill[]>();
  const myOffers = (mySkills ?? []).map((s) => s.name);

  const normalizedKind = kind === "offer" || kind === "seek" ? kind : undefined;

  // Con búsqueda por habilidad → searchProfiles; sin búsqueda → feed completo.
  const results = q?.trim()
    ? await searchProfiles({ q, kind: normalizedKind, loc, avail, excludeUserId: user.id })
    : await listProfiles({ excludeUserId: user.id, kind: normalizedKind, loc, avail });

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <h1 className="font-serif text-4xl font-bold text-cocoa">Marketplace</h1>
      <p className="mt-2 text-sm text-cocoa/60">
        Descubre personas, propón un Ayni y conecta.
      </p>

      <div className="mt-8">
        <HowItWorks amountBs={COMMISSION_AMOUNT_BS} />
      </div>

      <div className="mt-8">
        <SearchFilters />
      </div>

      <ResultsGrid results={results} myOffers={myOffers} />
    </main>
  );
}
```

> Nota: `SearchFilters` (Fase 1) escribe los filtros en `/explorar`. Se corrige en Task 7 Step 5 para que apunte a `/marketplace`.

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 5: Commit**

```bash
git add src/lib/marketplace/search.ts src/components/features/marketplace/HowItWorks.tsx "src/app/(dashboard)/marketplace/page.tsx"
git commit -m "feat: feed abierto /marketplace (listProfiles + cómo funciona)"
```

---

## Task 7: Cableado — redirects, middleware, navegación

**Files:**
- Modify: `src/components/auth/AuthForm.tsx:48`
- Modify: `src/app/auth/callback/route.ts:8`
- Modify: `src/lib/supabase/middleware.ts:36`
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/app/(dashboard)/explorar/page.tsx`
- Modify: `src/components/features/marketplace/SearchFilters.tsx`

**Interfaces:**
- Consumes: ruta `/marketplace` (Task 6).
- Produces: nada (cableado final).

- [ ] **Step 1: Redirigir el login al marketplace**

En `src/components/auth/AuthForm.tsx`, reemplazar:

```typescript
    router.push("/dashboard");
```

por:

```typescript
    router.push("/marketplace");
```

- [ ] **Step 2: Redirigir el callback OAuth al marketplace**

En `src/app/auth/callback/route.ts`, reemplazar:

```typescript
  const next = searchParams.get("next") ?? "/dashboard";
```

por:

```typescript
  const next = searchParams.get("next") ?? "/marketplace";
```

- [ ] **Step 3: Proteger /marketplace en el middleware**

En `src/lib/supabase/middleware.ts`, reemplazar la línea 36:

```typescript
  const protectedPaths = ["/dashboard", "/perfil", "/u", "/explorar", "/intercambios"];
```

por:

```typescript
  const protectedPaths = ["/dashboard", "/perfil", "/u", "/explorar", "/intercambios", "/marketplace"];
```

- [ ] **Step 4: Actualizar el enlace de navegación**

En `src/app/(dashboard)/layout.tsx`, reemplazar el enlace de "Explorar":

```typescript
              <Link href="/explorar" className="text-sm font-medium text-cocoa/75 transition-colors hover:text-red">
                Explorar
              </Link>
```

por:

```typescript
              <Link href="/marketplace" className="text-sm font-medium text-cocoa/75 transition-colors hover:text-red">
                Marketplace
              </Link>
```

- [ ] **Step 5: Apuntar SearchFilters a /marketplace**

En `src/components/features/marketplace/SearchFilters.tsx`, reemplazar:

```typescript
      router.replace(`/explorar?${next.toString()}`);
```

por:

```typescript
      router.replace(`/marketplace?${next.toString()}`);
```

- [ ] **Step 6: Convertir /explorar en redirect**

Reemplazar el contenido completo de `src/app/(dashboard)/explorar/page.tsx` por:

```typescript
import { redirect } from "next/navigation";

/** /explorar quedó absorbido por el feed abierto. Redirige preservando los filtros. */
export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; loc?: string; avail?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.kind) qs.set("kind", params.kind);
  if (params.loc) qs.set("loc", params.loc);
  if (params.avail) qs.set("avail", params.avail);
  const query = qs.toString();
  redirect(query ? `/marketplace?${query}` : "/marketplace");
}
```

- [ ] **Step 7: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 8: Verificación manual del flujo completo**

Run: `npm run dev`

Con dos cuentas (A y B):
1. Con B: en `/perfil/editar` agregar links de contacto y skills (ofrece "Diseño").
2. Con A: iniciar sesión → debe caer en `/marketplace` y ver a B en el feed (sin búsqueda, sin email).
3. Con A: "Proponer Ayni" a B → enviar.
4. Con B: badge en "Intercambios" → `/intercambios` → Aceptar.
5. Con A y con B: en la tarjeta aceptada aparece "Paga tu comisión (Bs 20)..." → Pagar → ver QR simulado → "Ya pagué (simular)".
6. Verificar desbloqueo independiente: en cuanto A paga, A ve el contacto de B aunque B no haya pagado; y viceversa.

Expected: login cae en el feed; el email nunca aparece; cada quien revela el contacto solo tras pagar su propia comisión.

- [ ] **Step 9: Commit**

```bash
git add src/components/auth/AuthForm.tsx src/app/auth/callback/route.ts src/lib/supabase/middleware.ts "src/app/(dashboard)/layout.tsx" "src/app/(dashboard)/explorar/page.tsx" src/components/features/marketplace/SearchFilters.tsx
git commit -m "feat: marketplace como landing (redirects, navegación y absorción de /explorar)"
```

---

## Verificación final (después de todas las tareas)

- [ ] `npx vitest run` — todos los tests verdes (perfil, marketplace, payments).
- [ ] `npx tsc --noEmit` — solo el error preexistente de `button.tsx:50`.
- [ ] Flujo manual del Task 7 Step 8 completo y confirmado.
- [ ] Migración `0004_commission.sql` aplicada en Supabase (Task 1 Step 2).

---

## Notas de cierre

- **Fuera de alcance (futuro):** PSP real (el adaptador queda listo en `src/lib/payments/`), facturación/NIT, reembolsos, desbloqueo conjunto, chat, escrow on-chain, paginación infinita.
- Al integrar la rama, usar la skill `superpowers:finishing-a-development-branch`.
```
