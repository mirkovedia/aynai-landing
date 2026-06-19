# Marketplace MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un usuario autenticado descubra personas por habilidad en `/explorar` y proponga un intercambio (Ayni) que la otra parte acepta, rechaza o cancela, cerrando el loop de reciprocidad sin chat ni escrow on-chain.

**Architecture:** Server-rendered con URL search params (Enfoque A del spec). `/explorar` es un Server Component que lee filtros desde la query string y consulta Supabase; la única isla cliente es el formulario de filtros. Las solicitudes de intercambio van por Server Actions + Zod. `/intercambios` muestra recibidas y enviadas en tabs. Se construye sobre los perfiles ricos existentes (`profiles` + `user_skills` + `ProfileCard`).

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Supabase (Postgres + RLS), Zod, Vitest, Tailwind CSS.

## Global Constraints

- **Sin dependencias nuevas.** Solo lo ya instalado (Zod, Vitest, lucide-react, Supabase SSR).
- **El email NUNCA se expone** en `/explorar`. Usar exactamente `PUBLIC_COLUMNS` = `"id, full_name, ayni_score, bio, skills, location, username, avatar_url, availability, modality, links, created_at"` (sin `email`).
- **Forma de error de las Server Actions:** `{ error: string, code: string, details?: unknown }`. Tipo compartido `ActionResult` (ya existe en `src/app/(dashboard)/perfil/editar/actions.ts`; el marketplace define el suyo análogo).
- **Máquina de estados:** `pending → accepted | rejected | cancelled` (estados finales). Solo se actúa sobre filas en `pending`.
- **Gate de tipos:** `npx tsc --noEmit` es el validador real (`next.config.mjs` tiene `typescript.ignoreBuildErrors: true`, así que `npm run build` NO valida tipos). Línea base de error preexistente: `src/components/ui/button.tsx:50`. No introducir errores nuevos.
- **Idioma:** UI y comentarios en español; identificadores en inglés.
- **Patrón de cliente Supabase:** servidor → `createClient` de `@/lib/supabase/server` (es `async`, siempre `await`). Cliente browser → `createClient` de `@/lib/supabase/client`.

---

## File Structure

**Crear:**
- `supabase/migrations/0003_marketplace.sql` — tabla `exchange_requests` + índices + RLS.
- `src/lib/marketplace/schema.ts` — schemas Zod de las 3 acciones + helper `canRespond`.
- `src/lib/marketplace/schema.test.ts` — tests Vitest de los schemas y el helper.
- `src/lib/marketplace/search.ts` — helper `searchProfiles` (query de descubrimiento).
- `src/app/(dashboard)/intercambios/actions.ts` — `createExchangeRequest`, `respondToRequest`, `cancelRequest`.
- `src/app/(dashboard)/explorar/page.tsx` — Server Component de búsqueda.
- `src/app/(dashboard)/intercambios/page.tsx` — Server Component recibidas/enviadas.
- `src/components/features/marketplace/SearchFilters.tsx` — isla cliente, escribe filtros en la URL.
- `src/components/features/marketplace/ResultsGrid.tsx` — grid de `ProfileCard` + botón "Proponer Ayni".
- `src/components/features/marketplace/ProposeExchangeButton.tsx` — abre/cierra el formulario.
- `src/components/features/marketplace/ProposeExchangeForm.tsx` — ofrezco/quiero + mensaje → `createExchangeRequest`.
- `src/components/features/marketplace/ExchangeRequestCard.tsx` — solicitud recibida (aceptar/rechazar) | enviada (cancelar).

**Modificar:**
- `src/types/database.ts` — añadir `ExchangeStatus` y `ExchangeRequest`.
- `src/lib/supabase/middleware.ts:36` — añadir `/explorar` e `/intercambios` a `protectedPaths`.
- `src/app/(dashboard)/layout.tsx` — enlaces de navegación a Explorar e Intercambios + badge de pendientes.

---

## Task 1: Migración 0003 + tipos de TypeScript

**Files:**
- Create: `supabase/migrations/0003_marketplace.sql`
- Modify: `src/types/database.ts:47` (al final del archivo)

**Interfaces:**
- Consumes: tabla `profiles(id)` existente.
- Produces: tabla `exchange_requests`; tipos `ExchangeStatus` y `ExchangeRequest` para tareas posteriores.

- [ ] **Step 1: Escribir la migración SQL**

Crear `supabase/migrations/0003_marketplace.sql`:

```sql
-- AynAI — marketplace MVP: solicitudes de intercambio (Ayni) entre perfiles.
-- Idempotente: se puede re-ejecutar sin romper.

-- ───────── exchange_requests ─────────
create table if not exists public.exchange_requests (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  offer_skill  text not null,   -- lo que el solicitante OFRECE
  want_skill   text not null,   -- lo que QUIERE del destinatario
  message      text,
  status       text not null default 'pending'
               check (status in ('pending','accepted','rejected','cancelled')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (requester_id <> recipient_id)
);
create index if not exists exchange_recipient_idx on public.exchange_requests(recipient_id);
create index if not exists exchange_requester_idx on public.exchange_requests(requester_id);

-- ───────── RLS ─────────
alter table public.exchange_requests enable row level security;

drop policy if exists "exchange_select_party" on public.exchange_requests;
create policy "exchange_select_party" on public.exchange_requests
  for select to authenticated
  using (auth.uid() in (requester_id, recipient_id));

drop policy if exists "exchange_insert_requester" on public.exchange_requests;
create policy "exchange_insert_requester" on public.exchange_requests
  for insert to authenticated
  with check (auth.uid() = requester_id);

drop policy if exists "exchange_update_party" on public.exchange_requests;
create policy "exchange_update_party" on public.exchange_requests
  for update to authenticated
  using (auth.uid() in (requester_id, recipient_id))
  with check (auth.uid() in (requester_id, recipient_id));
```

- [ ] **Step 2: Aplicar la migración en Supabase**

Ejecutar el contenido de `0003_marketplace.sql` en el SQL Editor del proyecto Supabase (mismo flujo manual que `0002`). Verificar que la tabla `exchange_requests` aparece en el Table Editor con RLS habilitado (candado verde).

Expected: tabla creada, 3 políticas listadas, sin errores.

- [ ] **Step 3: Extender los tipos de TypeScript**

Añadir al final de `src/types/database.ts` (después de `WaitlistEntry`, línea 47):

```typescript

/** Estado de una solicitud de intercambio. */
export type ExchangeStatus = "pending" | "accepted" | "rejected" | "cancelled";

/** Fila de la tabla exchange_requests. */
export interface ExchangeRequest {
  id: string;
  requester_id: string;
  recipient_id: string;
  offer_skill: string;
  want_skill: string;
  message: string | null;
  status: ExchangeStatus;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos (solo el preexistente de `button.tsx:50`).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0003_marketplace.sql src/types/database.ts
git commit -m "feat: migración 0003 exchange_requests + tipos del marketplace"
```

---

## Task 2: Schemas Zod del marketplace + helper canRespond (TDD)

**Files:**
- Create: `src/lib/marketplace/schema.ts`
- Test: `src/lib/marketplace/schema.test.ts`

**Interfaces:**
- Consumes: nada (solo Zod).
- Produces:
  - `createExchangeSchema` → infiere `CreateExchangeInput = { recipientId: string; offerSkill: string; wantSkill: string; message?: string }`
  - `respondSchema` → infiere `RespondInput = { requestId: string; action: "accept" | "reject" }`
  - `cancelSchema` → infiere `CancelInput = { requestId: string }`
  - `canRespond(status: ExchangeStatus): boolean`

- [ ] **Step 1: Escribir los tests que fallan**

Crear `src/lib/marketplace/schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  createExchangeSchema,
  respondSchema,
  cancelSchema,
  canRespond,
} from "@/lib/marketplace/schema";

const uuid = "11111111-1111-1111-1111-111111111111";

describe("createExchangeSchema", () => {
  it("acepta una propuesta válida", () => {
    const r = createExchangeSchema.safeParse({
      recipientId: uuid,
      offerSkill: "Diseño UI",
      wantSkill: "Marketing",
      message: "Hola, te propongo un Ayni",
    });
    expect(r.success).toBe(true);
  });

  it("acepta sin mensaje (opcional)", () => {
    const r = createExchangeSchema.safeParse({
      recipientId: uuid,
      offerSkill: "Diseño",
      wantSkill: "SEO",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza recipientId que no es uuid", () => {
    const r = createExchangeSchema.safeParse({
      recipientId: "no-uuid",
      offerSkill: "Diseño",
      wantSkill: "SEO",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza offerSkill vacío", () => {
    const r = createExchangeSchema.safeParse({
      recipientId: uuid,
      offerSkill: "",
      wantSkill: "SEO",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza wantSkill de más de 40 caracteres", () => {
    const r = createExchangeSchema.safeParse({
      recipientId: uuid,
      offerSkill: "Diseño",
      wantSkill: "x".repeat(41),
    });
    expect(r.success).toBe(false);
  });

  it("rechaza message de más de 500 caracteres", () => {
    const r = createExchangeSchema.safeParse({
      recipientId: uuid,
      offerSkill: "Diseño",
      wantSkill: "SEO",
      message: "x".repeat(501),
    });
    expect(r.success).toBe(false);
  });
});

describe("respondSchema", () => {
  it("acepta action 'accept'", () => {
    expect(respondSchema.safeParse({ requestId: uuid, action: "accept" }).success).toBe(true);
  });

  it("acepta action 'reject'", () => {
    expect(respondSchema.safeParse({ requestId: uuid, action: "reject" }).success).toBe(true);
  });

  it("rechaza un action desconocido", () => {
    expect(respondSchema.safeParse({ requestId: uuid, action: "cancel" }).success).toBe(false);
  });
});

describe("cancelSchema", () => {
  it("acepta un requestId uuid", () => {
    expect(cancelSchema.safeParse({ requestId: uuid }).success).toBe(true);
  });

  it("rechaza requestId que no es uuid", () => {
    expect(cancelSchema.safeParse({ requestId: "x" }).success).toBe(false);
  });
});

describe("canRespond", () => {
  it("es true solo para 'pending'", () => {
    expect(canRespond("pending")).toBe(true);
    expect(canRespond("accepted")).toBe(false);
    expect(canRespond("rejected")).toBe(false);
    expect(canRespond("cancelled")).toBe(false);
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run src/lib/marketplace/schema.test.ts`
Expected: FAIL — no se puede importar `@/lib/marketplace/schema` (el archivo no existe).

