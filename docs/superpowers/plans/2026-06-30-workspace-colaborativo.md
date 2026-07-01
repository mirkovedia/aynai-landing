# Workspace Colaborativo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un workspace compartido por intercambio aceptado, con checklist de hitos en tiempo real y notas colaborativas, para que los dos participantes coordinen su trabajo sin salir de AYNAI.

**Architecture:** Dos tablas nuevas en Supabase (`exchange_milestones` y `exchange_notes`). La página `/intercambios/[id]` pasa a tener un layout de dos columnas (chat izquierda, workspace derecha). El `WorkspacePanel` es un componente cliente que usa Supabase Realtime para reflejar cambios de la contraparte en tiempo real. Las notas se auto-guardan con debounce de 1.5 s. Los hitos se actualizan optimísticamente.

**Tech Stack:** Next.js 15 App Router · Supabase (PostgreSQL + Realtime) · TypeScript strict · Tailwind CSS · Vitest (node env) · Supabase MCP para migraciones

## Global Constraints

- TypeScript strict, nunca `any` — usar `unknown` + type guards
- Named exports por defecto; default export solo para páginas Next.js
- `async/await` siempre, nunca `.then()`
- Componentes cliente marcados con `"use client"` solo cuando usan hooks o eventos
- Variables y funciones en inglés; comentarios y mensajes de usuario en español
- Tests en `vitest` con `environment: "node"` — sin jsdom; solo lógica pura testeable
- Aplicar migraciones vía Supabase MCP (`mcp__plugin_supabase_supabase__apply_migration`), project_id: `qyzqwocpdpqesixwbdfb`
- Verificar TypeScript limpio (`npx tsc --noEmit`) y tests pasando (`npx vitest run`) después de cada tarea

---

## File Map

### Nuevos archivos
| Archivo | Responsabilidad |
|---------|-----------------|
| `supabase/migrations/0012_workspace.sql` | Tablas `exchange_milestones` + `exchange_notes` con RLS + Realtime |
| `src/lib/workspace/schema.ts` | Validación pura: `validateMilestoneTitle`, `validateNoteContent` |
| `src/lib/workspace/schema.test.ts` | Tests unitarios de las funciones de validación |
| `src/components/features/workspace/WorkspacePanel.tsx` | Componente cliente principal: compone hitos + notas + Realtime |
| `src/components/features/workspace/MilestoneList.tsx` | Sub-componente: lista de hitos con checkbox, add form, barra de progreso |
| `src/components/features/workspace/Notepad.tsx` | Sub-componente: textarea colaborativa con auto-save + indicador |

### Archivos modificados
| Archivo | Qué cambia |
|---------|------------|
| `src/types/database.ts` | Añadir interfaces `Milestone` y `ExchangeNote` |
| `src/types/supabase.ts` | Añadir tablas `exchange_milestones` y `exchange_notes` al tipo `Database` |
| `src/app/(dashboard)/intercambios/[id]/actions.ts` | Añadir `addMilestone`, `toggleMilestone`, `deleteMilestone`, `saveNote` |
| `src/app/(dashboard)/intercambios/[id]/page.tsx` | Layout dos columnas; cargar datos iniciales de workspace |

---

## Task 1: Migración SQL + Tipos TypeScript

**Files:**
- Create: `supabase/migrations/0012_workspace.sql`
- Modify: `src/types/database.ts`
- Modify: `src/types/supabase.ts`

**Interfaces producidas:**
```typescript
// src/types/database.ts
export interface Milestone {
  id: string;
  exchange_request_id: string;
  created_by: string;
  title: string;
  completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  position: number;
  created_at: string;
}

export interface ExchangeNote {
  id: string;
  exchange_request_id: string;
  content: string;
  updated_by: string;
  updated_at: string;
  created_at: string;
}
```

- [ ] **Step 1: Escribir la migración SQL**

Crear `supabase/migrations/0012_workspace.sql` con este contenido exacto:

