# Perfiles ricos — Diseño (Fase 1, sub-proyecto 1)

> Spec de diseño. Fecha: 2026-06-17. Rama base: `docs/saas-vision`.
> Norte del proyecto: ver [`docs/VISION.md`](../../VISION.md).

## Contexto y objetivo

La Fase 1 del SaaS agrupa cinco subsistemas (monorepo, perfiles ricos, marketplace MVP,
wallets híbridas, AynAI Score v1). Este documento cubre **solo el primer sub-proyecto:
perfiles ricos**, que es la base sobre la que se montan el marketplace y el Score.

Estado actual:
- Existe `public.profiles` (id, full_name, email, ayni_score, bio, skills `text[]`, location, created_at).
- El dashboard **lee** el perfil pero no hay forma de **editarlo**.
- RLS actual: solo el dueño ve su fila (`profiles_select_own`) → perfiles privados.
- No hay avatar, ni username público, ni página de perfil pública.

Objetivo: que un usuario pueda **completar y editar** un perfil rico, y que otros usuarios
autenticados puedan **verlo**, dejando el modelo de datos listo para el matching del
marketplace y las señales del Score.

Se construye **dentro del repo actual** (`src/`), siguiendo los patrones existentes
(Server Components + Server Actions, Zod en boundaries, paleta boliviana). La migración a
monorepo Turborepo queda fuera de alcance (otro sub-proyecto).

## Enfoque elegido (A)

Tres piezas aisladas con una sola responsabilidad cada una:
- `/perfil` — vista de mi propio perfil, con acceso a editar.
- `/perfil/editar` — formulario de edición (Server Action + Zod).
- `/u/[username]` — perfil público (visible para usuarios autenticados).

Descartados: onboarding wizard (más estado, se reserva para cuando el marketplace empuje a
completar) y edición inline (mezcla vista/edición, más complejo en cliente).

## Modelo de datos (migración `0002`)

```sql
-- profiles: nuevas columnas
alter table public.profiles
  add column if not exists username     text unique,        -- @handle, slug para /u/[username]
  add column if not exists avatar_url    text,
  add column if not exists availability  text default 'unavailable',  -- available | busy | unavailable
  add column if not exists modality      text,               -- remoto | presencial | hibrido
  add column if not exists links         jsonb not null default '{}'; -- { web, linkedin, github, x }

-- user_skills: ofrezco / busco
create table if not exists public.user_skills (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  kind       text not null check (kind in ('offer','seek')),  -- ofrezco | busco
  category   text,
  level      text,                                            -- basico | intermedio | experto
  created_at timestamptz not null default now(),
  unique (user_id, name, kind)
);
create index if not exists user_skills_user_idx on public.user_skills(user_id);
create index if not exists user_skills_kind_idx on public.user_skills(kind);

-- Migrar skills text[] existentes a user_skills como 'offer'
insert into public.user_skills (user_id, name, kind)
select id, unnest(skills), 'offer' from public.profiles
where array_length(skills, 1) > 0
on conflict (user_id, name, kind) do nothing;
```

Decisiones:
- **`links` como `jsonb`**: flexible para sumar redes sin nueva migración; se valida con Zod.
- El `skills text[]` viejo se **deprecia** (se conserva por compatibilidad, pero la UI usa
  `user_skills`). Su contenido se migra a `user_skills` como `offer`.
- `username` con `unique` en DB; el **formato** (`^[a-z0-9_]{3,20}$`) se valida en Zod.
- `user_skills` en tabla aparte (no dos `text[]`) porque el marketplace hará queries como
  "quién ofrece X y busca Y" → JOIN/filtro indexado, imposible eficiente sobre arrays.

## RLS y seguridad

