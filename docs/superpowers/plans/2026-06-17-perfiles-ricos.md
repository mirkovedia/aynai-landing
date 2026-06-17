# Perfiles ricos — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un usuario complete y edite un perfil rico (avatar, @username, bio, skills ofrezco/busco, disponibilidad, links) y que otros usuarios autenticados lo vean en una página pública.

**Architecture:** Se construye dentro del repo Next.js actual (`src/`), siguiendo los patrones existentes: Server Components para lectura, Server Actions + Zod para escritura, componentes cliente solo donde hay interacción. Esquema en Supabase con una migración nueva (`0002`), `user_skills` en tabla aparte, RLS público-para-autenticados con el email protegido en la capa de query.

**Tech Stack:** Next.js 15 (App Router) · React 19 · TypeScript strict · Supabase (Postgres + Auth + Storage) · `@supabase/ssr` · Zod · Vitest (unit) · Playwright (E2E, opcional).

## Global Constraints

- TypeScript strict; nunca `any` (usar `unknown` + type guards).
- ES Modules, named exports (default solo para páginas/layouts de Next).
- Comentarios y mensajes de commit en español; identificadores en inglés.
- Convención de error en server: forma `{ error, code, details? }`.
- Validar todos los inputs con Zod en el boundary.
- Paleta de marca existente (clases Tailwind: `cocoa`, `cream`, `cream-300`, `gold`, `red`, `green`).
- El **email nunca** se selecciona en queries de perfiles públicos (`/u/[username]`, `ProfileCard`). Solo columnas públicas: `username, full_name, avatar_url, bio, location, availability, modality, links, ayni_score`.
- Migraciones idempotentes (`if not exists`, `drop policy if exists`).
- Verificar build verde (`npm run build`) antes de cerrar cada tarea de UI.

## File Structure

- Crear: `supabase/migrations/0002_perfiles_ricos.sql` — esquema + RLS + Storage.
- Modificar: `src/types/database.ts` — tipos `Profile` extendido, `UserSkill`, enums.
- Crear: `src/lib/profile/schema.ts` — schemas Zod y tipos derivados.
- Crear: `vitest.config.ts`, `src/lib/profile/schema.test.ts` — setup + tests.
- Crear: `src/app/(dashboard)/perfil/editar/actions.ts` — Server Action `updateProfile`.
- Crear: `src/components/features/profile/ProfileCard.tsx` — vista reutilizable.
- Crear: `src/components/features/profile/AvatarUpload.tsx` — subida de avatar.
- Crear: `src/components/features/profile/SkillEditor.tsx` — editor de skills.
- Crear: `src/components/features/profile/ProfileForm.tsx` — formulario completo.
- Crear: `src/app/(dashboard)/perfil/page.tsx` — mi perfil.
- Crear: `src/app/(dashboard)/perfil/editar/page.tsx` — formulario de edición.
- Crear: `src/app/u/[username]/page.tsx` — perfil público.
- Modificar: `src/lib/supabase/middleware.ts` — proteger `/perfil` y `/u`.
- Modificar: `src/app/(dashboard)/dashboard/page.tsx` — enlace a `/perfil`.

---

### Task 1: Migración de base de datos, Storage y tipos

**Files:**
- Create: `supabase/migrations/0002_perfiles_ricos.sql`
- Modify: `src/types/database.ts`

**Interfaces:**
- Produces: columnas nuevas en `profiles` (`username, avatar_url, availability, modality, links`); tabla `user_skills (id, user_id, name, kind, category, level, created_at)`; bucket Storage `avatars`. Tipos TS: `Profile` extendido, `UserSkill`, `ProfileLinks`, `SkillKind`, `SkillLevel`, `Availability`.

- [ ] **Step 1: Escribir la migración**

Crear `supabase/migrations/0002_perfiles_ricos.sql`:

```sql
-- AynAI — perfiles ricos: columnas nuevas, user_skills, RLS público, Storage de avatares.
-- Idempotente.

-- ───────── profiles: columnas nuevas ─────────
alter table public.profiles
  add column if not exists username     text unique,
  add column if not exists avatar_url   text,
  add column if not exists availability text not null default 'unavailable',
  add column if not exists modality      text,
  add column if not exists links         jsonb not null default '{}'::jsonb;

-- ───────── user_skills ─────────
create table if not exists public.user_skills (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  kind       text not null check (kind in ('offer','seek')),
  category   text,
  level      text check (level in ('basico','intermedio','experto')),
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

-- ───────── RLS profiles: lectura para autenticados ─────────
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_auth" on public.profiles;
create policy "profiles_select_auth" on public.profiles
  for select to authenticated using (true);

-- ───────── RLS user_skills ─────────
alter table public.user_skills enable row level security;
drop policy if exists "user_skills_select_auth" on public.user_skills;
create policy "user_skills_select_auth" on public.user_skills
  for select to authenticated using (true);
drop policy if exists "user_skills_write_own" on public.user_skills;
create policy "user_skills_write_own" on public.user_skills
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ───────── Storage: bucket avatars ─────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true) on conflict (id) do nothing;

drop policy if exists "avatars_read_all" on storage.objects;
create policy "avatars_read_all" on storage.objects
  for select using (bucket_id = 'avatars');
drop policy if exists "avatars_write_own" on storage.objects;
create policy "avatars_write_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 2: Aplicar la migración en Supabase**

Pegar el contenido en el SQL Editor del proyecto Supabase y ejecutarlo (o `supabase db push` si la CLI está conectada).
Expected: ejecuta sin errores; en Table Editor aparecen las columnas nuevas en `profiles` y la tabla `user_skills`; en Storage aparece el bucket `avatars`.

- [ ] **Step 3: Extender los tipos TypeScript**

Reemplazar el contenido de `src/types/database.ts`:

```typescript
export type SkillKind = "offer" | "seek";
export type SkillLevel = "basico" | "intermedio" | "experto";
export type Availability = "available" | "busy" | "unavailable";

/** Links sociales/portfolio del perfil (guardados como jsonb). */
export interface ProfileLinks {
  web?: string;
  linkedin?: string;
  github?: string;
  x?: string;
}

/** Fila de la tabla profiles. */
export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  ayni_score: number;
  bio: string | null;
  /** Campo legado (text[]); la UI usa user_skills. */
  skills: string[];
  location: string | null;
  username: string | null;
  avatar_url: string | null;
  availability: Availability;
  modality: string | null;
  links: ProfileLinks;
  created_at: string;
}

/** Fila de la tabla user_skills (ofrezco/busco). */
export interface UserSkill {
  id: string;
  user_id: string;
  name: string;
  kind: SkillKind;
  category: string | null;
  level: SkillLevel | null;
  created_at: string;
}

/** Fila de la tabla waitlist. */
export interface WaitlistEntry {
  id: string;
  email: string;
  created_at: string;
}
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores (el dashboard existente sigue compilando: `Profile` mantiene los campos previos).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0002_perfiles_ricos.sql src/types/database.ts
git commit -m "feat: migración de perfiles ricos (user_skills, Storage, RLS) y tipos"
```

---

### Task 2: Setup de Vitest y schema Zod de validación (TDD)

**Files:**
- Modify: `package.json` (deps + script `test`)
- Create: `vitest.config.ts`
- Create: `src/lib/profile/schema.ts`
- Test: `src/lib/profile/schema.test.ts`

**Interfaces:**
- Produces: `profileSchema`, `skillSchema` (Zod); tipos `ProfileInput`, `SkillInput`. `profileSchema.safeParse(input)` valida username `^[a-z0-9_]{3,20}$`, full_name 2-80, bio ≤500, location ≤80, availability enum, modality enum opcional, links (urls opcionales), skills array ≤30.

- [ ] **Step 1: Instalar dependencias**

Run: `npm install zod && npm install -D vitest`
Expected: `zod` en dependencies, `vitest` en devDependencies.

- [ ] **Step 2: Añadir script de test**

En `package.json`, dentro de `"scripts"`, añadir:

```json
"test": "vitest run"
```

- [ ] **Step 3: Crear configuración de Vitest**

Crear `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: { environment: "node" },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
```

- [ ] **Step 4: Escribir el test que falla**

Crear `src/lib/profile/schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { profileSchema } from "@/lib/profile/schema";

const valid = {
  username: "mirko_01",
  full_name: "Mirko Barón",
  bio: "Diseñador y dev",
  location: "La Paz",
  availability: "available",
  modality: "remoto",
  links: { github: "https://github.com/mirko" },
  skills: [
    { name: "Diseño UI", kind: "offer", level: "experto" },
    { name: "Marketing", kind: "seek" },
  ],
};