```sql
-- Hitos del workspace colaborativo
create table public.exchange_milestones (
  id                   uuid        primary key default gen_random_uuid(),
  exchange_request_id  uuid        not null references public.exchange_requests(id) on delete cascade,
  created_by           uuid        not null references auth.users(id) on delete cascade,
  title                text        not null check (char_length(title) between 1 and 200),
  completed            boolean     not null default false,
  completed_by         uuid        references auth.users(id) on delete set null,
  completed_at         timestamptz,
  position             integer     not null default 0,
  created_at           timestamptz not null default now()
);

create index milestones_exchange_idx on public.exchange_milestones(exchange_request_id, position);

alter table public.exchange_milestones enable row level security;

-- Solo participantes del intercambio pueden ver y gestionar hitos
create policy "participantes_ven_hitos"
  on public.exchange_milestones for select
  using (
    exists (
      select 1 from public.exchange_requests er
      where er.id = exchange_milestones.exchange_request_id
        and (er.requester_id = auth.uid() or er.recipient_id = auth.uid())
    )
  );

create policy "participantes_insertan_hitos"
  on public.exchange_milestones for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.exchange_requests er
      where er.id = exchange_request_id
        and (er.requester_id = auth.uid() or er.recipient_id = auth.uid())
        and er.status in ('accepted', 'completed')
    )
  );

create policy "participantes_actualizan_hitos"
  on public.exchange_milestones for update
  using (
    exists (
      select 1 from public.exchange_requests er
      where er.id = exchange_milestones.exchange_request_id
        and (er.requester_id = auth.uid() or er.recipient_id = auth.uid())
    )
  );

create policy "creador_elimina_hito"
  on public.exchange_milestones for delete
  using (created_by = auth.uid());

-- Notas compartidas (una fila por intercambio, se hace upsert)
create table public.exchange_notes (
  id                   uuid        primary key default gen_random_uuid(),
  exchange_request_id  uuid        not null unique references public.exchange_requests(id) on delete cascade,
  content              text        not null default '' check (char_length(content) <= 5000),
  updated_by           uuid        not null references auth.users(id) on delete cascade,
  updated_at           timestamptz not null default now(),
  created_at           timestamptz not null default now()
);

alter table public.exchange_notes enable row level security;

create policy "participantes_ven_notas"
  on public.exchange_notes for select
  using (
    exists (
      select 1 from public.exchange_requests er
      where er.id = exchange_notes.exchange_request_id
        and (er.requester_id = auth.uid() or er.recipient_id = auth.uid())
    )
  );

create policy "participantes_gestionan_notas"
  on public.exchange_notes for all
  using (
    exists (
      select 1 from public.exchange_requests er
      where er.id = exchange_notes.exchange_request_id
        and (er.requester_id = auth.uid() or er.recipient_id = auth.uid())
        and er.status in ('accepted', 'completed')
    )
  )
  with check (
    updated_by = auth.uid()
    and exists (
      select 1 from public.exchange_requests er
      where er.id = exchange_request_id
        and (er.requester_id = auth.uid() or er.recipient_id = auth.uid())
        and er.status in ('accepted', 'completed')
    )
  );

-- Activar Realtime en ambas tablas
alter publication supabase_realtime add table public.exchange_milestones;
alter publication supabase_realtime add table public.exchange_notes;
```

- [ ] **Step 2: Aplicar migración vía Supabase MCP**

Llamar a `mcp__plugin_supabase_supabase__apply_migration` con:
- `project_id`: `qyzqwocpdpqesixwbdfb`
- `name`: `0012_workspace`
- `query`: el SQL del step anterior

Verificar que `"success": true`.

- [ ] **Step 3: Añadir tipos a `src/types/database.ts`**

Insertar justo antes de `/** Resumen de reputación... */`:

```typescript
/** Fila de la tabla exchange_milestones. */
export interface Milestone {
  id: string;
  exchange_request_id: string;
  created_by: string;
  title: string;
  completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  position: number;
  created_at: string;
}

/** Fila de la tabla exchange_notes (una por intercambio). */
export interface ExchangeNote {
  id: string;
  exchange_request_id: string;
  content: string;
  updated_by: string;
  updated_at: string;
  created_at: string;
}
```

- [ ] **Step 4: Añadir tablas al tipo `Database` en `src/types/supabase.ts`**

Insertar antes de `messages: {` (que es la primera tabla actualmente):