```sql
-- profiles: lectura para cualquier autenticado (reemplaza "solo dueño")
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_auth" on public.profiles
  for select to authenticated using (true);
-- profiles_update_own se mantiene: cada quien edita solo lo suyo.

-- user_skills
alter table public.user_skills enable row level security;
create policy "user_skills_select_auth" on public.user_skills
  for select to authenticated using (true);
create policy "user_skills_write_own" on public.user_skills
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**IMPORTANTE — protección del email:** Postgres RLS es row-level, no column-level; no puede
ocultar la columna `email`. Por eso el email **nunca** se selecciona en queries públicas.
`/u/[username]`, `ProfileCard` y el marketplace seleccionan solo:
`username, full_name, avatar_url, bio, location, availability, modality, links, ayni_score`.
El email solo se lee en el perfil propio (`/perfil`, `/perfil/editar`).

## Storage — avatar

Bucket `avatars` público para lectura, escritura solo del dueño.

```sql
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true) on conflict (id) do nothing;

create policy "avatars_read_all" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars_write_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
```

- Ruta: `avatars/{user_id}/avatar.{ext}` — la carpeta por `user_id` hace cumplir el RLS.
- Subida desde cliente (`AvatarUpload.tsx`) con el SDK; validar tipo (jpg/png/webp) y
  tamaño (≤2MB) antes de subir; guardar `publicUrl` en `profiles.avatar_url`.

## Páginas y componentes

```
src/app/(dashboard)/perfil/
├── page.tsx               # Server Component: mi perfil + botón "Editar"
└── editar/
    ├── page.tsx           # carga mi perfil → <ProfileForm>
    └── actions.ts         # updateProfile() Server Action + Zod

src/app/(public)/u/[username]/
└── page.tsx               # perfil público (autenticados); 404 si no existe

src/components/features/profile/
├── ProfileForm.tsx        # "use client": formulario controlado
├── SkillEditor.tsx        # añadir/quitar skills offer/seek con nivel
├── AvatarUpload.tsx       # subida a Storage
└── ProfileCard.tsx        # vista reutilizable (perfil propio, público, marketplace)
```

- `ProfileCard` es la unidad reutilizable: una sola fuente de verdad para la vista de perfil.
- El dashboard actual queda como resumen y enlaza a `/perfil`.
- `/u/[username]` vive en grupo `(public)` con su layout, pero protegido por el middleware
  (requiere login, como se acordó).

## Flujo de edición (Server Action + Zod)

```typescript
// (dashboard)/perfil/editar/actions.ts
const profileSchema = z.object({
  username: z.string().regex(/^[a-z0-9_]{3,20}$/, "3-20 chars: a-z, 0-9, _"),
  full_name: z.string().min(2).max(80),
  bio: z.string().max(500).optional(),
  location: z.string().max(80).optional(),
  availability: z.enum(["available", "busy", "unavailable"]),
  modality: z.enum(["remoto", "presencial", "hibrido"]).optional(),
  links: z.object({
    web: z.string().url().optional(),
    linkedin: z.string().url().optional(),
    github: z.string().url().optional(),
    x: z.string().url().optional(),
  }).partial(),
  skills: z.array(z.object({
    name: z.string().min(1).max(40),
    kind: z.enum(["offer", "seek"]),
    level: z.enum(["basico", "intermedio", "experto"]).optional(),
  })).max(30),
});
```

- La action valida con Zod, hace `upsert` del perfil y **reemplaza** los `user_skills` del
  usuario (delete + insert dentro de la operación), luego `revalidatePath("/perfil")`.
- Manejo de errores según convención: forma `{ error, code, details? }`, toast en cliente,
  `console.error` en server. Manejar colisión de `username` (unique violation) → mensaje claro.

## Tipos

`src/types/database.ts` se extiende: `Profile` con los nuevos campos (`username`,
`avatar_url`, `availability`, `modality`, `links`) y nueva interfaz `UserSkill`
(`id, user_id, name, kind, category, level, created_at`).

## Testing y verificación

- **Unit (Vitest):** schema Zod (username válido/ inválido, links, skills, límites); helper
  de mapeo skills ↔ form.
- **E2E (Playwright):** login → editar perfil (campos + avatar + skills offer/seek) →
  ver `/perfil` actualizado → abrir `/u/[handle]` y confirmar que se ve y que el email **no**
  aparece.
- **Manual:** correr migración en Supabase, probar en `npm run dev`, build (`npm run build`)
  verde antes de cerrar.

## Fuera de alcance

Monorepo Turborepo, marketplace/matching, integración real on-chain del Score, wallets.
Estos son sub-proyectos posteriores de la Fase 1.