- [ ] **Step 3: Implementar los schemas**

Crear `src/lib/marketplace/schema.ts`:

```typescript
import { z } from "zod";
import type { ExchangeStatus } from "@/types/database";

const skillName = z.string().min(1).max(40);

/** Propuesta de intercambio: offerSkill (ofrezco) por wantSkill (quiero). */
export const createExchangeSchema = z.object({
  recipientId: z.string().uuid(),
  offerSkill: skillName,
  wantSkill: skillName,
  message: z.string().max(500).optional(),
});

/** Respuesta del destinatario a una solicitud pendiente. */
export const respondSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["accept", "reject"]),
});

/** Cancelación del solicitante. */
export const cancelSchema = z.object({
  requestId: z.string().uuid(),
});

export type CreateExchangeInput = z.infer<typeof createExchangeSchema>;
export type RespondInput = z.infer<typeof respondSchema>;
export type CancelInput = z.infer<typeof cancelSchema>;

/** Solo se puede aceptar/rechazar/cancelar una solicitud en 'pending'. */
export const canRespond = (status: ExchangeStatus): boolean => status === "pending";
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `npx vitest run src/lib/marketplace/schema.test.ts`
Expected: PASS — todos los tests verdes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/marketplace/schema.ts src/lib/marketplace/schema.test.ts
git commit -m "feat: schemas Zod del marketplace + helper canRespond"
```

---

## Task 3: Server Actions de intercambio

**Files:**
- Create: `src/app/(dashboard)/intercambios/actions.ts`

**Interfaces:**
- Consumes: `createExchangeSchema`, `respondSchema`, `cancelSchema`, `canRespond` (Task 2); `createClient` de `@/lib/supabase/server`; tabla `exchange_requests` (Task 1).
- Produces:
  - `ActionResult = { error?: string; code?: string; details?: unknown }`
  - `createExchangeRequest(input: CreateExchangeInput): Promise<ActionResult>`
  - `respondToRequest(input: RespondInput): Promise<ActionResult>`
  - `cancelRequest(input: CancelInput): Promise<ActionResult>`

- [ ] **Step 1: Implementar las tres acciones**

Crear `src/app/(dashboard)/intercambios/actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createExchangeSchema,
  respondSchema,
  cancelSchema,
  canRespond,
  type CreateExchangeInput,
  type RespondInput,
  type CancelInput,
} from "@/lib/marketplace/schema";
import type { ExchangeRequest } from "@/types/database";

export interface ActionResult {
  error?: string;
  code?: string;
  details?: unknown;
}

/** Crea una solicitud de intercambio 'pending' del usuario autenticado al destinatario. */
export const createExchangeRequest = async (
  input: CreateExchangeInput
): Promise<ActionResult> => {
  const parsed = createExchangeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado", code: "UNAUTHENTICATED" };

  const { recipientId, offerSkill, wantSkill, message } = parsed.data;

  if (recipientId === user.id) {
    return { error: "No puedes proponerte un intercambio a ti mismo", code: "SELF_REQUEST" };
  }

  // Evitar duplicados pendientes al mismo destinatario.
  const { data: existing } = await supabase
    .from("exchange_requests")
    .select("id")
    .eq("requester_id", user.id)
    .eq("recipient_id", recipientId)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) {
    return { error: "Ya tienes una solicitud pendiente con esta persona", code: "DUPLICATE" };
  }

  const { error: insertError } = await supabase.from("exchange_requests").insert({
    requester_id: user.id,
    recipient_id: recipientId,
    offer_skill: offerSkill,
    want_skill: wantSkill,
    message: message || null,
  });
  if (insertError) {
    console.error("createExchangeRequest insert error:", insertError);
    return { error: "No pudimos enviar tu propuesta", code: "DB_ERROR" };
  }

  revalidatePath("/intercambios");
  return {};
};

/** El destinatario acepta o rechaza una solicitud pendiente dirigida a él. */
export const respondToRequest = async (input: RespondInput): Promise<ActionResult> => {
  const parsed = respondSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado", code: "UNAUTHENTICATED" };

  const { requestId, action } = parsed.data;

  const { data: row } = await supabase
    .from("exchange_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle<ExchangeRequest>();
  if (!row) return { error: "Solicitud no encontrada", code: "NOT_FOUND" };
  if (row.recipient_id !== user.id) {
    return { error: "No puedes responder esta solicitud", code: "FORBIDDEN" };
  }
  if (!canRespond(row.status)) {
    return { error: "Esta solicitud ya fue resuelta", code: "INVALID_STATE" };
  }

  const { error: updateError } = await supabase
    .from("exchange_requests")
    .update({ status: action === "accept" ? "accepted" : "rejected", updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (updateError) {
    console.error("respondToRequest update error:", updateError);
    return { error: "No pudimos actualizar la solicitud", code: "DB_ERROR" };
  }

  revalidatePath("/intercambios");
  return {};
};

/** El solicitante cancela su propia solicitud pendiente. */
export const cancelRequest = async (input: CancelInput): Promise<ActionResult> => {
  const parsed = cancelSchema.safeParse(input);
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
  if (row.requester_id !== user.id) {
    return { error: "No puedes cancelar esta solicitud", code: "FORBIDDEN" };
  }
  if (!canRespond(row.status)) {
    return { error: "Esta solicitud ya fue resuelta", code: "INVALID_STATE" };
  }

  const { error: updateError } = await supabase
    .from("exchange_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (updateError) {
    console.error("cancelRequest update error:", updateError);
    return { error: "No pudimos cancelar la solicitud", code: "DB_ERROR" };
  }

  revalidatePath("/intercambios");
  return {};
};
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/intercambios/actions.ts"
git commit -m "feat: server actions de intercambio (crear, responder, cancelar)"
```