```typescript
      exchange_milestones: {
        Row: {
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          exchange_request_id: string
          id: string
          position: number
          title: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          exchange_request_id: string
          id?: string
          position?: number
          title: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          exchange_request_id?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: []
      }
      exchange_notes: {
        Row: {
          content: string
          created_at: string
          exchange_request_id: string
          id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          content?: string
          created_at?: string
          exchange_request_id: string
          id?: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          content?: string
          created_at?: string
          exchange_request_id?: string
          id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
```

- [ ] **Step 5: Verificar TypeScript limpio**

```bash
npx tsc --noEmit
```
Salida esperada: sin output (cero errores).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0012_workspace.sql src/types/database.ts src/types/supabase.ts
git commit -m "feat: migración workspace colaborativo + tipos Milestone y ExchangeNote"
```

---

## Task 2: Schema de validación + Server Actions

**Files:**
- Create: `src/lib/workspace/schema.ts`
- Create: `src/lib/workspace/schema.test.ts`
- Modify: `src/app/(dashboard)/intercambios/[id]/actions.ts`

**Interfaces producidas:**
```typescript
// src/lib/workspace/schema.ts
validateMilestoneTitle(title: unknown): Result<string>
validateNoteContent(content: unknown): Result<string>

// src/app/(dashboard)/intercambios/[id]/actions.ts (nuevas funciones)
addMilestone({ exchangeId, title }: { exchangeId: string; title: string }): Promise<{ error?: string }>
toggleMilestone({ milestoneId, exchangeId }: { milestoneId: string; exchangeId: string }): Promise<{ error?: string }>
deleteMilestone({ milestoneId, exchangeId }: { milestoneId: string; exchangeId: string }): Promise<{ error?: string }>
saveNote({ exchangeId, content }: { exchangeId: string; content: string }): Promise<{ error?: string }>
```

- [ ] **Step 1: Escribir los tests primero — `src/lib/workspace/schema.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { validateMilestoneTitle, validateNoteContent } from "@/lib/workspace/schema";

const VALID_UUID = "11111111-1111-1111-1111-111111111111";

