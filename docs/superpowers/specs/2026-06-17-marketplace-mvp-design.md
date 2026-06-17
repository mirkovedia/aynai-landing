# Marketplace MVP — Diseño (Fase 1, sub-proyecto 2)

> Spec de diseño. Fecha: 2026-06-17. Rama: `feat/marketplace-mvp`.
> Norte del proyecto: ver [`docs/VISION.md`](../../VISION.md). Construye sobre el
> sub-proyecto de perfiles ricos (`profiles` + `user_skills` + `ProfileCard`).

## Contexto y objetivo

La Fase 1 agrupa varios subsistemas; este documento cubre **solo el marketplace MVP**.
El sub-proyecto anterior (perfiles ricos) ya dejó: tabla `profiles` (con `username`,
`avatar_url`, `availability`, `modality`, `links`), tabla `user_skills` (offer/seek con
`level`), componente reutilizable `ProfileCard` y página pública `/u/[username]`.

Objetivo: que un usuario autenticado pueda **descubrir** personas por la habilidad que
ofrecen/buscan, y **proponer un intercambio (Ayni)** que la otra parte acepta o rechaza —
cerrando el loop de reciprocidad sin mensajería en tiempo real ni escrow on-chain (ambos
fuera de alcance: el escrow es Fase 2).

Se construye dentro del repo actual (`src/`), siguiendo patrones existentes: Server
Components para lectura, Server Actions + Zod para escritura, filtros en URL search params,
sin dependencias nuevas.

## Enfoque elegido (A)

Server-rendered con URL search params. `/explorar` es un Server Component que lee los
filtros desde la query string y consulta Supabase; los resultados son un grid de
`ProfileCard`. La única isla cliente es el formulario de filtros, que escribe en la URL.
Las solicitudes de intercambio van por Server Actions. `/intercambios` muestra recibidas y
enviadas en tabs.

Descartados: cliente con TanStack Query (agrega dependencia y mueve lógica al cliente,
over-engineering para un MVP) e híbrido (complejidad de coordinación prematura).

Fuera de alcance del MVP: matching recíproco "Ayni" destacado, mensajería/chat, escrow
on-chain, notificaciones por email. Se evalúan después.

## Modelo de datos (migración `0003`)

### Búsqueda (sin tabla nueva)

`/explorar` parte de `profiles` con join interno a `user_skills`, seleccionando solo
columnas públicas (NUNCA `email`):

```
.from("profiles")
.select("<PUBLIC_COLUMNS>, user_skills!inner(*)")
.ilike("user_skills.name", `%${q}%`)     // skill buscado (requerido para buscar)
.eq("user_skills.kind", kind)            // 'offer' | 'seek' (opcional)
.ilike("location", `%${loc}%`)           // opcional
.eq("availability", avail)               // opcional
```

`PUBLIC_COLUMNS` = la misma lista usada en `/u/[username]`:
`id, full_name, ayni_score, bio, skills, location, username, avatar_url, availability,
modality, links, created_at`. El `!inner` exige que el perfil tenga al menos una skill que
matchee. Como un perfil puede tener varias skills que matcheen, se deduplica por `id` en el
servidor antes de renderizar. Se excluye al propio usuario de los resultados.

### Solicitudes de intercambio

```sql
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
```

### RLS

```sql
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

**Nota de diseño:** el RLS da el perímetro grueso (solo las partes ven/tocan la fila).
*Quién puede hacer qué transición* (destinatario acepta/rechaza, solicitante cancela) se
valida en la Server Action, donde es legible y testeable — mismo patrón que la protección
del email en la capa de query.

## Rutas y componentes

```
src/app/(dashboard)/
├── explorar/
│   └── page.tsx              # Server Component: lee searchParams, consulta, renderiza grid
└── intercambios/
    ├── page.tsx              # Server Component: recibidas + enviadas (tab por searchParam)
    └── actions.ts            # createExchangeRequest, respondToRequest, cancelRequest

src/components/features/marketplace/
├── SearchFilters.tsx         # "use client": escribe filtros en la URL (debounce 300ms)
├── ResultsGrid.tsx           # grid de ProfileCards + CTA "Proponer Ayni"
├── ProposeExchangeButton.tsx # "use client": abre el formulario de propuesta
├── ProposeExchangeForm.tsx   # "use client": ofrezco/quiero + mensaje → createExchangeRequest
└── ExchangeRequestCard.tsx   # solicitud: recibida (aceptar/rechazar) | enviada (cancelar)
```

- `SearchFilters` es la única isla cliente en `/explorar`: actualiza `searchParams` con
  `useRouter().replace` (debounce 300ms) y el Server Component re-renderiza.
- `ResultsGrid` reusa `ProfileCard`; cada tarjeta lleva el botón "Proponer Ayni".
- `ProposeExchangeForm` precarga selects con *mis* skills (las que ofrezco) y las *del
  destinatario* (las que él ofrece, para elegir qué quiero) — evita texto libre y typos.
- Navbar/Dashboard: enlaces a `/explorar` e `/intercambios` (badge de solicitudes
  recibidas en `pending`).
- Middleware: agregar `/explorar` e `/intercambios` a `protectedPaths`.

## Flujo de intercambio (Server Actions + Zod)

```typescript
// createExchangeRequest({ recipientId, offerSkill, wantSkill, message })
//   - valida con Zod; user.id => requester_id
//   - impide auto-solicitud (recipientId !== user.id) y duplicado 'pending' al mismo recipient
//   - inserta status 'pending'; revalidatePath('/intercambios')

// respondToRequest({ requestId, action: 'accept' | 'reject' })
//   - carga la fila; exige auth.uid() === recipient_id Y status === 'pending'
//   - set status accepted|rejected, updated_at=now(); revalidatePath('/intercambios')

// cancelRequest({ requestId })
//   - exige auth.uid() === requester_id Y status === 'pending'
//   - set status 'cancelled'; revalidatePath('/intercambios')
```

**Máquina de estados:** `pending → accepted | rejected | cancelled` (estados finales). Solo
se actúa sobre `pending`. Forma de error: `{ error, code, details? }`.

**Al aceptar (MVP):** la solicitud queda `accepted` y la `ExchangeRequestCard` revela los
links de contacto del perfil de la otra parte para coordinar fuera de la plataforma —
puente honesto hasta mensajería (futuro) y escrow on-chain (Fase 2).

## Tipos

`src/types/database.ts` se extiende con:
```typescript
export type ExchangeStatus = "pending" | "accepted" | "rejected" | "cancelled";
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

## Testing y verificación

- **Unit (Vitest):** schemas Zod de las tres acciones (recipientId uuid, skills no vacías
  1-40, message ≤500, `action` enum); helper `canRespond(status) === (status === "pending")`.
- **Tipos:** `npx tsc --noEmit` es el gate real (recordar `typescript.ignoreBuildErrors:true`
  en `next.config.mjs` → `npm run build` no valida tipos). Sin errores nuevos (línea base:
  el error preexistente de `src/components/ui/button.tsx:50`).
- **Manual:** dos usuarios → A busca en `/explorar`, propone Ayni a B → B acepta en
  `/intercambios` → A ve `accepted` + links de contacto de B. Probar rechazar y cancelar.
  Confirmar que el email NO aparece en `/explorar`.
- **E2E (Playwright):** opcional.

## Fuera de alcance

Matching recíproco destacado, chat/mensajería, escrow on-chain (Fase 2), notificaciones por
email, monorepo. Sub-proyectos o fases posteriores.