---

## Task 4: Isla cliente SearchFilters

**Files:**
- Create: `src/components/features/marketplace/SearchFilters.tsx`

**Interfaces:**
- Consumes: `useRouter`, `useSearchParams` de `next/navigation`.
- Produces: `SearchFilters` (componente cliente). Escribe en la URL los params: `q` (skill, requerido para buscar), `kind` (`offer`|`seek`|vacío), `loc`, `avail`.

- [ ] **Step 1: Implementar el componente de filtros**

Crear `src/components/features/marketplace/SearchFilters.tsx`:

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const fieldClass =
  "w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-cocoa focus:border-gold focus:outline-none";
const labelClass = "block text-sm font-medium text-cocoa/70";

/** Isla cliente: escribe los filtros de búsqueda en la URL (debounce 300ms en el texto). */
export const SearchFilters = () => {
  const router = useRouter();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");
  const [kind, setKind] = useState(params.get("kind") ?? "");
  const [loc, setLoc] = useState(params.get("loc") ?? "");
  const [avail, setAvail] = useState(params.get("avail") ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincroniza la URL cuando cambian los filtros (debounce para no spamear la navegación).
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      const next = new URLSearchParams();
      if (q.trim()) next.set("q", q.trim());
      if (kind) next.set("kind", kind);
      if (loc.trim()) next.set("loc", loc.trim());
      if (avail) next.set("avail", avail);
      router.replace(`/explorar?${next.toString()}`);
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [q, kind, loc, avail, router]);

  return (
    <div className="grid gap-4 rounded-3xl border border-cream-300 bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label htmlFor="q" className={labelClass}>Habilidad</label>
        <input
          id="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={fieldClass}
          placeholder="Ej: Diseño UI"
        />
      </div>
      <div>
        <label htmlFor="kind" className={labelClass}>Tipo</label>
        <select id="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={fieldClass}>
          <option value="">Ofrece o busca</option>
          <option value="offer">La ofrece</option>
          <option value="seek">La busca</option>
        </select>
      </div>
      <div>
        <label htmlFor="loc" className={labelClass}>Ubicación</label>
        <input
          id="loc"
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          className={fieldClass}
          placeholder="La Paz"
        />
      </div>
      <div>
        <label htmlFor="avail" className={labelClass}>Disponibilidad</label>
        <select id="avail" value={avail} onChange={(e) => setAvail(e.target.value)} className={fieldClass}>
          <option value="">Cualquiera</option>
          <option value="available">Disponible</option>
          <option value="busy">Ocupado</option>
          <option value="unavailable">No disponible</option>
        </select>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/marketplace/SearchFilters.tsx
git commit -m "feat: isla cliente SearchFilters del marketplace"
```

---

## Task 5: ProposeExchangeButton + ProposeExchangeForm

**Files:**
- Create: `src/components/features/marketplace/ProposeExchangeForm.tsx`
- Create: `src/components/features/marketplace/ProposeExchangeButton.tsx`

**Interfaces:**
- Consumes: `createExchangeRequest` de `@/app/(dashboard)/intercambios/actions` (Task 3); `Button` de `@/components/ui/button`.
- Produces:
  - `ProposeExchangeForm({ recipientId, recipientName, recipientOffers, myOffers, onClose })` donde `recipientOffers: string[]` y `myOffers: string[]`.
  - `ProposeExchangeButton({ recipientId, recipientName, recipientOffers, myOffers })`.

- [ ] **Step 1: Implementar el formulario de propuesta**

Crear `src/components/features/marketplace/ProposeExchangeForm.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createExchangeRequest } from "@/app/(dashboard)/intercambios/actions";

interface ProposeExchangeFormProps {
  recipientId: string;
  recipientName: string;
  /** Skills que el destinatario OFRECE (lo que yo puedo querer). */
  recipientOffers: string[];
  /** Skills que YO ofrezco. */
  myOffers: string[];
  onClose: () => void;
}

const fieldClass =
  "w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-cocoa focus:border-gold focus:outline-none";
const labelClass = "block text-sm font-medium text-cocoa/70";

/** Formulario para proponer un Ayni: elijo qué ofrezco y qué quiero del destinatario. */
export const ProposeExchangeForm = ({
  recipientId,
  recipientName,
  recipientOffers,
  myOffers,
  onClose,
}: ProposeExchangeFormProps) => {
  const router = useRouter();
  const [offerSkill, setOfferSkill] = useState(myOffers[0] ?? "");
  const [wantSkill, setWantSkill] = useState(recipientOffers[0] ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!offerSkill || !wantSkill) {
      setError("Elige qué ofreces y qué quieres.");
      return;
    }

    setSending(true);
    try {
      const result = await createExchangeRequest({ recipientId, offerSkill, wantSkill, message });
      if (result.error) {
        setError(result.error);
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="mt-4 rounded-2xl border border-green/30 bg-green/5 p-4 text-sm text-cocoa">
        ✓ Propuesta enviada a {recipientName}. Te avisaremos en <a href="/intercambios" className="font-semibold text-red hover:underline">Intercambios</a>.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-2xl border border-cream-300 bg-cream/40 p-4">
      <div>
        <label htmlFor={`offer-${recipientId}`} className={labelClass}>Ofrezco</label>
        {myOffers.length === 0 ? (
          <p className="mt-1 text-sm text-cocoa/50">
            Primero agrega habilidades que ofreces en <a href="/perfil/editar" className="font-semibold text-red hover:underline">tu perfil</a>.
          </p>
        ) : (
          <select id={`offer-${recipientId}`} value={offerSkill} onChange={(e) => setOfferSkill(e.target.value)} className={fieldClass}>
            {myOffers.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label htmlFor={`want-${recipientId}`} className={labelClass}>Quiero de {recipientName}</label>
        {recipientOffers.length === 0 ? (
          <p className="mt-1 text-sm text-cocoa/50">Esta persona aún no ofrece habilidades.</p>
        ) : (
          <select id={`want-${recipientId}`} value={wantSkill} onChange={(e) => setWantSkill(e.target.value)} className={fieldClass}>
            {recipientOffers.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label htmlFor={`msg-${recipientId}`} className={labelClass}>Mensaje (opcional)</label>
        <textarea
          id={`msg-${recipientId}`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          maxLength={500}
          className={fieldClass}
          placeholder="Cuéntale tu idea de intercambio"
        />
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" size="sm" disabled={sending || myOffers.length === 0 || recipientOffers.length === 0}>
          {sending ? "Enviando..." : "Enviar propuesta"}
        </Button>
        <Button as="button" type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};
```

- [ ] **Step 2: Implementar el botón que abre/cierra el formulario**

Crear `src/components/features/marketplace/ProposeExchangeButton.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProposeExchangeForm } from "./ProposeExchangeForm";

interface ProposeExchangeButtonProps {
  recipientId: string;
  recipientName: string;
  recipientOffers: string[];
  myOffers: string[];
}

/** CTA "Proponer Ayni": despliega el formulario de propuesta bajo la tarjeta. */
export const ProposeExchangeButton = ({
  recipientId,
  recipientName,
  recipientOffers,
  myOffers,
}: ProposeExchangeButtonProps) => {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button as="button" type="button" size="sm" onClick={() => setOpen(true)}>
        Proponer Ayni
      </Button>
    );
  }

  return (
    <ProposeExchangeForm
      recipientId={recipientId}
      recipientName={recipientName}
      recipientOffers={recipientOffers}
      myOffers={myOffers}
      onClose={() => setOpen(false)}
    />
  );
};
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/marketplace/ProposeExchangeForm.tsx src/components/features/marketplace/ProposeExchangeButton.tsx
git commit -m "feat: componentes para proponer un intercambio (botón + formulario)"
```

---

## Task 6: Helper de búsqueda + ResultsGrid + página /explorar

**Files:**
- Create: `src/lib/marketplace/search.ts`
- Create: `src/components/features/marketplace/ResultsGrid.tsx`
- Create: `src/app/(dashboard)/explorar/page.tsx`

**Interfaces:**
- Consumes: `createClient` de `@/lib/supabase/server`; `PublicProfile` y `ProfileCard` de `@/components/features/profile/ProfileCard`; `UserSkill` de `@/types/database`; `ProposeExchangeButton` (Task 5); `SearchFilters` (Task 4).
- Produces:
  - `SearchResult = { profile: PublicProfile; skills: UserSkill[] }`
  - `searchProfiles(filters): Promise<SearchResult[]>` con `filters = { q: string; kind?: "offer" | "seek"; loc?: string; avail?: string; excludeUserId: string }`
  - `ResultsGrid({ results, myOffers })`

- [ ] **Step 1: Implementar el helper de búsqueda**

Crear `src/lib/marketplace/search.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import type { PublicProfile } from "@/components/features/profile/ProfileCard";
import type { UserSkill } from "@/types/database";

/** Columnas públicas del perfil — nunca incluye email (idéntico a /u/[username]). */
const PUBLIC_COLUMNS =
  "id, full_name, ayni_score, bio, skills, location, username, avatar_url, availability, modality, links, created_at";

export interface SearchFiltersInput {
  q: string;
  kind?: "offer" | "seek";
  loc?: string;
  avail?: string;
  excludeUserId: string;
}

export interface SearchResult {
  profile: PublicProfile;
  skills: UserSkill[];
}

/**
 * Descubre perfiles cuya skill matchee `q`. Hace dos queries:
 *  1) join interno a user_skills para encontrar los perfiles (sin email);
 *  2) trae TODAS las skills de esos perfiles para renderizar la tarjeta completa.
 */
export const searchProfiles = async (filters: SearchFiltersInput): Promise<SearchResult[]> => {
  const { q, kind, loc, avail, excludeUserId } = filters;
  if (!q.trim()) return [];

  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select(`${PUBLIC_COLUMNS}, user_skills!inner(id)`)
    .ilike("user_skills.name", `%${q.trim()}%`)
    .neq("id", excludeUserId);

  if (kind) query = query.eq("user_skills.kind", kind);
  if (loc?.trim()) query = query.ilike("location", `%${loc.trim()}%`);
  if (avail) query = query.eq("availability", avail);

  const { data: matches, error } = await query.returns<PublicProfile[]>();
  if (error) {
    console.error("searchProfiles error:", error);
    return [];
  }
  if (!matches || matches.length === 0) return [];

  // Deduplica por id (un perfil puede matchear por varias skills).
  const byId = new Map<string, PublicProfile>();
  for (const p of matches) byId.set(p.id, p);
  const profiles = [...byId.values()];

  // Segunda query: todas las skills de los perfiles encontrados.
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

- [ ] **Step 2: Implementar ResultsGrid**

Crear `src/components/features/marketplace/ResultsGrid.tsx`:

```typescript
import { ProfileCard } from "@/components/features/profile/ProfileCard";
import { ProposeExchangeButton } from "./ProposeExchangeButton";
import type { SearchResult } from "@/lib/marketplace/search";

interface ResultsGridProps {
  results: SearchResult[];
  /** Skills que el usuario actual ofrece (para precargar el formulario de propuesta). */
  myOffers: string[];
}

/** Grid de tarjetas de perfil con CTA "Proponer Ayni" en cada una. */
export const ResultsGrid = ({ results, myOffers }: ResultsGridProps) => {
  if (results.length === 0) {
    return (
      <p className="mt-8 text-center text-sm text-cocoa/50">
        No encontramos perfiles. Prueba con otra habilidad.
      </p>
    );
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      {results.map(({ profile, skills }) => {
        const recipientOffers = skills.filter((s) => s.kind === "offer").map((s) => s.name);
        const recipientName = profile.full_name?.trim() || profile.username || "Usuario";
        return (
          <div key={profile.id} className="flex flex-col">
            <ProfileCard profile={profile} skills={skills} />
            <div className="mt-3">
              <ProposeExchangeButton
                recipientId={profile.id}
                recipientName={recipientName}
                recipientOffers={recipientOffers}
                myOffers={myOffers}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 3: Implementar la página /explorar**

Crear `src/app/(dashboard)/explorar/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SearchFilters } from "@/components/features/marketplace/SearchFilters";
import { ResultsGrid } from "@/components/features/marketplace/ResultsGrid";
import { searchProfiles } from "@/lib/marketplace/search";
import type { UserSkill } from "@/types/database";

interface PageProps {
  searchParams: Promise<{ q?: string; kind?: string; loc?: string; avail?: string }>;
}

/** Descubrimiento de perfiles por habilidad. Server Component: lee filtros de la URL. */
export default async function ExplorarPage({ searchParams }: PageProps) {
  const { q, kind, loc, avail } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Skills que YO ofrezco (para el formulario de propuesta).
  const { data: mySkills } = await supabase
    .from("user_skills")
    .select("*")
    .eq("user_id", user.id)
    .eq("kind", "offer")
    .returns<UserSkill[]>();
  const myOffers = (mySkills ?? []).map((s) => s.name);

  const results = q?.trim()
    ? await searchProfiles({
        q,
        kind: kind === "offer" || kind === "seek" ? kind : undefined,
        loc,
        avail,
        excludeUserId: user.id,
      })
    : [];

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <h1 className="font-serif text-4xl font-bold text-cocoa">Explorar talento</h1>
      <p className="mt-2 text-sm text-cocoa/60">
        Busca por habilidad y propón un Ayni a quien te interese.
      </p>

      <div className="mt-8">
        <SearchFilters />
      </div>

      {q?.trim() ? (
        <ResultsGrid results={results} myOffers={myOffers} />
      ) : (
        <p className="mt-8 text-center text-sm text-cocoa/50">
          Escribe una habilidad para empezar a buscar.
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 5: Commit**

```bash
git add src/lib/marketplace/search.ts src/components/features/marketplace/ResultsGrid.tsx "src/app/(dashboard)/explorar/page.tsx"
git commit -m "feat: búsqueda de perfiles y página /explorar"
```

---

## Task 7: ExchangeRequestCard + página /intercambios

**Files:**
- Create: `src/components/features/marketplace/ExchangeRequestCard.tsx`
- Create: `src/app/(dashboard)/intercambios/page.tsx`

**Interfaces:**
- Consumes: `respondToRequest`, `cancelRequest` (Task 3); `ExchangeRequest`, `ExchangeStatus`, `ProfileLinks` de `@/types/database`; `createClient` de `@/lib/supabase/server`.
- Produces:
  - `ExchangeParty = { full_name: string | null; username: string | null; links: ProfileLinks }`
  - `ExchangeRequestCard({ request, role, counterpart })` donde `role: "received" | "sent"` y `counterpart: ExchangeParty`.

- [ ] **Step 1: Implementar ExchangeRequestCard**

Crear `src/components/features/marketplace/ExchangeRequestCard.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { respondToRequest, cancelRequest } from "@/app/(dashboard)/intercambios/actions";
import type { ExchangeRequest, ExchangeStatus, ProfileLinks } from "@/types/database";

export interface ExchangeParty {
  full_name: string | null;
  username: string | null;
  links: ProfileLinks;
}

interface ExchangeRequestCardProps {
  request: ExchangeRequest;
  /** "received" = soy el destinatario; "sent" = yo la envié. */
  role: "received" | "sent";
  counterpart: ExchangeParty;
}

const statusLabel: Record<ExchangeStatus, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

const statusColor: Record<ExchangeStatus, string> = {
  pending: "bg-gold/15 text-cocoa",
  accepted: "bg-green/10 text-green",
  rejected: "bg-red/10 text-red",
  cancelled: "bg-cocoa/10 text-cocoa/60",
};

/** Tarjeta de una solicitud de intercambio (recibida o enviada). */
export const ExchangeRequestCard = ({ request, role, counterpart }: ExchangeRequestCardProps) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const name = counterpart.full_name?.trim() || counterpart.username || "Usuario";

  const run = async (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    setBusy(true);
    try {
      const result = await fn();
      if (result.error) setError(result.error);
      else router.refresh();
    } catch {
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const hasLinks = Boolean(
    counterpart.links?.web || counterpart.links?.linkedin || counterpart.links?.github || counterpart.links?.x
  );

  return (
    <div className="rounded-3xl border border-cream-300 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-cocoa/60">
            {role === "received" ? "De" : "Para"} <span className="font-semibold text-cocoa">{name}</span>
          </p>
          <p className="mt-2 text-sm text-cocoa">
            Ofrece <span className="font-semibold text-green">{request.offer_skill}</span> por{" "}
            <span className="font-semibold text-red">{request.want_skill}</span>
          </p>
          {request.message && (
            <p className="mt-2 text-sm leading-relaxed text-cocoa/70">“{request.message}”</p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusColor[request.status]}`}>
          {statusLabel[request.status]}
        </span>
      </div>

      {/* Al aceptar, revelar links de contacto para coordinar fuera de la plataforma. */}
      {request.status === "accepted" && (
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
      )}

      {error && <p className="mt-3 text-sm text-red">{error}</p>}

      {request.status === "pending" && (
        <div className="mt-4 flex gap-3">
          {role === "received" ? (
            <>
              <Button as="button" type="button" size="sm" disabled={busy} onClick={() => run(() => respondToRequest({ requestId: request.id, action: "accept" }))}>
                Aceptar
              </Button>
              <Button as="button" type="button" variant="ghost" size="sm" disabled={busy} onClick={() => run(() => respondToRequest({ requestId: request.id, action: "reject" }))}>
                Rechazar
              </Button>
            </>
          ) : (
            <Button as="button" type="button" variant="ghost" size="sm" disabled={busy} onClick={() => run(() => cancelRequest({ requestId: request.id }))}>
              Cancelar
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Implementar la página /intercambios**

Crear `src/app/(dashboard)/intercambios/page.tsx`:

```typescript
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExchangeRequestCard, type ExchangeParty } from "@/components/features/marketplace/ExchangeRequestCard";
import type { ExchangeRequest } from "@/types/database";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

/** Bandeja de intercambios: recibidas (por defecto) y enviadas, por tab en la URL. */
export default async function IntercambiosPage({ searchParams }: PageProps) {
  const { tab } = await searchParams;
  const activeTab = tab === "sent" ? "sent" : "received";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: received } = await supabase
    .from("exchange_requests")
    .select("*")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .returns<ExchangeRequest[]>();

  const { data: sent } = await supabase
    .from("exchange_requests")
    .select("*")
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false })
    .returns<ExchangeRequest[]>();

  const receivedList = received ?? [];
  const sentList = sent ?? [];
  const rows = activeTab === "received" ? receivedList : sentList;

  // Cargar la contraparte de cada fila (nombre + username + links para revelar al aceptar).
  const counterpartIds = [
    ...new Set(rows.map((r) => (activeTab === "received" ? r.requester_id : r.recipient_id))),
  ];
  const { data: parties } = await supabase
    .from("profiles")
    .select("id, full_name, username, links")
    .in("id", counterpartIds.length > 0 ? counterpartIds : ["00000000-0000-0000-0000-000000000000"])
    .returns<(ExchangeParty & { id: string })[]>();
  const partyById = new Map((parties ?? []).map((p) => [p.id, p]));

  const tabClass = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
      active ? "bg-cocoa text-cream" : "text-cocoa/70 hover:bg-cocoa/5"
    }`;

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <h1 className="font-serif text-4xl font-bold text-cocoa">Intercambios</h1>

      <div className="mt-6 flex gap-2">
        <Link href="/intercambios" className={tabClass(activeTab === "received")}>
          Recibidas{receivedList.length > 0 && ` (${receivedList.length})`}
        </Link>
        <Link href="/intercambios?tab=sent" className={tabClass(activeTab === "sent")}>
          Enviadas{sentList.length > 0 && ` (${sentList.length})`}
        </Link>
      </div>

      <div className="mt-8 space-y-4">
        {rows.length === 0 ? (
          <p className="text-center text-sm text-cocoa/50">
            {activeTab === "received" ? "Aún no tienes solicitudes recibidas." : "Aún no has enviado solicitudes."}
          </p>
        ) : (
          rows.map((request) => {
            const counterpartId = activeTab === "received" ? request.requester_id : request.recipient_id;
            const party = partyById.get(counterpartId) ?? { full_name: null, username: null, links: {} };
            return (
              <ExchangeRequestCard
                key={request.id}
                request={request}
                role={activeTab}
                counterpart={party}
              />
            );
          })
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/marketplace/ExchangeRequestCard.tsx "src/app/(dashboard)/intercambios/page.tsx"
git commit -m "feat: bandeja de intercambios (/intercambios) con recibidas y enviadas"
```

---

## Task 8: Navegación — middleware + enlaces en el dashboard + badge

**Files:**
- Modify: `src/lib/supabase/middleware.ts:36`
- Modify: `src/app/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: `createClient` de `@/lib/supabase/server`; rutas `/explorar` e `/intercambios`.
- Produces: nada (cableado final).

- [ ] **Step 1: Proteger las rutas nuevas en el middleware**

En `src/lib/supabase/middleware.ts` reemplazar la línea 36:

```typescript
  const protectedPaths = ["/dashboard", "/perfil", "/u"];
```

por:

```typescript
  const protectedPaths = ["/dashboard", "/perfil", "/u", "/explorar", "/intercambios"];
```

- [ ] **Step 2: Convertir el layout en async y añadir navegación + badge**

Reemplazar el contenido completo de `src/app/(dashboard)/layout.tsx`:

```typescript
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

/** Shell del área privada: topbar con logo, navegación y botón de cerrar sesión. */
export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Badge: solicitudes recibidas pendientes.
  let pendingCount = 0;
  if (user) {
    const { count } = await supabase
      .from("exchange_requests")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-cream-300 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              aria-label="AynAI — Inicio"
              className="font-serif text-2xl font-bold tracking-tight"
            >
              <span className="text-cocoa">Ayn</span>
              <span className="text-red">AI</span>
            </Link>
            <nav className="hidden items-center gap-5 sm:flex">
              <Link href="/explorar" className="text-sm font-medium text-cocoa/75 transition-colors hover:text-red">
                Explorar
              </Link>
              <Link href="/intercambios" className="relative text-sm font-medium text-cocoa/75 transition-colors hover:text-red">
                Intercambios
                {pendingCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center rounded-full bg-red px-1.5 text-[0.65rem] font-bold text-cream">
                    {pendingCount}
                  </span>
                )}
              </Link>
            </nav>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-full px-4 py-2 text-sm font-semibold text-cocoa/75 transition-colors hover:bg-cocoa/5 hover:text-red"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 4: Verificación manual del flujo completo**

Run: `npm run dev`

Con dos cuentas (A y B):
1. Con B: agregar skills (ofrece "Diseño", busca "Marketing") en `/perfil/editar`.
2. Con A: ir a `/explorar`, buscar "Diseño" → aparece B sin email visible.
3. Con A: "Proponer Ayni" a B → elegir ofrezco/quiero + mensaje → enviar.
4. Con B: ver badge en "Intercambios", abrir `/intercambios` (recibidas) → Aceptar.
5. Con A: `/intercambios?tab=sent` → ver estado "Aceptada" + links de contacto de B.
6. Probar Rechazar y Cancelar en solicitudes nuevas.

Expected: el email nunca aparece en `/explorar`; las transiciones de estado funcionan; el badge refleja las pendientes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/middleware.ts "src/app/(dashboard)/layout.tsx"
git commit -m "feat: navegación del marketplace, protección de rutas y badge de pendientes"
```

---

## Verificación final (después de todas las tareas)

- [ ] `npx vitest run` — todos los tests verdes (incluye `schema.test.ts` de perfil y marketplace).
- [ ] `npx tsc --noEmit` — solo el error preexistente de `button.tsx:50`.
- [ ] Flujo manual del Task 8 Step 4 completo y confirmado.

---

## Notas de cierre

- **Fuera de alcance (Fase 2 / futuro):** matching recíproco "Ayni" destacado, chat/mensajería, escrow on-chain, notificaciones por email, monorepo.
- Al integrar la rama, usar la skill `superpowers:finishing-a-development-branch`.
</content>
</invoke>
