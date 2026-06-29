# Capa de Confianza y Notificaciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar el bucle del MVP de AynAI con ciclo de vida completo del intercambio, reputación (ratings), AynAI Score real y notificaciones in-app + email.

**Architecture:** Postgres es la fuente de verdad: el completado y el recálculo del score viven en triggers/funciones `security definer`. Las server actions existentes mutan datos y, en la misma operación, crean notificaciones vía RPC. El cliente usa Supabase Realtime solo para transportar notificaciones nuevas. La UI reusa los primitivos ya existentes (Toast, ConfirmDialog, Button con loading).

**Tech Stack:** Next.js 15 (App Router, Server Components + server actions), React 19, TypeScript strict, Supabase (Postgres + RLS + Realtime), Zod 4, Vitest, Resend (email), Tailwind.

## Global Constraints

- TypeScript strict; nunca `any` — usar `unknown` + type guards.
- Comentarios y mensajes de commit en español; identificadores en inglés.
- Named exports salvo páginas/layouts de Next.js (default export).
- Server Components por defecto; `"use client"` solo con hooks/eventos/browser APIs.
- Migraciones SQL **idempotentes** (se pueden re-ejecutar): usar `if not exists`, `drop policy if exists ... create policy`, `create or replace function`.
- RLS SIEMPRE habilitada en tablas con datos de usuario.
- `src/types/database.ts` se mantiene a mano (no generado) — actualizar en cada cambio de schema.
- Validar toda entrada de server action con Zod.
- Verde antes de cada commit: `npx tsc --noEmit`, `npx vitest run`, `npm run build`.
- Rama de trabajo: `feat/mvp-confianza-notificaciones`.
- Comisión: `COMMISSION_AMOUNT_BS` en `src/lib/payments/constants.ts` (no hardcodear).
- Paleta Tailwind del proyecto: `cocoa`, `cream`, `cream-200/300`, `green`, `red`, `gold`.

---

## File Structure

**Migraciones (nuevas):**
- `supabase/migrations/0005_exchange_lifecycle.sql` — flags de confirmación, `completed_at`, status `completed`, trigger de completado.
- `supabase/migrations/0006_ratings.sql` — tabla `ratings` + RLS.
- `supabase/migrations/0007_score.sql` — función `recalc_ayni_score` + triggers + default 600 + backfill.
- `supabase/migrations/0008_notifications.sql` — tabla `notifications` + RLS + RPC `create_notification` + publicación Realtime.
- `supabase/seed.sql` — perfiles demo (cold-start).

**Lógica/tipos:**
- `src/types/database.ts` — MODIFICAR (nuevos campos/tablas/tipos).
- `src/lib/marketplace/schema.ts` — MODIFICAR (schemas `confirmExchange`, `submitRating`, helper `canConfirm`).
- `src/lib/scoring/compute.ts` — CREAR (espejo TS de la fórmula, para el desglose del dashboard).
- `src/lib/scoring/compute.test.ts` — CREAR.
- `src/lib/notifications/index.ts` — CREAR (`notify`, tipos de evento).
- `src/lib/notifications/email.ts` — CREAR (plantillas Resend).
- `src/lib/notifications/templates.test.ts` — CREAR.

**Server actions:**
- `src/app/(dashboard)/intercambios/actions.ts` — MODIFICAR (`confirmExchange`, `submitRating`, cableado de `notify` en acciones existentes).

**UI:**
- `src/app/(dashboard)/dashboard/page.tsx` — MODIFICAR (quitar waitlist, score real + desglose, banner onboarding).
- `src/app/(dashboard)/layout.tsx` — MODIFICAR (montar `NotificationBell`).
- `src/app/(dashboard)/intercambios/page.tsx` — MODIFICAR (cargar mis ratings emitidos para el gate del formulario).
- `src/components/features/marketplace/ExchangeRequestCard.tsx` — MODIFICAR (botón completar, formulario de rating).
- `src/components/features/profile/ProfileCard.tsx` — MODIFICAR (mostrar ratings recibidos).
- `src/app/u/[username]/page.tsx` — MODIFICAR (cargar ratings recibidos).
- `src/components/ui/star-rating.tsx` — CREAR (display + input de estrellas).
- `src/components/features/marketplace/RatingForm.tsx` — CREAR (formulario de calificación).
- `src/components/features/notifications/NotificationBell.tsx` — CREAR (badge + panel + Realtime).

**Config:**
- `.env.example` — MODIFICAR (`RESEND_API_KEY`).
- `package.json` — MODIFICAR (dependencia `resend`).

---

## FASE 1 — Limpieza (waitlist)

### Task 1: Quitar `waitlist` del dashboard

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: dashboard sin dependencia de `waitlist` ni de `WaitlistEntry`.

- [ ] **Step 1: Quitar la query de waitlist y el bloque de UI**

En `src/app/(dashboard)/dashboard/page.tsx`:
1. Borrar el import de `WaitlistEntry`, dejando: `import type { Profile } from "@/types/database";`
2. Borrar el bloque de query de waitlist (`const { data: waitlist } = ...`) y la línea `const entries = waitlist ?? [];`
3. Borrar el `<div>` completo "Waitlist real desde Supabase" (desde `{/* Waitlist real desde Supabase */}` hasta su `</div>` de cierre).
4. Actualizar el comentario JSDoc del componente a: `/** Dashboard de perfil: datos del usuario + AynAI Score. */`

- [ ] **Step 2: Verificar typecheck y build**

Run: `npx tsc --noEmit`
Expected: exit 0 (sin error de `entries`/`WaitlistEntry` sin uso).

Run: `npm run build`
Expected: build OK, ruta `/dashboard` presente.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/dashboard/page.tsx"
git commit -m "refactor: quita waitlist legacy del dashboard"
```

---

## FASE 2 — Ciclo de vida + Ratings

### Task 2: Migración del ciclo de vida del intercambio

**Files:**
- Create: `supabase/migrations/0005_exchange_lifecycle.sql`
- Modify: `src/types/database.ts`

**Interfaces:**
- Produces: columnas `requester_confirmed`, `recipient_confirmed`, `completed_at` y status `completed` en `exchange_requests`; tipo `ExchangeStatus` incluye `"completed"`; `ExchangeRequest` incluye los nuevos campos.

- [ ] **Step 1: Crear la migración**

Crear `supabase/migrations/0005_exchange_lifecycle.sql`:

```sql
-- AynAI — ciclo de vida del intercambio: confirmación mutua y estado 'completed'.
-- Idempotente.

alter table public.exchange_requests
  add column if not exists requester_confirmed boolean not null default false,
  add column if not exists recipient_confirmed boolean not null default false,
  add column if not exists completed_at timestamptz;

-- Ampliar el CHECK de status para incluir 'completed'.
alter table public.exchange_requests
  drop constraint if exists exchange_requests_status_check;
alter table public.exchange_requests
  add constraint exchange_requests_status_check
  check (status in ('pending','accepted','rejected','cancelled','completed'));

-- Trigger: cuando ambas partes confirman, el intercambio pasa a 'completed'.
create or replace function public.handle_exchange_completion()
returns trigger
language plpgsql
as $$
begin
  if new.requester_confirmed and new.recipient_confirmed
     and new.status <> 'completed' then
    new.status := 'completed';
    new.completed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_exchange_confirm on public.exchange_requests;
create trigger on_exchange_confirm
  before update on public.exchange_requests
  for each row execute function public.handle_exchange_completion();
```

- [ ] **Step 2: Aplicar la migración en Supabase**

Aplicar el SQL en la base (SQL Editor de Supabase o `supabase db push` según el flujo del proyecto). Verificar que `exchange_requests` tiene las 3 columnas nuevas y el constraint actualizado.

- [ ] **Step 3: Actualizar tipos**

En `src/types/database.ts`:
1. Cambiar `export type ExchangeStatus = "pending" | "accepted" | "rejected" | "cancelled";`
   por `export type ExchangeStatus = "pending" | "accepted" | "rejected" | "cancelled" | "completed";`
2. En `interface ExchangeRequest`, agregar antes de `created_at`:
```typescript
  requester_confirmed: boolean;
  recipient_confirmed: boolean;
  completed_at: string | null;