describe("profileSchema", () => {
  it("acepta un perfil válido", () => {
    expect(profileSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza username con mayúsculas o símbolos", () => {
    expect(profileSchema.safeParse({ ...valid, username: "Mirko!" }).success).toBe(false);
  });

  it("rechaza username demasiado corto", () => {
    expect(profileSchema.safeParse({ ...valid, username: "ab" }).success).toBe(false);
  });

  it("rechaza un link que no es URL", () => {
    expect(
      profileSchema.safeParse({ ...valid, links: { web: "no-es-url" } }).success
    ).toBe(false);
  });

  it("rechaza un kind de skill inválido", () => {
    expect(
      profileSchema.safeParse({ ...valid, skills: [{ name: "X", kind: "trade" }] }).success
    ).toBe(false);
  });

  it("rechaza más de 30 skills", () => {
    const skills = Array.from({ length: 31 }, (_, i) => ({ name: `s${i}`, kind: "offer" }));
    expect(profileSchema.safeParse({ ...valid, skills }).success).toBe(false);
  });

  it("acepta links y campos opcionales vacíos", () => {
    const r = profileSchema.safeParse({
      username: "abc",
      full_name: "Ab Cd",
      availability: "unavailable",
      links: {},
      skills: [],
    });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 5: Ejecutar el test (debe fallar)**

Run: `npm test`
Expected: FAIL — no existe `@/lib/profile/schema`.

- [ ] **Step 6: Implementar el schema**

Crear `src/lib/profile/schema.ts`:

```typescript
import { z } from "zod";

/** URL opcional que también acepta cadena vacía (campo no llenado). */
const optionalUrl = z.string().url().optional().or(z.literal(""));

export const skillSchema = z.object({
  name: z.string().min(1).max(40),
  kind: z.enum(["offer", "seek"]),
  level: z.enum(["basico", "intermedio", "experto"]).optional(),
});

export const profileSchema = z.object({
  username: z
    .string()
    .regex(/^[a-z0-9_]{3,20}$/, "3-20 caracteres: a-z, 0-9, _"),
  full_name: z.string().min(2).max(80),
  bio: z.string().max(500).optional().or(z.literal("")),
  location: z.string().max(80).optional().or(z.literal("")),
  availability: z.enum(["available", "busy", "unavailable"]),
  modality: z.enum(["remoto", "presencial", "hibrido"]).optional(),
  links: z
    .object({
      web: optionalUrl,
      linkedin: optionalUrl,
      github: optionalUrl,
      x: optionalUrl,
    })
    .partial(),
  skills: z.array(skillSchema).max(30),
});

export type SkillInput = z.infer<typeof skillSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
```

- [ ] **Step 7: Ejecutar el test (debe pasar)**

Run: `npm test`
Expected: PASS — 7 tests verdes.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/profile/schema.ts src/lib/profile/schema.test.ts
git commit -m "feat: schema Zod de perfil con tests (Vitest)"
```

---

### Task 3: Server Action updateProfile

**Files:**
- Create: `src/app/(dashboard)/perfil/editar/actions.ts`

**Interfaces:**
- Consumes: `profileSchema`, `ProfileInput` de `@/lib/profile/schema`; `createClient` de `@/lib/supabase/server`.
- Produces: `updateProfile(input: ProfileInput): Promise<ActionResult>` donde `interface ActionResult { error?: string; code?: string; details?: unknown }`. Devuelve `{}` en éxito.

- [ ] **Step 1: Implementar la Server Action**

Crear `src/app/(dashboard)/perfil/editar/actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileSchema, type ProfileInput } from "@/lib/profile/schema";

export interface ActionResult {
  error?: string;
  code?: string;
  details?: unknown;
}

/** Valida y persiste el perfil del usuario autenticado y reemplaza sus skills. */
export const updateProfile = async (input: ProfileInput): Promise<ActionResult> => {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Datos inválidos",
      code: "VALIDATION_ERROR",
      details: parsed.error.flatten(),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado", code: "UNAUTHENTICATED" };

  const { username, full_name, bio, location, availability, modality, links, skills } =
    parsed.data;

  // Quitar links vacíos antes de guardar.
  const cleanLinks = Object.fromEntries(
    Object.entries(links).filter(([, value]) => Boolean(value))
  );

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      username,
      full_name,
      bio: bio || null,
      location: location || null,
      availability,
      modality: modality ?? null,
      links: cleanLinks,
    })
    .eq("id", user.id);

  if (updateError) {
    if (updateError.code === "23505") {
      return { error: "Ese nombre de usuario ya está tomado", code: "USERNAME_TAKEN" };
    }
    console.error("updateProfile profiles error:", updateError);
    return { error: "No pudimos guardar tu perfil", code: "DB_ERROR" };
  }

  // Reemplazar skills: borrar las actuales e insertar las nuevas.
  const { error: deleteError } = await supabase
    .from("user_skills")
    .delete()
    .eq("user_id", user.id);
  if (deleteError) {
    console.error("updateProfile delete skills error:", deleteError);
    return { error: "No pudimos actualizar tus habilidades", code: "DB_ERROR" };
  }

  if (skills.length > 0) {
    const rows = skills.map((skill) => ({
      user_id: user.id,
      name: skill.name,
      kind: skill.kind,
      level: skill.level ?? null,
    }));
    const { error: insertError } = await supabase.from("user_skills").insert(rows);
    if (insertError) {
      console.error("updateProfile insert skills error:", insertError);
      return { error: "No pudimos guardar tus habilidades", code: "DB_ERROR" };
    }
  }

  revalidatePath("/perfil");
  return {};
};
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/perfil/editar/actions.ts"
git commit -m "feat: Server Action updateProfile con validación Zod y reemplazo de skills"
```

---

### Task 4: ProfileCard (vista reutilizable)

**Files:**
- Create: `src/components/features/profile/ProfileCard.tsx`

**Interfaces:**
- Consumes: tipos `Profile`, `UserSkill` de `@/types/database`.
- Produces: `interface ProfileCardProps { profile: PublicProfile; skills: UserSkill[] }` y `type PublicProfile = Omit<Profile, "email">`. Componente server (sin "use client").

- [ ] **Step 1: Implementar ProfileCard**

Crear `src/components/features/profile/ProfileCard.tsx`:

```typescript
import { MapPin, Globe, Linkedin, Github } from "lucide-react";
import type { Profile, UserSkill, Availability } from "@/types/database";

/** Subconjunto público del perfil (nunca incluye email). */
export type PublicProfile = Omit<Profile, "email">;

interface ProfileCardProps {
  profile: PublicProfile;
  skills: UserSkill[];
}

const availabilityLabel: Record<Availability, string> = {
  available: "Disponible para intercambios",
  busy: "Ocupado",
  unavailable: "No disponible",
};

const availabilityColor: Record<Availability, string> = {
  available: "bg-green/10 text-green",
  busy: "bg-gold/15 text-cocoa",
  unavailable: "bg-cocoa/10 text-cocoa/60",
};

/** Tarjeta de perfil reutilizable: perfil propio, público y (futuro) marketplace. */
export const ProfileCard = ({ profile, skills }: ProfileCardProps) => {
  const offers = skills.filter((s) => s.kind === "offer");
  const seeks = skills.filter((s) => s.kind === "seek");
  const name = profile.full_name?.trim() || profile.username || "Usuario";

  return (
    <div className="rounded-3xl border border-cream-300 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profile.avatar_url || "/icon.svg"}
          alt={name}
          className="h-20 w-20 rounded-2xl border border-cream-300 object-cover"
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-3xl font-bold text-cocoa">{name}</h1>
          {profile.username && (
            <p className="text-sm text-cocoa/50">@{profile.username}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-cocoa/60">
            {profile.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={14} /> {profile.location}
              </span>
            )}
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${availabilityColor[profile.availability]}`}
            >
              {availabilityLabel[profile.availability]}
            </span>
            {profile.modality && (
              <span className="text-xs text-cocoa/50">{profile.modality}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-cocoa/50">AynAI Score</p>
          <p className="font-serif text-3xl font-bold text-green">{profile.ayni_score}</p>
        </div>
      </div>

      {profile.bio && (
        <p className="mt-5 text-sm leading-relaxed text-cocoa/80">{profile.bio}</p>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <SkillList title="Ofrece" items={offers} accent="text-green" />
        <SkillList title="Busca" items={seeks} accent="text-red" />
      </div>

      {(profile.links.web || profile.links.linkedin || profile.links.github) && (
        <div className="mt-6 flex gap-4 text-cocoa/60">
          {profile.links.web && (
            <a href={profile.links.web} target="_blank" rel="noopener noreferrer" aria-label="Sitio web">
              <Globe size={18} />
            </a>
          )}
          {profile.links.linkedin && (
            <a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <Linkedin size={18} />
            </a>
          )}
          {profile.links.github && (
            <a href={profile.links.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <Github size={18} />
            </a>
          )}
        </div>
      )}
    </div>
  );
};

const SkillList = ({
  title,
  items,
  accent,
}: {
  title: string;
  items: UserSkill[];
  accent: string;
}) => (
  <div>
    <p className={`text-sm font-semibold ${accent}`}>{title}</p>
    {items.length === 0 ? (
      <p className="mt-2 text-sm text-cocoa/40">—</p>
    ) : (
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((skill) => (
          <li
            key={skill.id}
            className="rounded-full border border-cream-300 bg-cream px-3 py-1 text-xs text-cocoa"
          >
            {skill.name}
            {skill.level && <span className="text-cocoa/40"> · {skill.level}</span>}
          </li>
        ))}
      </ul>
    )}
  </div>
);
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build verde (el componente aún no se importa en ninguna ruta, pero debe compilar).

- [ ] **Step 3: Commit**

```bash
git add src/components/features/profile/ProfileCard.tsx
git commit -m "feat: ProfileCard reutilizable para vista de perfil"
```

---

### Task 5: AvatarUpload

**Files:**
- Create: `src/components/features/profile/AvatarUpload.tsx`

**Interfaces:**
- Consumes: `createClient` de `@/lib/supabase/client`.
- Produces: `interface AvatarUploadProps { userId: string; value: string | null; onChange: (url: string) => void }`. Componente cliente.

- [ ] **Step 1: Implementar AvatarUpload**

Crear `src/components/features/profile/AvatarUpload.tsx`:

```typescript
"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AvatarUploadProps {
  userId: string;
  value: string | null;
  onChange: (url: string) => void;
}

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/** Sube el avatar a Storage (avatars/{userId}/avatar.ext) y devuelve la URL pública. */
export const AvatarUpload = ({ userId, value, onChange }: AvatarUploadProps) => {
  const [preview, setPreview] = useState<string | null>(value);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!ALLOWED.includes(file.type)) {
      setError("Formato no permitido (usa JPG, PNG o WEBP).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("La imagen supera los 2MB.");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setUploading(false);
      setError("No pudimos subir la imagen. Inténtalo de nuevo.");
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-busting para que el navegador no muestre la imagen vieja.
    const busted = `${publicUrl}?t=${Date.now()}`;
    setPreview(busted);
    onChange(busted);
    setUploading(false);
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative h-20 w-20 overflow-hidden rounded-2xl border border-cream-300 bg-cream"
        aria-label="Cambiar avatar"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview || "/icon.svg"}
          alt="Avatar"
          className="h-full w-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-cocoa/40 opacity-0 transition-opacity hover:opacity-100">
          <Camera size={20} className="text-cream" />
        </span>
      </button>
      <div className="text-sm">
        <p className="text-cocoa/70">{uploading ? "Subiendo..." : "JPG, PNG o WEBP · máx 2MB"}</p>
        {error && <p className="text-red">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
};
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build verde.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/profile/AvatarUpload.tsx
git commit -m "feat: AvatarUpload con validación y subida a Supabase Storage"
```

---

### Task 6: SkillEditor

**Files:**
- Create: `src/components/features/profile/SkillEditor.tsx`

**Interfaces:**
- Consumes: tipo `SkillInput` de `@/lib/profile/schema`.
- Produces: `interface SkillEditorProps { value: SkillInput[]; onChange: (skills: SkillInput[]) => void }`. Componente cliente.

- [ ] **Step 1: Implementar SkillEditor**

Crear `src/components/features/profile/SkillEditor.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { SkillInput } from "@/lib/profile/schema";

interface SkillEditorProps {
  value: SkillInput[];
  onChange: (skills: SkillInput[]) => void;
}

const inputClass =
  "rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm text-cocoa focus:border-gold focus:outline-none";

/** Editor de habilidades: añade/quita skills con tipo (ofrezco/busco) y nivel. */
export const SkillEditor = ({ value, onChange }: SkillEditorProps) => {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SkillInput["kind"]>("offer");
  const [level, setLevel] = useState<NonNullable<SkillInput["level"]>>("intermedio");

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (value.some((s) => s.name === trimmed && s.kind === kind)) {
      setName("");
      return;
    }
    onChange([...value, { name: trimmed, kind, level }]);
    setName("");
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Ej. Diseño UI"
          className={`${inputClass} flex-1`}
          maxLength={40}
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as SkillInput["kind"])}
          className={inputClass}
        >
          <option value="offer">Ofrezco</option>
          <option value="seek">Busco</option>
        </select>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as NonNullable<SkillInput["level"]>)}
          className={inputClass}
        >
          <option value="basico">Básico</option>
          <option value="intermedio">Intermedio</option>
          <option value="experto">Experto</option>
        </select>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 rounded-xl bg-cocoa px-3 py-2 text-sm font-medium text-cream hover:bg-cocoa/90"
        >
          <Plus size={16} /> Añadir
        </button>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {value.map((skill, index) => (
          <li
            key={`${skill.kind}-${skill.name}`}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
              skill.kind === "offer"
                ? "border-green/30 bg-green/5 text-green"
                : "border-red/30 bg-red/5 text-red"
            }`}
          >
            <span className="font-medium">{skill.kind === "offer" ? "Ofrezco" : "Busco"}:</span>
            {skill.name}
            {skill.level && <span className="opacity-60">· {skill.level}</span>}
            <button type="button" onClick={() => remove(index)} aria-label={`Quitar ${skill.name}`}>
              <X size={13} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build verde.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/profile/SkillEditor.tsx
git commit -m "feat: SkillEditor para gestionar skills ofrezco/busco"
```

---

### Task 7: ProfileForm

**Files:**
- Create: `src/components/features/profile/ProfileForm.tsx`

**Interfaces:**
- Consumes: `updateProfile`, `ActionResult` de `@/app/(dashboard)/perfil/editar/actions`; `AvatarUpload`, `SkillEditor`; tipos `Profile`, `UserSkill`; `ProfileInput`, `SkillInput`; `Button` de `@/components/ui/button`.
- Produces: `interface ProfileFormProps { profile: Profile; skills: UserSkill[] }`. Componente cliente que llama a `updateProfile` y navega a `/perfil` en éxito.

- [ ] **Step 1: Implementar ProfileForm**

Crear `src/components/features/profile/ProfileForm.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AvatarUpload } from "./AvatarUpload";
import { SkillEditor } from "./SkillEditor";
import { updateProfile } from "@/app/(dashboard)/perfil/editar/actions";
import type { Profile, UserSkill } from "@/types/database";
import type { ProfileInput, SkillInput } from "@/lib/profile/schema";

interface ProfileFormProps {
  profile: Profile;
  skills: UserSkill[];
}

const fieldClass =
  "w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-cocoa focus:border-gold focus:outline-none";
const labelClass = "block text-sm font-medium text-cocoa/70";

/** Formulario controlado de edición de perfil. */
export const ProfileForm = ({ profile, skills }: ProfileFormProps) => {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [username, setUsername] = useState(profile.username ?? "");
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [availability, setAvailability] = useState<ProfileInput["availability"]>(
    profile.availability
  );
  const [modality, setModality] = useState<string>(profile.modality ?? "");
  const [links, setLinks] = useState({
    web: profile.links.web ?? "",
    linkedin: profile.links.linkedin ?? "",
    github: profile.links.github ?? "",
    x: profile.links.x ?? "",
  });
  const [skillList, setSkillList] = useState<SkillInput[]>(
    skills.map((s) => ({ name: s.name, kind: s.kind, level: s.level ?? undefined }))
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const input: ProfileInput = {
      username,
      full_name: fullName,
      bio,
      location,
      availability,
      modality: (modality || undefined) as ProfileInput["modality"],
      links,
      skills: skillList,
    };

    const result = await updateProfile(input);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/perfil");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <AvatarUpload userId={profile.id} value={avatarUrl} onChange={setAvatarUrl} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="username" className={labelClass}>Nombre de usuario</label>
          <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} className={fieldClass} placeholder="mirko_01" />
        </div>
        <div>
          <label htmlFor="fullName" className={labelClass}>Nombre completo</label>
          <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className={fieldClass} />
        </div>
      </div>

      <div>
        <label htmlFor="bio" className={labelClass}>Bio</label>
        <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500} className={fieldClass} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="location" className={labelClass}>Ubicación</label>
          <input id="location" value={location} onChange={(e) => setLocation(e.target.value)} className={fieldClass} placeholder="La Paz, Bolivia" />
        </div>
        <div>
          <label htmlFor="availability" className={labelClass}>Disponibilidad</label>
          <select id="availability" value={availability} onChange={(e) => setAvailability(e.target.value as ProfileInput["availability"])} className={fieldClass}>
            <option value="available">Disponible</option>
            <option value="busy">Ocupado</option>
            <option value="unavailable">No disponible</option>
          </select>
        </div>
        <div>
          <label htmlFor="modality" className={labelClass}>Modalidad</label>
          <select id="modality" value={modality} onChange={(e) => setModality(e.target.value)} className={fieldClass}>
            <option value="">—</option>
            <option value="remoto">Remoto</option>
            <option value="presencial">Presencial</option>
            <option value="hibrido">Híbrido</option>
          </select>
        </div>
      </div>

      <div>
        <p className={labelClass}>Habilidades</p>
        <div className="mt-2">
          <SkillEditor value={skillList} onChange={setSkillList} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="web" className={labelClass}>Sitio web</label>
          <input id="web" value={links.web} onChange={(e) => setLinks({ ...links, web: e.target.value })} className={fieldClass} placeholder="https://" />
        </div>
        <div>
          <label htmlFor="linkedin" className={labelClass}>LinkedIn</label>
          <input id="linkedin" value={links.linkedin} onChange={(e) => setLinks({ ...links, linkedin: e.target.value })} className={fieldClass} placeholder="https://" />
        </div>
        <div>
          <label htmlFor="github" className={labelClass}>GitHub</label>
          <input id="github" value={links.github} onChange={(e) => setLinks({ ...links, github: e.target.value })} className={fieldClass} placeholder="https://" />
        </div>
        <div>
          <label htmlFor="x" className={labelClass}>X / Twitter</label>
          <input id="x" value={links.x} onChange={(e) => setLinks({ ...links, x: e.target.value })} className={fieldClass} placeholder="https://" />
        </div>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar perfil"}</Button>
        <Button as="button" type="button" variant="ghost" onClick={() => router.push("/perfil")}>Cancelar</Button>
      </div>
    </form>
  );
};
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build verde.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/profile/ProfileForm.tsx
git commit -m "feat: ProfileForm que ensambla edición de perfil completa"
```

---

### Task 8: Páginas /perfil y /perfil/editar

**Files:**
- Create: `src/app/(dashboard)/perfil/page.tsx`
- Create: `src/app/(dashboard)/perfil/editar/page.tsx`

**Interfaces:**
- Consumes: `createClient` de `@/lib/supabase/server`; `ProfileCard`, `ProfileForm`; tipos `Profile`, `UserSkill`.

- [ ] **Step 1: Implementar la página de mi perfil**

Crear `src/app/(dashboard)/perfil/page.tsx`:

```typescript
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileCard } from "@/components/features/profile/ProfileCard";
import { Button } from "@/components/ui/button";
import type { Profile, UserSkill } from "@/types/database";

/** Mi perfil: vista propia con acceso a edición. */
export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const { data: skills } = await supabase
    .from("user_skills")
    .select("*")
    .eq("user_id", user.id)
    .returns<UserSkill[]>();

  if (!profile) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-serif text-2xl font-bold text-cocoa">Mi perfil</h2>
        <Button as="a" href="/perfil/editar" size="sm">Editar</Button>
      </div>
      <ProfileCard profile={profile} skills={skills ?? []} />
      {profile.username && (
        <p className="mt-4 text-sm text-cocoa/50">
          Tu perfil público:{" "}
          <Link href={`/u/${profile.username}`} className="text-red hover:underline">
            /u/{profile.username}
          </Link>
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Implementar la página de edición**

Crear `src/app/(dashboard)/perfil/editar/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/features/profile/ProfileForm";
import type { Profile, UserSkill } from "@/types/database";

/** Edición de mi perfil. */
export default async function EditarPerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const { data: skills } = await supabase
    .from("user_skills")
    .select("*")
    .eq("user_id", user.id)
    .returns<UserSkill[]>();

  if (!profile) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <h2 className="mb-6 font-serif text-2xl font-bold text-cocoa">Editar perfil</h2>
      <ProfileForm profile={profile} skills={skills ?? []} />
    </main>
  );
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: build verde; aparecen las rutas `/perfil` y `/perfil/editar`.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/perfil/page.tsx" "src/app/(dashboard)/perfil/editar/page.tsx"
git commit -m "feat: páginas de mi perfil y edición de perfil"
```

---

### Task 9: Página pública /u/[username], protección de middleware y enlace del dashboard

**Files:**
- Create: `src/app/u/[username]/page.tsx`
- Modify: `src/lib/supabase/middleware.ts`
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `createClient` de `@/lib/supabase/server`; `ProfileCard`, `PublicProfile`; tipos `Profile`, `UserSkill`.

- [ ] **Step 1: Implementar la página pública**

Crear `src/app/u/[username]/page.tsx`:

```typescript
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileCard, type PublicProfile } from "@/components/features/profile/ProfileCard";
import type { UserSkill } from "@/types/database";

/** Columnas públicas del perfil — nunca incluye email. */
const PUBLIC_COLUMNS =
  "id, full_name, ayni_score, bio, skills, location, username, avatar_url, availability, modality, links, created_at";

interface PageProps {
  params: Promise<{ username: string }>;
}

/** Perfil público (visible para usuarios autenticados). */
export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(PUBLIC_COLUMNS)
    .eq("username", username)
    .maybeSingle<PublicProfile>();

  if (!profile) notFound();

  const { data: skills } = await supabase
    .from("user_skills")
    .select("*")
    .eq("user_id", profile.id)
    .returns<UserSkill[]>();

  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-cream-300 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-5 sm:px-8">
          <Link href="/dashboard" className="font-serif text-2xl font-bold tracking-tight">
            <span className="text-cocoa">Ayn</span>
            <span className="text-red">AI</span>
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <ProfileCard profile={profile} skills={skills ?? []} />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Proteger /perfil y /u en el middleware**

En `src/lib/supabase/middleware.ts`, reemplazar el bloque de redirección:

```typescript
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
```

por:

```typescript
  const protectedPaths = ["/dashboard", "/perfil", "/u"];
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
```

- [ ] **Step 3: Enlazar el perfil desde el dashboard**

En `src/app/(dashboard)/dashboard/page.tsx`, dentro de la tarjeta "Datos del perfil" (después del `</dl>` de cierre en la línea ~63), añadir un enlace. Reemplazar:

```tsx
          </dl>
        </div>
```

por:

```tsx
          </dl>
          <a
            href="/perfil"
            className="mt-4 inline-block text-sm font-semibold text-red hover:underline"
          >
            Ver y editar mi perfil →
          </a>
        </div>
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: build verde; aparece la ruta `/u/[username]`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/u/[username]/page.tsx" src/lib/supabase/middleware.ts "src/app/(dashboard)/dashboard/page.tsx"
git commit -m "feat: perfil público /u/[username], protección de rutas y enlace en dashboard"
```

---

### Task 10 (opcional): E2E con Playwright

> Requiere navegador y un usuario de prueba en Supabase. Hacer solo si se va a mantener E2E en CI.

**Files:**
- Modify: `package.json` (dep + script `e2e`)
- Create: `playwright.config.ts`
- Create: `e2e/perfil.spec.ts`

**Interfaces:**
- Consumes: app corriendo en `http://localhost:3000`; credenciales de prueba vía env `E2E_EMAIL`, `E2E_PASSWORD`.

- [ ] **Step 1: Instalar Playwright**

Run: `npm install -D @playwright/test && npx playwright install chromium`
Expected: `@playwright/test` en devDependencies.

- [ ] **Step 2: Configurar Playwright**

Crear `playwright.config.ts`:

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
```

Añadir a `package.json` scripts: `"e2e": "playwright test"`.

- [ ] **Step 3: Escribir el test de flujo crítico**

Crear `e2e/perfil.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "";
const PASSWORD = process.env.E2E_PASSWORD ?? "";

test("editar perfil y verlo en la página pública sin filtrar email", async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, "Faltan credenciales E2E_EMAIL / E2E_PASSWORD");

  await page.goto("/login");
  await page.getByLabel(/correo/i).fill(EMAIL);
  await page.getByLabel(/contraseña/i).fill(PASSWORD);
  await page.getByRole("button", { name: /iniciar|entrar|ingresar/i }).click();

  await page.goto("/perfil/editar");
  await page.locator("#username").fill("e2e_user");
  await page.locator("#fullName").fill("Usuario E2E");
  await page.getByRole("button", { name: /guardar perfil/i }).click();

  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.getByText("@e2e_user")).toBeVisible();

  await page.goto("/u/e2e_user");
  await expect(page.getByText("Usuario E2E")).toBeVisible();
  await expect(page.getByText(EMAIL)).toHaveCount(0);
});
```

- [ ] **Step 4: Ejecutar E2E**

Run: `npm run e2e`
Expected: PASS (o SKIP si no hay credenciales).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json playwright.config.ts e2e/perfil.spec.ts
git commit -m "test: E2E de edición de perfil y perfil público con Playwright"
```

---

## Verificación final

- [ ] `npm test` → unit verdes.
- [ ] `npm run build` → build verde, rutas `/perfil`, `/perfil/editar`, `/u/[username]` presentes.
- [ ] Manual: `npm run dev` → login → `/perfil/editar` → llenar campos, subir avatar, agregar skills ofrezco/busco → Guardar → `/perfil` muestra los datos → abrir `/u/[handle]` y confirmar que se ve y que el email **no** aparece en el HTML.
- [ ] Sin sesión, visitar `/perfil` y `/u/algo` redirige a `/login`.