describe("validateMilestoneTitle", () => {
  it("acepta un título normal", () => {
    const r = validateMilestoneTitle("Entregar diseño de pantalla principal");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("Entregar diseño de pantalla principal");
  });

  it("hace trim al título", () => {
    const r = validateMilestoneTitle("  Hito con espacios  ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("Hito con espacios");
  });

  it("rechaza título vacío", () => {
    expect(validateMilestoneTitle("").ok).toBe(false);
  });

  it("rechaza solo espacios", () => {
    expect(validateMilestoneTitle("   ").ok).toBe(false);
  });

  it("rechaza título de más de 200 caracteres", () => {
    expect(validateMilestoneTitle("x".repeat(201)).ok).toBe(false);
  });

  it("acepta exactamente 200 caracteres", () => {
    expect(validateMilestoneTitle("x".repeat(200)).ok).toBe(true);
  });

  it("rechaza un número", () => {
    expect(validateMilestoneTitle(42).ok).toBe(false);
  });
});

describe("validateNoteContent", () => {
  it("acepta contenido normal", () => {
    const r = validateNoteContent("Acordamos entregar en dos semanas.");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("Acordamos entregar en dos semanas.");
  });

  it("acepta string vacío (borrar la nota)", () => {
    const r = validateNoteContent("");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("");
  });

  it("rechaza contenido de más de 5000 caracteres", () => {
    expect(validateNoteContent("x".repeat(5001)).ok).toBe(false);
  });

  it("acepta exactamente 5000 caracteres", () => {
    expect(validateNoteContent("x".repeat(5000)).ok).toBe(true);
  });

  it("rechaza un número", () => {
    expect(validateNoteContent(123).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar tests — deben fallar**

```bash
npx vitest run src/lib/workspace/schema.test.ts
```
Esperado: FAIL con "Cannot find module '@/lib/workspace/schema'".

- [ ] **Step 3: Crear `src/lib/workspace/schema.ts`**

```typescript
type Ok<T> = { ok: true; value: T };
type Err = { ok: false; error: string };
type Result<T> = Ok<T> | Err;

/** Valida y sanitiza el título de un hito (1–200 chars). */
export const validateMilestoneTitle = (title: unknown): Result<string> => {
  if (typeof title !== "string") {
    return { ok: false, error: "Título inválido." };
  }
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "El título no puede estar vacío." };
  }
  if (trimmed.length > 200) {
    return { ok: false, error: "El título no puede superar los 200 caracteres." };
  }
  return { ok: true, value: trimmed };
};

/** Valida el contenido de la nota compartida (0–5000 chars). Acepta vacío para borrar. */
export const validateNoteContent = (content: unknown): Result<string> => {
  if (typeof content !== "string") {
    return { ok: false, error: "Contenido inválido." };
  }
  if (content.length > 5000) {
    return { ok: false, error: "La nota no puede superar los 5000 caracteres." };
  }
  return { ok: true, value: content };
};
```

- [ ] **Step 4: Ejecutar tests — deben pasar**

```bash
npx vitest run src/lib/workspace/schema.test.ts
```
Esperado: 10 tests PASS.

- [ ] **Step 5: Añadir server actions en `src/app/(dashboard)/intercambios/[id]/actions.ts`**

Añadir al inicio del archivo (después de `"use server";`):

```typescript
import { validateMilestoneTitle, validateNoteContent } from "@/lib/workspace/schema";
import { validateExchangeId } from "@/lib/chat/schema";
```

Luego añadir estas 4 funciones al final del archivo:

```typescript
/** Añade un hito al workspace del intercambio. */
export async function addMilestone({
  exchangeId,
  title,
}: {
  exchangeId: string;
  title: string;
}): Promise<{ error?: string }> {
  const idResult = validateExchangeId(exchangeId);
  if (!idResult.ok) return { error: idResult.error };

  const titleResult = validateMilestoneTitle(title);
  if (!titleResult.ok) return { error: titleResult.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  // Calcular la posición como max + 1
  const { data: last } = await supabase
    .from("exchange_milestones")
    .select("position")
    .eq("exchange_request_id", exchangeId)
    .order("position", { ascending: false })
    .limit(1)
    .returns<{ position: number }[]>();

  const position = (last?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from("exchange_milestones").insert({
    exchange_request_id: exchangeId,
    created_by: user.id,
    title: titleResult.value,
    position,
  });

  if (error) return { error: "No se pudo añadir el hito." };
  return {};
}

/** Alterna el estado completado/pendiente de un hito. */
export async function toggleMilestone({
  milestoneId,
  exchangeId,
}: {
  milestoneId: string;
  exchangeId: string;
}): Promise<{ error?: string }> {
  const idResult = validateExchangeId(exchangeId);
  if (!idResult.ok) return { error: idResult.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { data: current } = await supabase
    .from("exchange_milestones")
    .select("completed")
    .eq("id", milestoneId)
    .eq("exchange_request_id", exchangeId)
    .single<{ completed: boolean }>();

  if (!current) return { error: "Hito no encontrado." };

  const nowCompleted = !current.completed;
  const { error } = await supabase
    .from("exchange_milestones")
    .update({
      completed: nowCompleted,
      completed_by: nowCompleted ? user.id : null,
      completed_at: nowCompleted ? new Date().toISOString() : null,
    })
    .eq("id", milestoneId)
    .eq("exchange_request_id", exchangeId);

  if (error) return { error: "No se pudo actualizar el hito." };
  return {};
}

/** Elimina un hito (solo el creador puede eliminarlo). */
export async function deleteMilestone({
  milestoneId,
  exchangeId,
}: {
  milestoneId: string;
  exchangeId: string;
}): Promise<{ error?: string }> {
  const idResult = validateExchangeId(exchangeId);
  if (!idResult.ok) return { error: idResult.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase
    .from("exchange_milestones")
    .delete()
    .eq("id", milestoneId)
    .eq("exchange_request_id", exchangeId)
    .eq("created_by", user.id);

  if (error) return { error: "No se pudo eliminar el hito." };
  return {};
}

/** Guarda (upsert) la nota compartida del intercambio. */
export async function saveNote({
  exchangeId,
  content,
}: {
  exchangeId: string;
  content: string;
}): Promise<{ error?: string }> {
  const idResult = validateExchangeId(exchangeId);
  if (!idResult.ok) return { error: idResult.error };

  const contentResult = validateNoteContent(content);
  if (!contentResult.ok) return { error: contentResult.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase
    .from("exchange_notes")
    .upsert(
      {
        exchange_request_id: exchangeId,
        content: contentResult.value,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "exchange_request_id" }
    );

  if (error) return { error: "No se pudo guardar la nota." };
  return {};
}
```

- [ ] **Step 6: Verificar TypeScript y todos los tests**

```bash
npx tsc --noEmit && npx vitest run
```
Esperado: sin errores TypeScript, 91+ tests PASS (81 anteriores + 10 nuevos).

- [ ] **Step 7: Commit**

```bash
git add src/lib/workspace/schema.ts src/lib/workspace/schema.test.ts src/app/"(dashboard)"/intercambios/"[id]"/actions.ts
git commit -m "feat: validación workspace y server actions de hitos y notas"
```

---

## Task 3: Componentes WorkspacePanel

**Files:**
- Create: `src/components/features/workspace/MilestoneList.tsx`
- Create: `src/components/features/workspace/Notepad.tsx`
- Create: `src/components/features/workspace/WorkspacePanel.tsx`

**Interfaces consumidas de tareas anteriores:**
```typescript
import type { Milestone, ExchangeNote } from "@/types/database";
import { addMilestone, toggleMilestone, deleteMilestone, saveNote } from "@/app/(dashboard)/intercambios/[id]/actions";
```

- [ ] **Step 1: Crear `src/components/features/workspace/MilestoneList.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { addMilestone, toggleMilestone, deleteMilestone } from "@/app/(dashboard)/intercambios/[id]/actions";
import type { Milestone } from "@/types/database";

interface Props {
  exchangeId: string;
  currentUserId: string;
  milestones: Milestone[];
  onOptimisticUpdate: (milestones: Milestone[]) => void;
}

/** Lista de hitos del workspace con barra de progreso, toggle y formulario de añadir. */
export const MilestoneList = ({ exchangeId, currentUserId, milestones, onOptimisticUpdate }: Props) => {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const completed = milestones.filter((m) => m.completed).length;
  const total = milestones.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleToggle = (milestone: Milestone) => {
    // Actualización optimista
    onOptimisticUpdate(
      milestones.map((m) =>
        m.id === milestone.id
          ? { ...m, completed: !m.completed, completed_by: !m.completed ? currentUserId : null, completed_at: !m.completed ? new Date().toISOString() : null }
          : m
      )
    );
    startTransition(async () => {
      const result = await toggleMilestone({ milestoneId: milestone.id, exchangeId });
      if (result.error) {
        // Revertir
        onOptimisticUpdate(milestones);
        toast(result.error, "error");
      }
    });
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const tempId = `opt-${Date.now()}`;
    const optimistic: Milestone = {
      id: tempId,
      exchange_request_id: exchangeId,
      created_by: currentUserId,
      title: newTitle.trim(),
      completed: false,
      completed_by: null,
      completed_at: null,
      position: milestones.length,
      created_at: new Date().toISOString(),
    };
    onOptimisticUpdate([...milestones, optimistic]);
    const titleToSend = newTitle.trim();
    setNewTitle("");
    setAdding(false);
    startTransition(async () => {
      const result = await addMilestone({ exchangeId, title: titleToSend });
      if (result.error) {
        onOptimisticUpdate(milestones);
        toast(result.error, "error");
      }
    });
  };

  const handleDelete = (milestone: Milestone) => {
    onOptimisticUpdate(milestones.filter((m) => m.id !== milestone.id));
    startTransition(async () => {
      const result = await deleteMilestone({ milestoneId: milestone.id, exchangeId });
      if (result.error) {
        onOptimisticUpdate(milestones);
        toast(result.error, "error");
      }
    });
  };

  return (
    <div>
      {/* Barra de progreso */}
      {total > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-cocoa/50 mb-1">
            <span>Progreso</span>
            <span>{completed}/{total} hitos</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-cream-200">
            <div
              className="h-1.5 rounded-full bg-green transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Lista de hitos */}
      <ul className="space-y-2">
        {milestones.map((m) => (
          <li key={m.id} className="flex items-center gap-2 group">
            <button
              type="button"
              disabled={pending || m.id.startsWith("opt-")}
              onClick={() => handleToggle(m)}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                m.completed
                  ? "border-green bg-green text-white"
                  : "border-cream-300 bg-white hover:border-green"
              }`}
              aria-label={m.completed ? "Marcar como pendiente" : "Marcar como completado"}
            >
              {m.completed && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span className={`flex-1 text-sm ${m.completed ? "line-through text-cocoa/40" : "text-cocoa"} ${m.id.startsWith("opt-") ? "opacity-50" : ""}`}>
              {m.title}
            </span>
            {m.created_by === currentUserId && !m.id.startsWith("opt-") && (
              <button
                type="button"
                disabled={pending}
                onClick={() => handleDelete(m)}
                className="invisible text-xs text-cocoa/30 hover:text-red transition-colors group-hover:visible"
                aria-label="Eliminar hito"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Formulario para añadir */}
      {adding ? (
        <div className="mt-3 flex gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } if (e.key === "Escape") setAdding(false); }}
            placeholder="Nombre del hito…"
            maxLength={200}
            autoFocus
            className="flex-1 rounded-lg border border-cream-300 bg-white px-3 py-1.5 text-sm text-cocoa placeholder:text-cocoa/40 focus:outline-none focus:ring-2 focus:ring-cocoa/20"
          />
          <button type="button" onClick={handleAdd} disabled={!newTitle.trim() || pending} className="rounded-lg bg-cocoa px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-50">
            Añadir
          </button>
          <button type="button" onClick={() => setAdding(false)} className="rounded-lg px-2 py-1.5 text-xs text-cocoa/50 hover:text-cocoa">
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-cocoa/50 hover:text-cocoa transition-colors"
        >
          <span aria-hidden="true">+</span> Añadir hito
        </button>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Crear `src/components/features/workspace/Notepad.tsx`**

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { saveNote } from "@/app/(dashboard)/intercambios/[id]/actions";

interface Props {
  exchangeId: string;
  initialContent: string;
  onExternalUpdate: (content: string) => void;
  externalContent: string;
}

/** Textarea colaborativa con auto-save debounced de 1.5 s y sincronización Realtime. */
export const Notepad = ({ exchangeId, initialContent, onExternalUpdate: _, externalContent }: Props) => {
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(initialContent);

  // Sincronizar cambios externos (Realtime de la contraparte)
  useEffect(() => {
    if (externalContent !== lastSavedRef.current) {
      setContent(externalContent);
      lastSavedRef.current = externalContent;
    }
  }, [externalContent]);

  const handleChange = (value: string) => {
    setContent(value);
    setStatus("idle");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setStatus("saving");
      const result = await saveNote({ exchangeId, content: value });
      if (result.error) {
        setStatus("error");
      } else {
        lastSavedRef.current = value;
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      }
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-cocoa/50">Notas compartidas</span>
        <span className={`text-xs transition-opacity ${status === "idle" ? "opacity-0" : "opacity-100"} ${status === "saving" ? "text-cocoa/50" : status === "saved" ? "text-green" : "text-red"}`}>
          {status === "saving" && "Guardando…"}
          {status === "saved" && "✓ Guardado"}
          {status === "error" && "Error al guardar"}
        </span>
      </div>
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Anoten aquí los acuerdos, entregables, fechas… ambos pueden editar."
        maxLength={5000}
        rows={6}
        className="w-full resize-none rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 text-sm text-cocoa placeholder:text-cocoa/30 focus:outline-none focus:ring-2 focus:ring-cocoa/20 leading-relaxed"
      />
      <p className="mt-1 text-right text-xs text-cocoa/30">{content.length}/5000</p>
    </div>
  );
};
```

- [ ] **Step 3: Crear `src/components/features/workspace/WorkspacePanel.tsx`**

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MilestoneList } from "./MilestoneList";
import { Notepad } from "./Notepad";
import type { Milestone, ExchangeNote } from "@/types/database";

interface Props {
  exchangeId: string;
  currentUserId: string;
  initialMilestones: Milestone[];
  initialNote: ExchangeNote | null;
}

/** Panel de workspace colaborativo: hitos + notas con Realtime. */
export const WorkspacePanel = ({
  exchangeId,
  currentUserId,
  initialMilestones,
  initialNote,
}: Props) => {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [noteContent, setNoteContent] = useState(initialNote?.content ?? "");
  const supabaseRef = useRef(createClient());

  // Realtime: escuchar cambios en hitos
  useEffect(() => {
    const supabase = supabaseRef.current;

    const milestonesChannel = supabase
      .channel(`workspace-milestones-${exchangeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exchange_milestones",
          filter: `exchange_request_id=eq.${exchangeId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const incoming = payload.new as Milestone;
            setMilestones((prev) =>
              prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
            );
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Milestone;
            setMilestones((prev) =>
              prev.map((m) => (m.id === updated.id ? updated : m))
            );
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            setMilestones((prev) => prev.filter((m) => m.id !== deleted.id));
          }
        }
      )
      .subscribe();

    const notesChannel = supabase
      .channel(`workspace-notes-${exchangeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exchange_notes",
          filter: `exchange_request_id=eq.${exchangeId}`,
        },
        (payload) => {
          const updated = payload.new as ExchangeNote;
          // Solo actualizar si el cambio vino de la contraparte
          if (updated.updated_by !== currentUserId) {
            setNoteContent(updated.content);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(milestonesChannel);
      void supabase.removeChannel(notesChannel);
    };
  }, [exchangeId, currentUserId]);

  return (
    <div className="flex h-full flex-col gap-6 rounded-2xl border border-cream-300 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-base" aria-hidden="true">📋</span>
        <h2 className="text-sm font-semibold text-cocoa">Workspace</h2>
      </div>

      {/* Hitos */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-cocoa/40">
          Hitos
        </h3>
        <MilestoneList
          exchangeId={exchangeId}
          currentUserId={currentUserId}
          milestones={milestones}
          onOptimisticUpdate={setMilestones}
        />
      </section>

      {/* Notas */}
      <section className="flex-1">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-cocoa/40">
          Notas
        </h3>
        <Notepad
          exchangeId={exchangeId}
          initialContent={initialNote?.content ?? ""}
          externalContent={noteContent}
          onExternalUpdate={setNoteContent}
        />
      </section>
    </div>
  );
};
```

- [ ] **Step 4: Verificar TypeScript limpio**

```bash
npx tsc --noEmit
```
Salida esperada: sin output.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/workspace/
git commit -m "feat: componentes WorkspacePanel, MilestoneList y Notepad con Realtime"
```

---

## Task 4: Layout de la página de intercambio + carga de datos

**Files:**
- Modify: `src/app/(dashboard)/intercambios/[id]/page.tsx`

**Interfaces consumidas:**
```typescript
import { WorkspacePanel } from "@/components/features/workspace/WorkspacePanel";
import type { Milestone, ExchangeNote } from "@/types/database";
```

- [ ] **Step 1: Reescribir `src/app/(dashboard)/intercambios/[id]/page.tsx`**

Reemplazar el contenido completo del archivo con:

```typescript
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChatWindow } from "@/components/features/chat/ChatWindow";
import { WorkspacePanel } from "@/components/features/workspace/WorkspacePanel";
import type { ExchangeRequest, Message, Milestone, ExchangeNote } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Página de intercambio: chat (izquierda) + workspace colaborativo (derecha). */
export default async function ExchangePage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verificar participación y estado del intercambio
  const { data: exchange } = await supabase
    .from("exchange_requests")
    .select("id, requester_id, recipient_id, offer_skill, want_skill, status")
    .eq("id", id)
    .single<Pick<ExchangeRequest, "id" | "requester_id" | "recipient_id" | "offer_skill" | "want_skill" | "status">>();

  if (!exchange) notFound();

  const isParticipant = exchange.requester_id === user.id || exchange.recipient_id === user.id;
  if (!isParticipant) notFound();

  if (exchange.status !== "accepted" && exchange.status !== "completed") {
    redirect("/intercambios");
  }

  const counterpartId =
    exchange.requester_id === user.id ? exchange.recipient_id : exchange.requester_id;

  // Cargar todo en paralelo
  const [
    { data: counterpart },
    { data: messages },
    { data: milestones },
    { data: note },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", counterpartId)
      .single<{ full_name: string | null; username: string | null }>(),
    supabase
      .from("messages")
      .select("id, exchange_request_id, sender_id, content, read_at, created_at")
      .eq("exchange_request_id", id)
      .order("created_at", { ascending: true })
      .limit(100)
      .returns<Message[]>(),
    supabase
      .from("exchange_milestones")
      .select("id, exchange_request_id, created_by, title, completed, completed_by, completed_at, position, created_at")
      .eq("exchange_request_id", id)
      .order("position", { ascending: true })
      .returns<Milestone[]>(),
    supabase
      .from("exchange_notes")
      .select("id, exchange_request_id, content, updated_by, updated_at, created_at")
      .eq("exchange_request_id", id)
      .maybeSingle<ExchangeNote>(),
  ]);

  const counterpartName =
    counterpart?.full_name?.trim() || counterpart?.username || "tu contraparte";

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/intercambios"
          className="text-sm text-cocoa/60 hover:text-cocoa transition-colors"
        >
          ← Intercambios
        </Link>
        <span className="text-cocoa/30">/</span>
        <span className="text-sm font-semibold text-cocoa">
          {exchange.offer_skill} ↔ {exchange.want_skill}
        </span>
        {exchange.status === "completed" && (
          <span className="rounded-full bg-green/10 px-2 py-0.5 text-xs font-medium text-green">
            Completado
          </span>
        )}
      </div>

      {/* Layout: chat + workspace */}
      <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
        {/* Chat */}
        <ChatWindow
          exchangeId={id}
          currentUserId={user.id}
          initialMessages={messages ?? []}
          counterpartName={counterpartName}
        />

        {/* Workspace */}
        <WorkspacePanel
          exchangeId={id}
          currentUserId={user.id}
          initialMilestones={milestones ?? []}
          initialNote={note ?? null}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verificar TypeScript limpio y tests pasando**

```bash
npx tsc --noEmit && npx vitest run
```
Esperado: sin errores TypeScript, 91 tests PASS.

- [ ] **Step 3: Verificar build de producción**

```bash
npm run build
```
Esperado: build exitoso. La ruta `/intercambios/[id]` debe aparecer en la tabla de rutas.

- [ ] **Step 4: Commit final**

```bash
git add src/app/"(dashboard)"/intercambios/"[id]"/page.tsx
git commit -m "feat: workspace colaborativo con chat + hitos + notas en tiempo real"
```

---

## Self-Review

### Spec coverage
| Requisito | Tarea |
|-----------|-------|
| Checklist de hitos compartidos | Task 1 (schema) + Task 2 (actions) + Task 3 (MilestoneList) |
| Realtime — hito toggle visible para la contraparte | Task 3 (WorkspacePanel Realtime canal `exchange_milestones`) |
| Notas colaborativas con auto-save | Task 3 (Notepad debounce 1.5s) |
| Realtime — nota visible para la contraparte | Task 3 (WorkspacePanel Realtime canal `exchange_notes`) |
| Barra de progreso de hitos | Task 3 (MilestoneList `progress`) |
| Layout dos columnas chat + workspace | Task 4 |
| Solo participantes del intercambio pueden acceder | Task 1 (RLS) + Task 4 (verificación server-side) |
| Solo disponible en intercambios `accepted`/`completed` | Task 1 (RLS INSERT check) + Task 4 (redirect) |
| Carga de datos en paralelo | Task 4 (Promise.all de 4 queries) |
| TypeScript limpio | Steps de verificación en cada tarea |
| Tests unitarios para validación | Task 2 (schema.test.ts) |

### Placeholder scan
- Sin TBD, TODO ni "implement later"
- Todos los steps muestran código completo
- Todos los tipos están definidos antes de usarse

### Type consistency
- `Milestone` definida en Task 1, usada en Task 2 (actions), Task 3 (componentes), Task 4 (page)
- `ExchangeNote` definida en Task 1, usada en Task 3 (WorkspacePanel, Notepad), Task 4 (page)
- `addMilestone`/`toggleMilestone`/`deleteMilestone`/`saveNote` definidas en Task 2, importadas en Task 3
- Firmas consistentes en todas las referencias