```

- [ ] **Step 4: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0005_exchange_lifecycle.sql src/types/database.ts
git commit -m "feat: ciclo de vida del intercambio con confirmación mutua (migración + tipos)"
```

---

### Task 3: Server action `confirmExchange` + helper

**Files:**
- Modify: `src/lib/marketplace/schema.ts`
- Modify: `src/app/(dashboard)/intercambios/actions.ts`

**Interfaces:**
- Consumes: `ExchangeRequest`, `ActionResult`, `createClient`.
- Produces: `confirmExchangeSchema`, `ConfirmExchangeInput` (`{ requestId: string }`), `canConfirm(status): boolean`, y la action `confirmExchange(input): Promise<ActionResult>`.

- [ ] **Step 1: Agregar schema y helper**

En `src/lib/marketplace/schema.ts`, después del bloque de `cancelSchema`:

```typescript
/** Confirmación de completado por una de las partes. */
export const confirmExchangeSchema = z.object({
  requestId: uuid,
});
export type ConfirmExchangeInput = z.infer<typeof confirmExchangeSchema>;

/** Solo se puede confirmar el completado de un intercambio 'accepted'. */
export const canConfirm = (status: ExchangeStatus): boolean => status === "accepted";
```

- [ ] **Step 2: Agregar la action `confirmExchange`**

En `src/app/(dashboard)/intercambios/actions.ts`:
1. Añadir al import de `@/lib/marketplace/schema`: `confirmExchangeSchema`, `canConfirm`, `type ConfirmExchangeInput`.
2. Añadir la action al final del archivo:

```typescript
/** Una de las partes confirma que el intercambio se concretó. Cuando ambas confirman, el trigger lo marca 'completed'. */
export const confirmExchange = async (input: ConfirmExchangeInput): Promise<ActionResult> => {
  const parsed = confirmExchangeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado", code: "UNAUTHENTICATED" };

  const { requestId } = parsed.data;

  const { data: row } = await supabase
    .from("exchange_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle<ExchangeRequest>();
  if (!row) return { error: "Solicitud no encontrada", code: "NOT_FOUND" };

  const isRequester = row.requester_id === user.id;
  const isRecipient = row.recipient_id === user.id;
  if (!isRequester && !isRecipient) {
    return { error: "No eres parte de este intercambio", code: "FORBIDDEN" };
  }
  if (!canConfirm(row.status)) {
    return { error: "Este intercambio no se puede confirmar todavía", code: "INVALID_STATE" };
  }

  const patch = isRequester ? { requester_confirmed: true } : { recipient_confirmed: true };
  const { error: updateError } = await supabase
    .from("exchange_requests")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (updateError) {
    console.error("confirmExchange update error:", updateError);
    return { error: "No pudimos confirmar el intercambio", code: "DB_ERROR" };
  }

  revalidatePath("/intercambios");
  return {};
};
```

- [ ] **Step 3: Verificar typecheck, tests y build**

Run: `npx tsc --noEmit` → exit 0.
Run: `npx vitest run` → 35 tests OK (sin regresión).
Run: `npm run build` → OK.

- [ ] **Step 4: Commit**

```bash
git add src/lib/marketplace/schema.ts "src/app/(dashboard)/intercambios/actions.ts"
git commit -m "feat: action confirmExchange para confirmación mutua del intercambio"
```

---

### Task 4: UI de confirmación de completado en la tarjeta

**Files:**
- Modify: `src/components/features/marketplace/ExchangeRequestCard.tsx`

**Interfaces:**
- Consumes: `confirmExchange` de `intercambios/actions`, `request.status`, `request.requester_confirmed`, `request.recipient_confirmed`, `role`.
- Produces: UI para confirmar completado; badge/label `completed`.

- [ ] **Step 1: Añadir label y color del estado `completed`**

En `ExchangeRequestCard.tsx`:
1. En `statusLabel` agregar: `completed: "Completado",`
2. En `statusColor` agregar: `completed: "bg-green/15 text-green",`
3. En el import de actions agregar `confirmExchange`:
```typescript
import { respondToRequest, cancelRequest, confirmExchange } from "@/app/(dashboard)/intercambios/actions";
```

- [ ] **Step 2: Añadir el bloque de confirmación de completado**

En `ExchangeRequestCard.tsx`, calcular si yo ya confirmé y renderizar el bloque. Dentro del componente, después de `const hasLinks = ...`, agregar:

```typescript
  const iConfirmed = role === "received" ? request.recipient_confirmed : request.requester_confirmed;
```

Luego, justo después del bloque `{request.status === "accepted" && ( ... )}` (el de pago/revelado) y antes de `{request.status === "pending" && (`, insertar:

```tsx
      {request.status === "accepted" && (
        <div className="mt-4 border-t border-cream-200 pt-4">
          {iConfirmed ? (
            <p className="text-sm text-cocoa/60">⏳ Esperando que {name} confirme el intercambio.</p>
          ) : (
            <Button
              as="button"
              type="button"
              size="sm"
              variant="ghost"
              loading={busy}
              onClick={() => run(() => confirmExchange({ requestId: request.id }), "¡Intercambio confirmado!")}
            >
              Marcar como completado
            </Button>
          )}
        </div>
      )}
```

- [ ] **Step 3: Verificar typecheck y build**

Run: `npx tsc --noEmit` → exit 0.
Run: `npm run build` → OK.

- [ ] **Step 4: Verificación manual (anotar, no bloquea commit)**

Con dos usuarios y un intercambio en `accepted`: cada uno toca "Marcar como completado"; tras el segundo, el status pasa a `Completado`. (Requiere migración 0005 aplicada.)

- [ ] **Step 5: Commit**

```bash
git add "src/components/features/marketplace/ExchangeRequestCard.tsx"
git commit -m "feat: UI para confirmar completado del intercambio en la tarjeta"
```

---

### Task 5: Migración de `ratings` + tipos

**Files:**
- Create: `supabase/migrations/0006_ratings.sql`
- Modify: `src/types/database.ts`

**Interfaces:**
- Produces: tabla `ratings`; interface `Rating` y tipo agregado `RatingSummary` en types.

- [ ] **Step 1: Crear la migración**

Crear `supabase/migrations/0006_ratings.sql`:

```sql
-- AynAI — ratings: reputación tras un intercambio completado. Idempotente.

create table if not exists public.ratings (
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
create index if not exists ratings_ratee_idx on public.ratings(ratee_id);

alter table public.ratings enable row level security;

-- Lectura pública (autenticados): los ratings se muestran en perfiles.
drop policy if exists "ratings_select_auth" on public.ratings;
create policy "ratings_select_auth" on public.ratings
  for select to authenticated using (true);

-- Insert: solo califico a la contraparte de un intercambio MÍO ya 'completed'.
drop policy if exists "ratings_insert_party" on public.ratings;
create policy "ratings_insert_party" on public.ratings
  for insert to authenticated
  with check (
    rater_id = auth.uid()
    and exists (
      select 1 from public.exchange_requests er
      where er.id = exchange_request_id
        and er.status = 'completed'
        and auth.uid() in (er.requester_id, er.recipient_id)
        and ratee_id in (er.requester_id, er.recipient_id)
        and ratee_id <> auth.uid()
    )
  );
```

- [ ] **Step 2: Aplicar la migración**

Aplicar en Supabase. Verificar que la tabla `ratings` existe con RLS habilitada y dos policies.

- [ ] **Step 3: Actualizar tipos**

En `src/types/database.ts`, al final agregar:

```typescript
/** Fila de la tabla ratings. */
export interface Rating {
  id: string;
  exchange_request_id: string;
  rater_id: string;
  ratee_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
}

/** Resumen de reputación de un perfil (calculado en consulta). */
export interface RatingSummary {
  average: number;
  count: number;
}
```

- [ ] **Step 4: Verificar typecheck**

Run: `npx tsc --noEmit` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0006_ratings.sql src/types/database.ts
git commit -m "feat: tabla ratings con RLS y tipos"
```

---

### Task 6: Schema Zod `submitRating` + action + tests

**Files:**
- Modify: `src/lib/marketplace/schema.ts`
- Create: `src/lib/marketplace/rating-schema.test.ts`
- Modify: `src/app/(dashboard)/intercambios/actions.ts`

**Interfaces:**
- Consumes: `ExchangeRequest`, `createClient`, `ActionResult`.
- Produces: `submitRatingSchema`, `SubmitRatingInput` (`{ requestId: string; stars: number; comment?: string }`), action `submitRating(input): Promise<ActionResult>`.

- [ ] **Step 1: Escribir el test del schema (debe fallar)**

Crear `src/lib/marketplace/rating-schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { submitRatingSchema } from "./schema";

const VALID_UUID = "11111111-1111-4111-8111-111111111111";

describe("submitRatingSchema", () => {
  it("acepta un rating válido con comentario", () => {
    const r = submitRatingSchema.safeParse({ requestId: VALID_UUID, stars: 5, comment: "Excelente" });
    expect(r.success).toBe(true);
  });

  it("acepta sin comentario", () => {
    const r = submitRatingSchema.safeParse({ requestId: VALID_UUID, stars: 3 });
    expect(r.success).toBe(true);
  });

  it("rechaza estrellas fuera de 1-5", () => {
    expect(submitRatingSchema.safeParse({ requestId: VALID_UUID, stars: 0 }).success).toBe(false);
    expect(submitRatingSchema.safeParse({ requestId: VALID_UUID, stars: 6 }).success).toBe(false);
  });

  it("rechaza estrellas no enteras", () => {
    expect(submitRatingSchema.safeParse({ requestId: VALID_UUID, stars: 4.5 }).success).toBe(false);
  });

  it("rechaza comentario demasiado largo", () => {
    const long = "a".repeat(501);
    expect(submitRatingSchema.safeParse({ requestId: VALID_UUID, stars: 4, comment: long }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run src/lib/marketplace/rating-schema.test.ts`
Expected: FAIL — `submitRatingSchema` no existe.

- [ ] **Step 3: Implementar el schema**

En `src/lib/marketplace/schema.ts`, después del bloque de `confirmExchangeSchema`:

```typescript
/** Calificación de la contraparte tras un intercambio completado. */
export const submitRatingSchema = z.object({
  requestId: uuid,
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});
export type SubmitRatingInput = z.infer<typeof submitRatingSchema>;
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run src/lib/marketplace/rating-schema.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Implementar la action `submitRating`**

En `src/app/(dashboard)/intercambios/actions.ts`:
1. Añadir al import de schema: `submitRatingSchema`, `type SubmitRatingInput`.
2. Añadir al final:

```typescript
/** Califica a la contraparte de un intercambio completado. La RLS valida elegibilidad; el trigger recalcula su score. */
export const submitRating = async (input: SubmitRatingInput): Promise<ActionResult> => {
  const parsed = submitRatingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado", code: "UNAUTHENTICATED" };

  const { requestId, stars, comment } = parsed.data;

  const { data: row } = await supabase
    .from("exchange_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle<ExchangeRequest>();
  if (!row) return { error: "Solicitud no encontrada", code: "NOT_FOUND" };
  if (row.status !== "completed") {
    return { error: "Solo puedes calificar intercambios completados", code: "INVALID_STATE" };
  }

  const rateeId = row.requester_id === user.id ? row.recipient_id : row.requester_id;
  if (rateeId === user.id) {
    return { error: "No eres parte de este intercambio", code: "FORBIDDEN" };
  }

  const { error: insertError } = await supabase.from("ratings").insert({
    exchange_request_id: requestId,
    rater_id: user.id,
    ratee_id: rateeId,
    stars,
    comment: comment || null,
  });
  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "Ya calificaste este intercambio", code: "DUPLICATE" };
    }
    console.error("submitRating insert error:", insertError);
    return { error: "No pudimos guardar tu calificación", code: "DB_ERROR" };
  }

  revalidatePath("/intercambios");
  return {};
};
```

- [ ] **Step 6: Verificar typecheck, tests, build**

Run: `npx tsc --noEmit` → exit 0.
Run: `npx vitest run` → 40 tests OK (35 + 5 nuevos).
Run: `npm run build` → OK.

- [ ] **Step 7: Commit**

```bash
git add src/lib/marketplace/schema.ts src/lib/marketplace/rating-schema.test.ts "src/app/(dashboard)/intercambios/actions.ts"
git commit -m "feat: submitRating con schema validado y tests"
```

---

### Task 7: Componente `StarRating` + `RatingForm`

**Files:**
- Create: `src/components/ui/star-rating.tsx`
- Create: `src/components/features/marketplace/RatingForm.tsx`

**Interfaces:**
- Produces:
  - `StarRating` props: `{ value: number; onChange?: (v: number) => void; readOnly?: boolean; size?: "sm" | "md" }`. Sin `onChange`/`readOnly` se muestra de solo lectura.
  - `RatingForm` props: `{ requestId: string; counterpartName: string }`.

- [ ] **Step 1: Crear `StarRating`**

Crear `src/components/ui/star-rating.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md";
}

/** Estrellas 1–5. Sin onChange (o readOnly) se muestra de solo lectura. */
export const StarRating = ({ value, onChange, readOnly, size = "md" }: StarRatingProps) => {
  const [hover, setHover] = useState(0);
  const interactive = !readOnly && Boolean(onChange);
  const px = size === "sm" ? 16 : 24;
  const shown = hover || value;

  return (
    <div className="flex items-center gap-1" role={interactive ? "radiogroup" : undefined} aria-label="Calificación">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= shown;
        const star = (
          <Star
            size={px}
            className={filled ? "fill-gold text-gold" : "fill-transparent text-cocoa/30"}
            aria-hidden="true"
          />
        );
        if (!interactive) return <span key={n}>{star}</span>;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
            className="transition-transform hover:scale-110"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange?.(n)}
          >
            {star}
          </button>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 2: Crear `RatingForm`**

Crear `src/components/features/marketplace/RatingForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StarRating } from "@/components/ui/star-rating";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { submitRating } from "@/app/(dashboard)/intercambios/actions";

interface RatingFormProps {
  requestId: string;
  counterpartName: string;
}

/** Formulario para calificar a la contraparte tras un intercambio completado. */
export const RatingForm = ({ requestId, counterpartName }: RatingFormProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (stars < 1) {
      toast("Selecciona al menos una estrella", "error");
      return;
    }
    setBusy(true);
    try {
      const result = await submitRating({ requestId, stars, comment: comment.trim() || undefined });
      if (result.error) {
        toast(result.error, "error");
      } else {
        toast("¡Gracias por tu calificación!", "success");
        router.refresh();
      }
    } catch {
      toast("Ocurrió un error inesperado. Intenta de nuevo.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 border-t border-cream-200 pt-4">
      <p className="text-sm font-semibold text-cocoa">¿Cómo fue tu intercambio con {counterpartName}?</p>
      <div className="mt-2">
        <StarRating value={stars} onChange={setStars} />
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Deja un comentario (opcional)"
        className="mt-3 w-full rounded-2xl border border-cream-300 bg-cream/40 px-4 py-2 text-sm text-cocoa placeholder:text-cocoa/40 focus:border-gold focus:outline-none"
      />
      <div className="mt-3">
        <Button as="button" type="button" size="sm" loading={busy} onClick={handleSubmit}>
          Enviar calificación
        </Button>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Verificar typecheck y build**

Run: `npx tsc --noEmit` → exit 0.
Run: `npm run build` → OK.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/star-rating.tsx src/components/features/marketplace/RatingForm.tsx
git commit -m "feat: componentes StarRating y RatingForm"
```

---

### Task 8: Mostrar `RatingForm` en la tarjeta cuando corresponde

**Files:**
- Modify: `src/app/(dashboard)/intercambios/page.tsx`
- Modify: `src/components/features/marketplace/ExchangeRequestCard.tsx`

**Interfaces:**
- Consumes: `submitRating` (vía `RatingForm`), nuevo prop `alreadyRated: boolean` en `ExchangeRequestCard`.
- Produces: la tarjeta muestra `RatingForm` si `status === "completed"` y `!alreadyRated`.

- [ ] **Step 1: Cargar los ratings que YO emití en la página de intercambios**

En `src/app/(dashboard)/intercambios/page.tsx`:
1. Añadir al import de tipos: `Rating`.
2. Después del bloque `myPayments`, agregar:

```typescript
  // Ratings que YO ya emití para los intercambios visibles (gate del formulario).
  const { data: myRatings } = await supabase
    .from("ratings")
    .select("exchange_request_id")
    .eq("rater_id", user.id)
    .in("exchange_request_id", rowIds.length > 0 ? rowIds : ["00000000-0000-0000-0000-000000000000"])
    .returns<Pick<Rating, "exchange_request_id">[]>();
  const ratedExchangeIds = new Set((myRatings ?? []).map((r) => r.exchange_request_id));
```
3. En el `<ExchangeRequestCard ... />` agregar el prop:
```tsx
                alreadyRated={ratedExchangeIds.has(request.id)}
```

- [ ] **Step 2: Aceptar y usar el prop en la tarjeta**

En `src/components/features/marketplace/ExchangeRequestCard.tsx`:
1. Importar el form: `import { RatingForm } from "./RatingForm";`
2. En `ExchangeRequestCardProps` agregar:
```typescript
  /** True si el usuario ya calificó este intercambio. */
  alreadyRated: boolean;
```
3. En la firma del componente desestructurar `alreadyRated`:
```typescript
export const ExchangeRequestCard = ({ request, role, counterpart, myPayment, alreadyRated }: ExchangeRequestCardProps) => {
```
4. Después del bloque del botón "Marcar como completado", agregar el bloque de rating:
```tsx
      {request.status === "completed" && !alreadyRated && (
        <RatingForm requestId={request.id} counterpartName={name} />
      )}
      {request.status === "completed" && alreadyRated && (
        <p className="mt-4 border-t border-cream-200 pt-4 text-sm text-cocoa/60">✅ Ya calificaste este intercambio.</p>
      )}
```

- [ ] **Step 3: Verificar typecheck y build**

Run: `npx tsc --noEmit` → exit 0.
Run: `npm run build` → OK.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/intercambios/page.tsx" "src/components/features/marketplace/ExchangeRequestCard.tsx"
git commit -m "feat: formulario de calificación en intercambios completados"
```

---

### Task 9: Mostrar reputación en el perfil público

**Files:**
- Modify: `src/app/u/[username]/page.tsx`
- Modify: `src/components/features/profile/ProfileCard.tsx`

**Interfaces:**
- Consumes: tabla `ratings`, `StarRating`.
- Produces: `ProfileCard` acepta prop opcional `ratings?: { summary: RatingSummary; recent: Array<{ stars: number; comment: string | null; created_at: string }> }`.

- [ ] **Step 1: Cargar ratings en la página pública**

En `src/app/u/[username]/page.tsx`:
1. Añadir al import de tipos: `Rating`, `RatingSummary`.
2. Después de cargar `skills`, agregar:

```typescript
  const { data: ratingRows } = await supabase
    .from("ratings")
    .select("stars, comment, created_at")
    .eq("ratee_id", profile.id)
    .order("created_at", { ascending: false })
    .returns<Pick<Rating, "stars" | "comment" | "created_at">[]>();

  const allRatings = ratingRows ?? [];
  const summary: RatingSummary = {
    count: allRatings.length,
    average: allRatings.length
      ? Math.round((allRatings.reduce((s, r) => s + r.stars, 0) / allRatings.length) * 10) / 10
      : 0,
  };
  const recent = allRatings.slice(0, 5);
```
3. Pasar el prop a `ProfileCard`:
```tsx
        <ProfileCard profile={profile} skills={skills ?? []} ratings={{ summary, recent }} />
```

- [ ] **Step 2: Renderizar reputación en `ProfileCard`**

En `src/components/features/profile/ProfileCard.tsx`:
1. Importar: `import { StarRating } from "@/components/ui/star-rating";` y `import type { RatingSummary } from "@/types/database";`
2. Agregar al tipo de props (junto a `profile` y `skills`):
```typescript
  ratings?: {
    summary: RatingSummary;
    recent: Array<{ stars: number; comment: string | null; created_at: string }>;
  };
```
3. Desestructurar `ratings` en la firma del componente.
4. Antes del cierre del componente (al final del JSX, dentro del contenedor raíz), agregar:
```tsx
      {ratings && ratings.summary.count > 0 && (
        <section className="mt-8 border-t border-cream-300 pt-6">
          <div className="flex items-center gap-2">
            <StarRating value={Math.round(ratings.summary.average)} readOnly size="sm" />
            <span className="text-sm font-semibold text-cocoa">{ratings.summary.average.toFixed(1)}</span>
            <span className="text-sm text-cocoa/50">({ratings.summary.count})</span>
          </div>
          <ul className="mt-4 space-y-3">
            {ratings.recent.map((r, i) => (
              <li key={i} className="rounded-2xl border border-cream-200 bg-cream/30 p-3">
                <StarRating value={r.stars} readOnly size="sm" />
                {r.comment && <p className="mt-1 text-sm text-cocoa/80">“{r.comment}”</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
```

> Nota: si la estructura JSX de `ProfileCard` no tiene un contenedor raíz simple, insertar la `<section>` como último hijo del contenedor principal de la tarjeta. Verificar con `npx tsc --noEmit` que no hay error de JSX.

- [ ] **Step 3: Verificar typecheck y build**

Run: `npx tsc --noEmit` → exit 0.
Run: `npm run build` → OK.

- [ ] **Step 4: Commit**

```bash
git add "src/app/u/[username]/page.tsx" "src/components/features/profile/ProfileCard.tsx"
git commit -m "feat: muestra reputación (ratings) en el perfil público"
```

---

## FASE 3 — AynAI Score real

### Task 10: Espejo TS de la fórmula + tests

**Files:**
- Create: `src/lib/scoring/compute.ts`
- Create: `src/lib/scoring/compute.test.ts`

**Interfaces:**
- Produces: `computeAyniScore(input: ScoreInput): ScoreResult`.
  - `ScoreInput = { avgStars: number | null; ratingCount: number; completedCount: number; acceptedOrMore: number; profileItems: number }` (`profileItems` 0–5).
  - `ScoreResult = { total: number; factors: { reputation: number; volume: number; reliability: number; profile: number } }` (total 0–1000, redondeado).

- [ ] **Step 1: Escribir los tests (deben fallar)**

Crear `src/lib/scoring/compute.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeAyniScore } from "./compute";

describe("computeAyniScore", () => {
  it("usuario nuevo sin actividad ni ratings arranca en 600", () => {
    const r = computeAyniScore({ avgStars: null, ratingCount: 0, completedCount: 0, acceptedOrMore: 0, profileItems: 0 });
    expect(r.total).toBe(600);
  });

  it("nuevo con perfil completo pero sin actividad sigue siendo el arranque neutro (600)", () => {
    const r = computeAyniScore({ avgStars: null, ratingCount: 0, completedCount: 0, acceptedOrMore: 0, profileItems: 5 });
    expect(r.total).toBe(600);
  });

  it("reputación perfecta aporta el tope del factor (500)", () => {
    const r = computeAyniScore({ avgStars: 5, ratingCount: 3, completedCount: 3, acceptedOrMore: 3, profileItems: 5 });
    expect(r.factors.reputation).toBe(500);
    expect(r.factors.reliability).toBe(150);
    expect(r.factors.profile).toBe(100);
    expect(r.total).toBe(500 + r.factors.volume + 150 + 100);
  });

  it("cumplimiento parcial penaliza el factor de fiabilidad", () => {
    const r = computeAyniScore({ avgStars: 4, ratingCount: 2, completedCount: 1, acceptedOrMore: 2, profileItems: 5 });
    expect(r.factors.reliability).toBe(75); // 1/2 * 150
  });

  it("el total nunca excede 1000", () => {
    const r = computeAyniScore({ avgStars: 5, ratingCount: 50, completedCount: 50, acceptedOrMore: 50, profileItems: 5 });
    expect(r.total).toBeLessThanOrEqual(1000);
  });

  it("el volumen tiene rendimientos decrecientes (tope ~20)", () => {
    const a = computeAyniScore({ avgStars: 4, ratingCount: 5, completedCount: 5, acceptedOrMore: 5, profileItems: 5 });
    const b = computeAyniScore({ avgStars: 4, ratingCount: 40, completedCount: 40, acceptedOrMore: 40, profileItems: 5 });
    expect(b.factors.volume).toBeGreaterThan(a.factors.volume);
    expect(b.factors.volume).toBeLessThanOrEqual(250);
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run src/lib/scoring/compute.test.ts`
Expected: FAIL — `computeAyniScore` no existe.

- [ ] **Step 3: Implementar la fórmula**

Crear `src/lib/scoring/compute.ts`:

```typescript
/** Entrada cruda para calcular el AynAI Score de un usuario. */
export interface ScoreInput {
  /** Promedio de estrellas recibidas (null si no tiene ratings). */
  avgStars: number | null;
  /** Cantidad de ratings recibidos. */
  ratingCount: number;
  /** Intercambios completados. */
  completedCount: number;
  /** Intercambios que llegaron al menos a 'accepted' (accepted + completed). */
  acceptedOrMore: number;
  /** Ítems de perfil completos (0–5). */
  profileItems: number;
}

/** Desglose explicable del score. */
export interface ScoreResult {
  total: number;
  factors: {
    reputation: number;
    volume: number;
    reliability: number;
    profile: number;
  };
}

const VOLUME_CAP = 20;

/**
 * Calcula el AynAI Score (0–1000) con desglose por factor.
 * Arranque neutro: sin ratings NI intercambios completados → 600.
 * Espejo de la función SQL recalc_ayni_score (deben mantenerse en sincronía).
 */
export const computeAyniScore = (input: ScoreInput): ScoreResult => {
  const { avgStars, ratingCount, completedCount, acceptedOrMore, profileItems } = input;

  if (ratingCount === 0 && completedCount === 0) {
    return { total: 600, factors: { reputation: 0, volume: 0, reliability: 0, profile: 0 } };
  }

  const reputation = ((avgStars ?? 3) / 5) * 500;
  const volume = Math.min(Math.log(1 + completedCount) / Math.log(1 + VOLUME_CAP), 1) * 250;
  const reliability = acceptedOrMore > 0 ? (completedCount / acceptedOrMore) * 150 : 0;
  const profile = Math.min(Math.max(profileItems, 0), 5) * 20;

  const round = (n: number) => Math.round(n);
  const factors = {
    reputation: round(reputation),
    volume: round(volume),
    reliability: round(reliability),
    profile: round(profile),
  };
  const total = Math.min(factors.reputation + factors.volume + factors.reliability + factors.profile, 1000);

  return { total, factors };
};
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `npx vitest run src/lib/scoring/compute.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring/compute.ts src/lib/scoring/compute.test.ts
git commit -m "feat: fórmula del AynAI Score en TS con tests (espejo del SQL)"
```

---

### Task 11: Migración del score (función SQL + triggers + default 600 + backfill)

**Files:**
- Create: `supabase/migrations/0007_score.sql`

**Interfaces:**
- Consumes: tablas `exchange_requests`, `ratings`, `profiles`, `user_skills`.
- Produces: función `recalc_ayni_score(uuid)`; triggers en `ratings` y `exchange_requests`; default de `profiles.ayni_score` = 600; backfill.

- [ ] **Step 1: Crear la migración (espejo exacto de `compute.ts`)**

Crear `supabase/migrations/0007_score.sql`:

```sql
-- AynAI — AynAI Score real. Espejo de src/lib/scoring/compute.ts. Idempotente.

alter table public.profiles alter column ayni_score set default 600;

create or replace function public.recalc_ayni_score(p_user_id uuid)
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  v_avg            numeric;
  v_rating_count   int;
  v_completed      int;
  v_accepted_more  int;
  v_profile_items  int;
  v_reputation     numeric;
  v_volume         numeric;
  v_reliability    numeric;
  v_profile        numeric;
  v_total          int;
  v_p              public.profiles%rowtype;
begin
  select avg(stars), count(*) into v_avg, v_rating_count
    from public.ratings where ratee_id = p_user_id;

  select count(*) into v_completed
    from public.exchange_requests
    where status = 'completed' and (requester_id = p_user_id or recipient_id = p_user_id);

  select count(*) into v_accepted_more
    from public.exchange_requests
    where status in ('accepted','completed') and (requester_id = p_user_id or recipient_id = p_user_id);

  -- Arranque neutro: sin ratings ni completados → 600.
  if v_rating_count = 0 and v_completed = 0 then
    update public.profiles set ayni_score = 600 where id = p_user_id;
    return 600;
  end if;

  -- Completitud de perfil (0–5).
  select * into v_p from public.profiles where id = p_user_id;
  v_profile_items :=
      (case when v_p.avatar_url is not null and v_p.avatar_url <> '' then 1 else 0 end)
    + (case when exists (select 1 from public.user_skills where user_id = p_user_id and kind = 'offer') then 1 else 0 end)
    + (case when exists (select 1 from public.user_skills where user_id = p_user_id and kind = 'seek') then 1 else 0 end)
    + (case when v_p.links is not null and v_p.links <> '{}'::jsonb then 1 else 0 end)
    + (case when v_p.availability is not null and v_p.availability <> 'unavailable' then 1 else 0 end);

  v_reputation  := (coalesce(v_avg, 3) / 5.0) * 500;
  v_volume      := least(ln(1 + v_completed) / ln(1 + 20), 1) * 250;
  v_reliability := case when v_accepted_more > 0 then (v_completed::numeric / v_accepted_more) * 150 else 0 end;
  v_profile     := least(greatest(v_profile_items, 0), 5) * 20;

  v_total := least(round(v_reputation) + round(v_volume) + round(v_reliability) + round(v_profile), 1000);

  update public.profiles set ayni_score = v_total where id = p_user_id;
  return v_total;
end;
$$;

-- Trigger: nuevo rating → recalcular score del calificado.
create or replace function public.on_rating_recalc()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recalc_ayni_score(new.ratee_id);
  return new;
end;
$$;
drop trigger if exists trg_rating_recalc on public.ratings;
create trigger trg_rating_recalc
  after insert on public.ratings
  for each row execute function public.on_rating_recalc();

-- Trigger: intercambio pasa a 'completed' → recalcular ambas partes.
create or replace function public.on_exchange_completed_recalc()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    perform public.recalc_ayni_score(new.requester_id);
    perform public.recalc_ayni_score(new.recipient_id);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_exchange_completed_recalc on public.exchange_requests;
create trigger trg_exchange_completed_recalc
  after update on public.exchange_requests
  for each row execute function public.on_exchange_completed_recalc();

-- Backfill: recalcular el score de todos los perfiles existentes una vez.
do $$
declare r record;
begin
  for r in select id from public.profiles loop
    perform public.recalc_ayni_score(r.id);
  end loop;
end $$;
```

- [ ] **Step 2: Aplicar la migración**

Aplicar en Supabase. Verificar: `select id, ayni_score from profiles limit 5;` muestra scores recalculados (los sin actividad = 600).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0007_score.sql
git commit -m "feat: AynAI Score real con función SQL, triggers y backfill"
```

---

### Task 12: Score real + desglose + onboarding en el dashboard

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `computeAyniScore` de `@/lib/scoring/compute`, `profile.ayni_score`.
- Produces: dashboard con número real, desglose de factores y banner de onboarding.

- [ ] **Step 1: Calcular insumos del desglose y completitud del perfil**

En `src/app/(dashboard)/dashboard/page.tsx`:
1. Importar: `import { computeAyniScore } from "@/lib/scoring/compute";`
2. Tras cargar `profile`, agregar las consultas y el cálculo:

```typescript
  const { data: ratingAgg } = await supabase
    .from("ratings")
    .select("stars")
    .eq("ratee_id", user.id)
    .returns<{ stars: number }[]>();
  const ratingList = ratingAgg ?? [];
  const avgStars = ratingList.length
    ? ratingList.reduce((s, r) => s + r.stars, 0) / ratingList.length
    : null;

  const { count: completedCount } = await supabase
    .from("exchange_requests")
    .select("id", { count: "exact", head: true })
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .eq("status", "completed");

  const { count: acceptedOrMore } = await supabase
    .from("exchange_requests")
    .select("id", { count: "exact", head: true })
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .in("status", ["accepted", "completed"]);

  const { data: mySkills } = await supabase
    .from("user_skills")
    .select("kind")
    .eq("user_id", user.id)
    .returns<{ kind: string }[]>();
  const skillKinds = new Set((mySkills ?? []).map((s) => s.kind));
  const links = profile?.links ?? {};
  const hasLink = Boolean(links.web || links.linkedin || links.github || links.x);
  const profileItems =
    (profile?.avatar_url ? 1 : 0) +
    (skillKinds.has("offer") ? 1 : 0) +
    (skillKinds.has("seek") ? 1 : 0) +
    (hasLink ? 1 : 0) +
    (profile && profile.availability !== "unavailable" ? 1 : 0);

  const score = computeAyniScore({
    avgStars,
    ratingCount: ratingList.length,
    completedCount: completedCount ?? 0,
    acceptedOrMore: acceptedOrMore ?? 0,
    profileItems,
  });
```

- [ ] **Step 2: Mostrar el score real + desglose**

Reemplazar el contenido del card "AynAI Score" por:

```tsx
        {/* AynAI Score */}
        <div className="rounded-3xl border border-cream-300 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-cocoa/60">Tu AynAI Score</p>
          <p className="mt-2 font-serif text-5xl font-bold text-green">
            {profile?.ayni_score ?? score.total}
          </p>
          <dl className="mt-4 space-y-1.5 text-xs text-cocoa/60">
            <div className="flex justify-between"><dt>Reputación</dt><dd>+{score.factors.reputation}</dd></div>
            <div className="flex justify-between"><dt>Intercambios</dt><dd>+{score.factors.volume}</dd></div>
            <div className="flex justify-between"><dt>Cumplimiento</dt><dd>+{score.factors.reliability}</dd></div>
            <div className="flex justify-between"><dt>Perfil completo</dt><dd>+{score.factors.profile}</dd></div>
          </dl>
        </div>
```

- [ ] **Step 3: Añadir el banner de onboarding**

Justo después de la apertura del `<main>` y antes del `<p>Bienvenido</p>`, agregar:

```tsx
      {profileItems < 5 && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-3xl border border-gold/40 bg-gold/10 p-5">
          <p className="text-sm font-medium text-cocoa">
            Completá tu perfil ({profileItems}/5) para subir tu AynAI Score y recibir mejores intercambios.
          </p>
          <a href="/perfil/editar" className="shrink-0 rounded-full bg-cocoa px-4 py-2 text-sm font-semibold text-cream hover:bg-cocoa/90">
            Completar
          </a>
        </div>
      )}
```

- [ ] **Step 4: Verificar typecheck, tests y build**

Run: `npx tsc --noEmit` → exit 0.
Run: `npx vitest run` → 46 tests OK.
Run: `npm run build` → OK.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/dashboard/page.tsx"
git commit -m "feat: AynAI Score real con desglose y banner de onboarding en el dashboard"
```

---

## FASE 4 — Notificaciones in-app + email

### Task 13: Instalar Resend y configurar env

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

**Interfaces:**
- Produces: dependencia `resend` disponible; `RESEND_API_KEY` documentada.

- [ ] **Step 1: Instalar Resend**

Run: `npm install resend`
Expected: `resend` agregado a `dependencies` en `package.json`.

- [ ] **Step 2: Documentar la variable de entorno**

En `.env.example`, agregar al final:

```
# Email transaccional (opcional). Sin esta clave, las notificaciones por email se omiten.
RESEND_API_KEY=
# Remitente verificado en Resend (ej. AynAI <hola@tudominio.com>)
RESEND_FROM="AynAI <onboarding@resend.dev>"
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: agrega Resend para email transaccional"
```

---

### Task 14: Migración de notificaciones + RPC + tipos

**Files:**
- Create: `supabase/migrations/0008_notifications.sql`
- Modify: `src/types/database.ts`

**Interfaces:**
- Produces: tabla `notifications`; RPC `create_notification(p_user_id uuid, p_type text, p_title text, p_body text, p_link text)`; publicación Realtime; tipos `NotificationType`, `Notification`.

- [ ] **Step 1: Crear la migración**

Crear `supabase/migrations/0008_notifications.sql`:

```sql
-- AynAI — notificaciones in-app. Idempotente.

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, read);

alter table public.notifications enable row level security;

-- Cada usuario ve y actualiza solo sus notificaciones.
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Inserción cruzada controlada: una parte puede crear notificaciones para otra vía función security definer.
create or replace function public.create_notification(
  p_user_id uuid, p_type text, p_title text, p_body text, p_link text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user_id, p_type, p_title, p_body, p_link);
end;
$$;

-- Habilitar Realtime sobre la tabla.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
end $$;
```

- [ ] **Step 2: Aplicar la migración**

Aplicar en Supabase. Verificar que la tabla existe, RLS habilitada, y que aparece en Database → Replication (Realtime).

- [ ] **Step 3: Actualizar tipos**

En `src/types/database.ts`, al final agregar:

```typescript
/** Tipos de evento que generan una notificación. */
export type NotificationType =
  | "request_received"
  | "request_accepted"
  | "request_rejected"
  | "commission_paid"
  | "exchange_completed"
  | "rating_received";

/** Fila de la tabla notifications. */
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}
```

- [ ] **Step 4: Verificar typecheck**

Run: `npx tsc --noEmit` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0008_notifications.sql src/types/database.ts
git commit -m "feat: tabla notifications, RPC create_notification y Realtime"
```

---

### Task 15: Plantillas de email + tests

**Files:**
- Create: `src/lib/notifications/email.ts`
- Create: `src/lib/notifications/templates.test.ts`

**Interfaces:**
- Produces:
  - `buildNotificationEmail(type, title, body, link): { subject: string; html: string }` (pura).
  - `sendNotificationEmail(to, type, title, body, link): Promise<void>` (best-effort; usa Resend si hay `RESEND_API_KEY`, si no, no-op).

- [ ] **Step 1: Escribir los tests de la plantilla pura (deben fallar)**

Crear `src/lib/notifications/templates.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildNotificationEmail } from "./email";

describe("buildNotificationEmail", () => {
  it("usa el título como asunto", () => {
    const m = buildNotificationEmail("request_received", "Nueva solicitud", "María quiere intercambiar", "/intercambios");
    expect(m.subject).toContain("Nueva solicitud");
  });

  it("incluye el cuerpo y un enlace absoluto al link", () => {
    const m = buildNotificationEmail("request_accepted", "Aceptada", "Tu propuesta fue aceptada", "/intercambios");
    expect(m.html).toContain("Tu propuesta fue aceptada");
    expect(m.html).toContain("/intercambios");
  });

  it("funciona sin body ni link", () => {
    const m = buildNotificationEmail("rating_received", "Nueva calificación", null, null);
    expect(m.subject).toContain("Nueva calificación");
    expect(typeof m.html).toBe("string");
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run src/lib/notifications/templates.test.ts`
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar `email.ts`**

Crear `src/lib/notifications/email.ts`:

```typescript
import { Resend } from "resend";
import type { NotificationType } from "@/types/database";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://aynai-app.vercel.app";

/** Construye el email (asunto + HTML) de una notificación. Función pura. */
export const buildNotificationEmail = (
  _type: NotificationType,
  title: string,
  body: string | null,
  link: string | null
): { subject: string; html: string } => {
  const url = link ? `${APP_URL}${link}` : APP_URL;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h1 style="color:#3d2b1f;font-size:20px">${title}</h1>
      ${body ? `<p style="color:#5c4a3a;font-size:15px;line-height:1.5">${body}</p>` : ""}
      <a href="${url}" style="display:inline-block;margin-top:16px;background:#3d2b1f;color:#f5efe6;padding:10px 20px;border-radius:9999px;text-decoration:none;font-weight:600">Ver en AynAI</a>
    </div>`;
  return { subject: `AynAI · ${title}`, html };
};

/** Envía el email best-effort. Sin RESEND_API_KEY, no-op silencioso. Nunca lanza. */
export const sendNotificationEmail = async (
  to: string,
  type: NotificationType,
  title: string,
  body: string | null,
  link: string | null
): Promise<void> => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return;
  try {
    const resend = new Resend(apiKey);
    const { subject, html } = buildNotificationEmail(type, title, body, link);
    await resend.emails.send({
      from: process.env.RESEND_FROM ?? "AynAI <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("sendNotificationEmail error:", err);
  }
};
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `npx vitest run src/lib/notifications/templates.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications/email.ts src/lib/notifications/templates.test.ts
git commit -m "feat: plantillas de email de notificación con Resend best-effort"
```

---

### Task 16: Helper `notify` (in-app + email)

**Files:**
- Create: `src/lib/notifications/index.ts`

**Interfaces:**
- Consumes: `createClient` (server), `sendNotificationEmail`, RPC `create_notification`.
- Produces: `notify(params: NotifyParams): Promise<void>`, donde `NotifyParams = { userId: string; type: NotificationType; title: string; body?: string; link?: string }`.

- [ ] **Step 1: Implementar `notify`**

Crear `src/lib/notifications/index.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "./email";
import type { NotificationType } from "@/types/database";

export interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

/**
 * Crea la notificación in-app (siempre) y dispara el email (best-effort).
 * Nunca lanza: una falla de notificación no debe romper la acción que la origina.
 */
export const notify = async ({ userId, type, title, body, link }: NotifyParams): Promise<void> => {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("create_notification", {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_body: body ?? null,
      p_link: link ?? null,
    });
    if (error) {
      console.error("notify rpc error:", error);
      return;
    }

    // Email best-effort: buscar el correo del destinatario.
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle<{ email: string | null }>();
    if (profile?.email) {
      await sendNotificationEmail(profile.email, type, title, body ?? null, link ?? null);
    }
  } catch (err) {
    console.error("notify error:", err);
  }
};
```

- [ ] **Step 2: Verificar typecheck y build**

Run: `npx tsc --noEmit` → exit 0.
Run: `npm run build` → OK.

- [ ] **Step 3: Commit**

```bash
git add src/lib/notifications/index.ts
git commit -m "feat: helper notify (in-app + email best-effort)"
```

---

### Task 17: Cablear `notify` en las server actions

**Files:**
- Modify: `src/app/(dashboard)/intercambios/actions.ts`

**Interfaces:**
- Consumes: `notify`, `Profile` (para nombre del actor).
- Produces: cada mutación relevante dispara su notificación.

- [ ] **Step 1: Importar `notify` y un helper de nombre**

En `src/app/(dashboard)/intercambios/actions.ts`:
1. Agregar: `import { notify } from "@/lib/notifications";`
2. Agregar el helper al inicio del archivo (después de los imports):

```typescript
/** Nombre legible del actor para los textos de notificación. */
const actorName = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string> => {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, username")
    .eq("id", userId)
    .maybeSingle<{ full_name: string | null; username: string | null }>();
  return data?.full_name?.trim() || data?.username || "Alguien";
};
```

- [ ] **Step 2: `createExchangeRequest` → notificar al destinatario**

En `createExchangeRequest`, antes de `revalidatePath("/intercambios"); return {};`:

```typescript
  const who = await actorName(supabase, user.id);
  await notify({
    userId: recipientId,
    type: "request_received",
    title: "Nueva solicitud de intercambio",
    body: `${who} ofrece ${offerSkill} por ${wantSkill}.`,
    link: "/intercambios",
  });
```

- [ ] **Step 3: `respondToRequest` → notificar al solicitante**

En `respondToRequest`, antes de `revalidatePath("/intercambios"); return {};`:

```typescript
  const who = await actorName(supabase, user.id);
  await notify({
    userId: row.requester_id,
    type: action === "accept" ? "request_accepted" : "request_rejected",
    title: action === "accept" ? "Tu propuesta fue aceptada" : "Tu propuesta fue rechazada",
    body: action === "accept"
      ? `${who} aceptó tu intercambio. Paga la comisión para revelar el contacto.`
      : `${who} rechazó tu intercambio.`,
    link: "/intercambios",
  });
```

- [ ] **Step 4: `confirmMockPayment` → notificar a la otra parte**

En `confirmMockPayment`, antes de `revalidatePath("/intercambios"); return {};` (tras marcar el pago como `paid`). Necesitamos el intercambio para conocer la contraparte:

```typescript
  const { data: exch } = await supabase
    .from("exchange_requests")
    .select("requester_id, recipient_id")
    .eq("id", payment.exchange_request_id)
    .maybeSingle<{ requester_id: string; recipient_id: string }>();
  if (exch) {
    const other = exch.requester_id === user.id ? exch.recipient_id : exch.requester_id;
    const who = await actorName(supabase, user.id);
    await notify({
      userId: other,
      type: "commission_paid",
      title: "Comisión pagada",
      body: `${who} pagó su comisión. Paga la tuya para concretar el intercambio.`,
      link: "/intercambios",
    });
  }
```

- [ ] **Step 5: `confirmExchange` → notificar a ambas partes cuando queda completado**

En `confirmExchange`, después del `update` exitoso y antes de `revalidatePath`. Releer el estado para saber si quedó completado:

```typescript
  const { data: after } = await supabase
    .from("exchange_requests")
    .select("status, requester_id, recipient_id")
    .eq("id", requestId)
    .maybeSingle<{ status: string; requester_id: string; recipient_id: string }>();
  if (after?.status === "completed") {
    await Promise.all([
      notify({ userId: after.requester_id, type: "exchange_completed", title: "Intercambio completado", body: "Ambos confirmaron. ¡Ya puedes calificar!", link: "/intercambios" }),
      notify({ userId: after.recipient_id, type: "exchange_completed", title: "Intercambio completado", body: "Ambos confirmaron. ¡Ya puedes calificar!", link: "/intercambios" }),
    ]);
  }
```

- [ ] **Step 6: `submitRating` → notificar al calificado**

En `submitRating`, antes de `revalidatePath("/intercambios"); return {};`:

```typescript
  await notify({
    userId: rateeId,
    type: "rating_received",
    title: "Recibiste una calificación",
    body: `Te dieron ${stars} ${stars === 1 ? "estrella" : "estrellas"}.`,
    link: "/intercambios",
  });
```

- [ ] **Step 7: Verificar typecheck, tests y build**

Run: `npx tsc --noEmit` → exit 0.
Run: `npx vitest run` → 49 tests OK.
Run: `npm run build` → OK.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(dashboard)/intercambios/actions.ts"
git commit -m "feat: dispara notificaciones en cada evento del ciclo de intercambio"
```

---

### Task 18: `NotificationBell` con Realtime en el navbar

**Files:**
- Create: `src/components/features/notifications/NotificationBell.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: `Notification` type, `createClient` (browser, de `@/lib/supabase/client`), Realtime.
- Produces: campana con badge de no-leídas + panel desplegable; prop `initial: Notification[]`.

- [ ] **Step 1: Crear `NotificationBell`**

Crear `src/components/features/notifications/NotificationBell.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/types/database";

interface NotificationBellProps {
  userId: string;
  initial: Notification[];
}

/** Campana de notificaciones con badge de no-leídas y panel; escucha Realtime. */
export const NotificationBell = ({ userId, initial }: NotificationBellProps) => {
  const [items, setItems] = useState<Notification[]>(initial);
  const [open, setOpen] = useState(false);
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => setItems((prev) => [payload.new as Notification, ...prev])
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAllRead = async () => {
    const supabase = createClient();
    const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void markAllRead();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ""}`}
        className="relative rounded-full p-2 text-cocoa/75 transition-colors hover:bg-cocoa/5 hover:text-red"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red px-1 text-[0.6rem] font-bold text-cream">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-cream-300 bg-white p-2 shadow-lg">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-cocoa/50">Sin notificaciones todavía.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.slice(0, 12).map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.link ?? "/intercambios"}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-cream/60"
                  >
                    <p className="text-sm font-semibold text-cocoa">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs text-cocoa/60">{n.body}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Montar la campana en el layout**

En `src/app/(dashboard)/layout.tsx`:
1. Importar: `import { NotificationBell } from "@/components/features/notifications/NotificationBell";` y el tipo `import type { Notification } from "@/types/database";`
2. Tras calcular `pendingCount`, cargar las notificaciones del usuario:

```typescript
  let notifications: Notification[] = [];
  if (user) {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<Notification[]>();
    notifications = data ?? [];
  }
```
3. En el header, justo antes del `<form action={signOut}>`, insertar la campana (solo si hay usuario):

```tsx
          {user && <NotificationBell userId={user.id} initial={notifications} />}
```
Envolver la campana y el form en un contenedor flex si es necesario para alinearlos:
```tsx
          <div className="flex items-center gap-2">
            {user && <NotificationBell userId={user.id} initial={notifications} />}
            <form action={signOut}>
              {/* ...botón existente... */}
            </form>
          </div>
```
(reemplazando el `<form action={signOut}>...</form>` suelto por el contenedor anterior).

- [ ] **Step 3: Verificar typecheck y build**

Run: `npx tsc --noEmit` → exit 0.
Run: `npm run build` → OK.

- [ ] **Step 4: Verificación manual (anotar)**

Con dos usuarios: A envía solicitud a B → a B le aparece el badge en vivo sin recargar; abrir el panel marca como leídas. Verificar email solo si `RESEND_API_KEY` está configurada.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/notifications/NotificationBell.tsx "src/app/(dashboard)/layout.tsx"
git commit -m "feat: campana de notificaciones con badge y Realtime en el navbar"
```

---

## FASE 5 — Cold-start (seed)

### Task 19: Seed data de perfiles demo

**Files:**
- Create: `supabase/seed.sql`

**Interfaces:**
- Produces: ~8 perfiles demo con skills, para que el marketplace no esté vacío en desarrollo/demo.

- [ ] **Step 1: Crear el seed**

Crear `supabase/seed.sql`. Nota: `profiles.id` referencia `auth.users(id)`; para seed sin auth real, insertar usuarios mínimos en `auth.users` con id fijos y luego perfiles. Idempotente vía `on conflict do nothing`:

```sql
-- AynAI — seed de perfiles demo para cold-start. Idempotente. Solo desarrollo/demo.

-- Usuarios mínimos en auth (ids fijos para idempotencia).
insert into auth.users (id, email, created_at, updated_at, aud, role)
values
  ('aaaaaaaa-0000-4000-8000-000000000001','mara.demo@aynai.dev', now(), now(), 'authenticated','authenticated'),
  ('aaaaaaaa-0000-4000-8000-000000000002','luis.demo@aynai.dev', now(), now(), 'authenticated','authenticated'),
  ('aaaaaaaa-0000-4000-8000-000000000003','sofia.demo@aynai.dev', now(), now(), 'authenticated','authenticated'),
  ('aaaaaaaa-0000-4000-8000-000000000004','diego.demo@aynai.dev', now(), now(), 'authenticated','authenticated'),
  ('aaaaaaaa-0000-4000-8000-000000000005','valen.demo@aynai.dev', now(), now(), 'authenticated','authenticated'),
  ('aaaaaaaa-0000-4000-8000-000000000006','carlos.demo@aynai.dev', now(), now(), 'authenticated','authenticated'),
  ('aaaaaaaa-0000-4000-8000-000000000007','ana.demo@aynai.dev', now(), now(), 'authenticated','authenticated'),
  ('aaaaaaaa-0000-4000-8000-000000000008','jorge.demo@aynai.dev', now(), now(), 'authenticated','authenticated')
on conflict (id) do nothing;

insert into public.profiles (id, full_name, email, username, bio, location, availability, modality, links)
values
  ('aaaaaaaa-0000-4000-8000-000000000001','María Quispe','mara.demo@aynai.dev','maria','Diseñadora UX/UI','La Paz','available','remoto','{"linkedin":"https://linkedin.com/in/demo"}'),
  ('aaaaaaaa-0000-4000-8000-000000000002','Luis Mamani','luis.demo@aynai.dev','luis','Desarrollador frontend','El Alto','available','remoto','{"github":"https://github.com/demo"}'),
  ('aaaaaaaa-0000-4000-8000-000000000003','Sofía Vargas','sofia.demo@aynai.dev','sofia','Marketing digital','Cochabamba','busy','híbrido','{}'),
  ('aaaaaaaa-0000-4000-8000-000000000004','Diego Rojas','diego.demo@aynai.dev','diego','Fotógrafo','Santa Cruz','available','presencial','{}'),
  ('aaaaaaaa-0000-4000-8000-000000000005','Valentina Cruz','valen.demo@aynai.dev','valentina','Redactora de contenidos','La Paz','available','remoto','{}'),
  ('aaaaaaaa-0000-4000-8000-000000000006','Carlos Flores','carlos.demo@aynai.dev','carlos','Contador','Sucre','busy','remoto','{}'),
  ('aaaaaaaa-0000-4000-8000-000000000007','Ana Torrez','ana.demo@aynai.dev','ana','Traductora ES/EN','Tarija','available','remoto','{}'),
  ('aaaaaaaa-0000-4000-8000-000000000008','Jorge Aliaga','jorge.demo@aynai.dev','jorge','Profesor de guitarra','Oruro','available','presencial','{}')
on conflict (id) do nothing;

insert into public.user_skills (user_id, name, kind, level)
values
  ('aaaaaaaa-0000-4000-8000-000000000001','Diseño UI','offer','experto'),
  ('aaaaaaaa-0000-4000-8000-000000000001','Inglés','seek','basico'),
  ('aaaaaaaa-0000-4000-8000-000000000002','React','offer','experto'),
  ('aaaaaaaa-0000-4000-8000-000000000002','Diseño UI','seek','basico'),
  ('aaaaaaaa-0000-4000-8000-000000000003','Marketing','offer','intermedio'),
  ('aaaaaaaa-0000-4000-8000-000000000003','Fotografía','seek','basico'),
  ('aaaaaaaa-0000-4000-8000-000000000004','Fotografía','offer','experto'),
  ('aaaaaaaa-0000-4000-8000-000000000004','Marketing','seek','intermedio'),
  ('aaaaaaaa-0000-4000-8000-000000000005','Redacción','offer','experto'),
  ('aaaaaaaa-0000-4000-8000-000000000006','Contabilidad','offer','experto'),
  ('aaaaaaaa-0000-4000-8000-000000000007','Traducción','offer','experto'),
  ('aaaaaaaa-0000-4000-8000-000000000008','Guitarra','offer','experto')
on conflict (user_id, name, kind) do nothing;
```

- [ ] **Step 2: Aplicar el seed en desarrollo**

Aplicar en la base de desarrollo. Verificar que `/marketplace` ahora muestra los perfiles demo. (No aplicar en producción si no se desea data de prueba.)

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "chore: seed de perfiles demo para cold-start del marketplace"
```

---

## Self-Review (resultado)

**Cobertura del spec:**
- §1 Ciclo de vida → Tasks 2,3,4 ✓
- §2 Ratings → Tasks 5,6,7,8,9 ✓
- §3 Score → Tasks 10,11,12 ✓
- §4 Notificaciones → Tasks 13,14,15,16,17,18 ✓
- §5 Limpieza + cold-start → Tasks 1,12 (banner), 19 (seed) ✓

**Consistencia de tipos:** `ExchangeStatus` extendido (Task 2) y usado en `canConfirm` (Task 3), `statusLabel/Color` (Task 4). `computeAyniScore`/`ScoreInput`/`ScoreResult` (Task 10) usados en dashboard (Task 12) con los mismos nombres de factores (`reputation`, `volume`, `reliability`, `profile`). `NotificationType` (Task 14) usado en `email.ts` (15), `notify` (16), actions (17), `NotificationBell` (18). `submitRating` definido (Task 6) y consumido por `RatingForm` (Task 7) y la página (Task 8).

**Notas de ejecución:**
- Las migraciones (Tasks 2,5,11,14) y el seed (19) requieren aplicarse en Supabase manualmente; los pasos lo indican.
- Conteo de tests acumulado esperado: 35 → 40 (Task 6) → 46 (Task 10) → 49 (Task 15). Ajustar si difiere.
- Las verificaciones manuales con dos usuarios (Tasks 4, 18) no bloquean commit pero deben anotarse.
