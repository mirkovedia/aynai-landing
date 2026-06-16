# Login + Supabase + Reestructura — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar autenticación real (email/password + Google) y persistencia en Supabase a la landing de AynAI, con un dashboard de perfil y la waitlist conectada a la BD, sobre una estructura de carpetas más escalable.

**Architecture:** Next.js 15 App Router con route groups `(marketing)` / `(auth)` / `(dashboard)`. Sesión vía cookies con `@supabase/ssr` (browser client + server client + middleware de refresco). RLS activado en todas las tablas. El dashboard es Server Component y lee al usuario en el servidor; el middleware protege `/dashboard`.

**Tech Stack:** Next.js 15.1.9, React 19, TypeScript strict, Tailwind 4, Framer Motion, `@supabase/supabase-js`, `@supabase/ssr`.

**Nota sobre testing:** Auth integra un servicio externo (Supabase) y la app es UI-pesada; no hay suite de tests unitarios en el repo. La verificación de cada tarea es **`npm run build` verde** + chequeos manuales reproducibles descritos en cada tarea. Commits frecuentes por tarea.

**Nota de credenciales:** Las tareas 3 en adelante necesitan `.env.local` con las keys de Supabase. El usuario las provee cuando se llegue a la Tarea 1 (paso de env). Hasta tener keys reales, el build compila igual (las vars solo se leen en runtime).

---

### Task 1: Instalar dependencias y configurar entorno

**Files:**
- Modify: `package.json` (vía npm install)
- Create: `.env.example`
- Create: `.env.local` (NO se commitea)
- Modify: `.gitignore` (verificar que ignora `.env*`)

- [ ] **Step 1: Instalar paquetes de Supabase**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr
```
Expected: `added N packages` sin errores.

- [ ] **Step 2: Crear `.env.example`**

Create `.env.example`:
```
# Supabase — obtener en Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-publica
```

- [ ] **Step 3: Crear `.env.local` con las keys reales**

Pedir al usuario `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<valor real>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<valor real>
```
Si el usuario aún no las tiene, dejar el archivo con los placeholders de `.env.example` y avisar que el demo de auth no funcionará hasta pegarlas.

- [ ] **Step 4: Verificar `.gitignore`**

Run:
```bash
grep -n "env" .gitignore
```
Expected: existe una línea `.env*` (gitignore por defecto de Next.js la incluye). Si NO aparece, agregar al final de `.gitignore`:
```
# local env files
.env*
!.env.example
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example .gitignore
git commit -m "chore: agregar dependencias de Supabase y config de entorno"
```

---

### Task 2: Migración SQL (tablas, RLS, trigger)

**Files:**
- Create: `supabase/migrations/0001_init.sql`

- [ ] **Step 1: Escribir la migración**

Create `supabase/migrations/0001_init.sql`:
```sql
-- AynAI — esquema inicial: waitlist + profiles
-- Idempotente: se puede re-ejecutar sin romper.

-- Extensión para gen_random_uuid()
create extension if not exists pgcrypto;

-- ───────────────────────── waitlist ─────────────────────────
create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Cualquiera (anon o autenticado) puede sumarse a la lista
drop policy if exists "waitlist_insert_any" on public.waitlist;
create policy "waitlist_insert_any" on public.waitlist
  for insert to anon, authenticated
  with check (true);

-- Solo usuarios autenticados pueden leer (panel del dashboard, demo)
drop policy if exists "waitlist_select_auth" on public.waitlist;
create policy "waitlist_select_auth" on public.waitlist
  for select to authenticated
  using (true);

-- ───────────────────────── profiles ─────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  email      text,
  ayni_score int not null default 720,
  bio        text,
  skills     text[] not null default '{}',
  location   text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cada usuario solo ve su propia fila
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (auth.uid() = id);

-- Cada usuario solo edita su propia fila
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ──────────── trigger: crear perfil al registrarse ────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 2: Aplicar la migración en Supabase**

Indicar al usuario: abrir el **SQL Editor** del proyecto en supabase.com, pegar el contenido de `supabase/migrations/0001_init.sql` y ejecutar (Run). Confirmar que no hay errores y que en **Table Editor** aparecen `waitlist` y `profiles`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat: migración inicial Supabase (waitlist, profiles, RLS, trigger)"
```

---

### Task 3: Clientes Supabase y tipos

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/types/database.ts`

- [ ] **Step 1: Tipos de la BD**

Create `src/types/database.ts`:
```ts
/** Fila de la tabla profiles. */
export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  ayni_score: number;
  bio: string | null;
  skills: string[];
  location: string | null;
  created_at: string;
}

/** Fila de la tabla waitlist. */
export interface WaitlistEntry {
  id: string;
  email: string;
  created_at: string;
}
```

- [ ] **Step 2: Browser client**

Create `src/lib/supabase/client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";

/** Cliente de Supabase para componentes del lado del navegador. */
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
```

- [ ] **Step 3: Server client**

Create `src/lib/supabase/server.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Cliente de Supabase para Server Components / route handlers (sesión vía cookies). */
export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Llamado desde un Server Component: ignorar (el middleware refresca la sesión).
          }
        },
      },
    }
  );
};
```

- [ ] **Step 4: Helper de middleware**

Create `src/lib/supabase/middleware.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión en cada request y protege las rutas de /dashboard.
 * Sin sesión + ruta protegida → redirect a /login.
 */
export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
};
```

- [ ] **Step 5: Verificar build**

Run: `npm run build`
Expected: `✓ Compiled successfully`. (Los archivos aún no se importan en ningún lado, así que solo se chequea que tipan bien.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabase src/types/database.ts
git commit -m "feat: clientes Supabase (browser/server/middleware) y tipos de BD"
```

---

### Task 4: Middleware raíz

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Crear el middleware**

Create `src/middleware.ts`:
```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export const middleware = async (request: NextRequest) => {
  return await updateSession(request);
};

export const config = {
  matcher: [
    // Todo excepto estáticos e imágenes
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: `✓ Compiled successfully` y en la salida aparece `ƒ Middleware`.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: middleware de auth que protege /dashboard"
```

---

### Task 5: Reestructura — route group (marketing)

**Files:**
- Create: `src/app/(marketing)/layout.tsx`
- Create: `src/app/(marketing)/page.tsx`
- Delete: `src/app/page.tsx`

- [ ] **Step 1: Crear el layout de marketing**

Create `src/app/(marketing)/layout.tsx`:
```tsx
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

/** Shell de la zona pública (landing): navbar fija + footer. */
export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Crear la página de marketing (solo secciones)**

Create `src/app/(marketing)/page.tsx`:
```tsx
import { Hero } from "@/components/sections/Hero";
import { Problem } from "@/components/sections/Problem";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { ValueProp } from "@/components/sections/ValueProp";
import { AynaiScore } from "@/components/sections/AynaiScore";
import { Audience } from "@/components/sections/Audience";
import { BusinessModel } from "@/components/sections/BusinessModel";
import { FinalCta } from "@/components/sections/FinalCta";

/** Landing pública de AynAI. Navbar y Footer viven en el layout de (marketing). */
export default function Home() {
  return (
    <main>
      <Hero />
      <Problem />
      <HowItWorks />
      <ValueProp />
      <AynaiScore />
      <Audience />
      <BusinessModel />
      <FinalCta />
    </main>
  );
}
```

- [ ] **Step 3: Eliminar la página vieja**

Run:
```bash
git rm src/app/page.tsx
```
Expected: `rm 'src/app/page.tsx'`.

- [ ] **Step 4: Verificar build y URL**

Run: `npm run build`
Expected: `✓ Compiled successfully` y en la tabla de rutas sigue apareciendo `○ /` (la URL no cambió, ahora resuelta por el grupo `(marketing)`).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(marketing)"
git commit -m "refactor: mover landing al route group (marketing)"
```

---

### Task 6: UI de autenticación

**Files:**
- Create: `src/lib/auth-errors.ts`
- Create: `src/components/auth/GoogleButton.tsx`
- Create: `src/components/auth/AuthForm.tsx`
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/registro/page.tsx`

- [ ] **Step 1: Mapeo de errores a español**

Create `src/lib/auth-errors.ts`:
```ts
/** Traduce mensajes de error de Supabase Auth a textos en español. */
export const translateAuthError = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("user already registered")) return "Este correo ya está registrado.";
  if (m.includes("password should be at least"))
    return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("email not confirmed"))
    return "Debes confirmar tu correo antes de entrar.";
  if (m.includes("unable to validate email address")) return "El correo no es válido.";
  return "Ocurrió un error. Inténtalo de nuevo.";
};
```

- [ ] **Step 2: Botón de Google**

Create `src/components/auth/GoogleButton.tsx`:
```tsx
"use client";

import { createClient } from "@/lib/supabase/client";

/** Botón de inicio de sesión con Google OAuth. */
export const GoogleButton = () => {
  const handleGoogle = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <button
      type="button"
      onClick={handleGoogle}
      className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-cream/30 bg-cream/5 px-6 py-3 font-sans font-semibold text-cream transition-colors hover:bg-cream/10"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.5H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.4 36.9 44 31 44 24c0-1.3-.1-2.3-.4-3.5z"/>
      </svg>
      Continuar con Google
    </button>
  );
};
```

- [ ] **Step 3: Formulario de auth (login + registro)**

Create `src/components/auth/AuthForm.tsx`:
```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/auth/GoogleButton";

type Mode = "login" | "registro";

/** Formulario de autenticación. `mode` decide entre iniciar sesión o registrarse. */
export const AuthForm = ({ mode }: { mode: Mode }) => {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "registro";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { error: authError } = isRegister
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
      : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (authError) {
      setError(translateAuthError(authError.message));
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const inputClass =
    "w-full rounded-xl border border-cream/20 bg-cream/5 px-4 py-3 text-cream placeholder:text-cream/40 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/30";

  return (
    <div className="w-full max-w-md">
      <h1 className="font-serif text-3xl font-bold text-cream">
        {isRegister ? "Crea tu cuenta" : "Inicia sesión"}
      </h1>
      <p className="mt-2 text-sm text-cream/60">
        {isRegister
          ? "Empieza a construir tu reputación verificable."
          : "Bienvenido de vuelta a AynAI."}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        {isRegister && (
          <div>
            <label htmlFor="fullName" className="sr-only">Nombre completo</label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nombre completo"
              className={inputClass}
            />
          </div>
        )}
        <div>
          <label htmlFor="email" className="sr-only">Correo</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="password" className="sr-only">Contraseña</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña (mín. 6 caracteres)"
            className={inputClass}
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red/30 bg-red/10 px-4 py-2 text-sm text-cream">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? "Procesando..." : isRegister ? "Crear cuenta" : "Entrar"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-cream/40">
        <span className="h-px flex-1 bg-cream/15" />
        <span className="text-xs">o</span>
        <span className="h-px flex-1 bg-cream/15" />
      </div>

      <GoogleButton />

      <p className="mt-8 text-center text-sm text-cream/60">
        {isRegister ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
        <Link
          href={isRegister ? "/login" : "/registro"}
          className="font-semibold text-gold hover:underline"
        >
          {isRegister ? "Inicia sesión" : "Regístrate"}
        </Link>
      </p>
    </div>
  );
};
```

- [ ] **Step 4: Layout del grupo (auth)**

Create `src/app/(auth)/layout.tsx`:
```tsx
import Link from "next/link";

/** Shell centrado y oscuro para las pantallas de autenticación. */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-cocoa">
      <div className="tricolor-bar h-1.5 w-full" />
      <header className="px-6 py-5">
        <Link
          href="/"
          aria-label="AynAI — Inicio"
          className="font-serif text-2xl font-bold tracking-tight"
        >
          <span className="text-cream">Ayn</span>
          <span className="text-red">AI</span>
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Páginas de login y registro**

Create `src/app/(auth)/login/page.tsx`:
```tsx
import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
```

Create `src/app/(auth)/registro/page.tsx`:
```tsx
import { AuthForm } from "@/components/auth/AuthForm";

export default function RegistroPage() {
  return <AuthForm mode="registro" />;
}
```

- [ ] **Step 6: Verificar build**

Run: `npm run build`
Expected: `✓ Compiled successfully` y en la tabla de rutas aparecen `○ /login` y `○ /registro`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth-errors.ts "src/components/auth" "src/app/(auth)"
git commit -m "feat: pantallas de login y registro (email/password + Google)"
```

---

### Task 7: Callback de OAuth

**Files:**
- Create: `src/app/auth/callback/route.ts`

- [ ] **Step 1: Crear el route handler**

Create `src/app/auth/callback/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Intercambia el code de OAuth por una sesión y redirige al dashboard. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: `✓ Compiled successfully`; en rutas aparece `ƒ /auth/callback`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/auth/callback/route.ts"
git commit -m "feat: callback de OAuth para Google"
```

---

### Task 8: Dashboard protegido + logout

**Files:**
- Create: `src/app/(dashboard)/actions.ts`
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Server action de logout**

Create `src/app/(dashboard)/actions.ts`:
```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Cierra la sesión y redirige a la landing. */
export const signOut = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
};
```

- [ ] **Step 2: Layout del dashboard (topbar + logout)**

Create `src/app/(dashboard)/layout.tsx`:
```tsx
import Link from "next/link";
import { signOut } from "./actions";

/** Shell del área privada: topbar con logo y botón de cerrar sesión. */
export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-cream-300 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            aria-label="AynAI — Inicio"
            className="font-serif text-2xl font-bold tracking-tight"
          >
            <span className="text-cocoa">Ayn</span>
            <span className="text-red">AI</span>
          </Link>
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

- [ ] **Step 3: Página del dashboard**

Create `src/app/(dashboard)/dashboard/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, WaitlistEntry } from "@/types/database";

/** Dashboard de perfil: datos del usuario + AynAI Score + waitlist real. */
export default async function DashboardPage() {
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

  const { data: waitlist } = await supabase
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<WaitlistEntry[]>();

  const displayName = profile?.full_name?.trim() || user.email || "Usuario";
  const entries = waitlist ?? [];

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <p className="font-sans text-sm text-cocoa/60">Bienvenido,</p>
      <h1 className="font-serif text-4xl font-bold text-cocoa">{displayName}</h1>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {/* AynAI Score */}
        <div className="rounded-3xl border border-cream-300 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-cocoa/60">Tu AynAI Score</p>
          <p className="mt-2 font-serif text-5xl font-bold text-green">
            {profile?.ayni_score ?? 720}
          </p>
          <p className="mt-1 text-xs text-cocoa/50">Reputación verificable inicial</p>
        </div>

        {/* Datos del perfil */}
        <div className="rounded-3xl border border-cream-300 bg-white p-6 shadow-sm md:col-span-2">
          <p className="text-sm font-medium text-cocoa/60">Tu perfil</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-cocoa/50">Correo</dt>
              <dd className="font-medium text-cocoa">{profile?.email ?? user.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-cocoa/50">Ubicación</dt>
              <dd className="font-medium text-cocoa">{profile?.location ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-cocoa/50">Habilidades</dt>
              <dd className="font-medium text-cocoa">
                {profile?.skills?.length ? profile.skills.join(", ") : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Waitlist real desde Supabase */}
      <div className="mt-6 rounded-3xl border border-cream-300 bg-white p-6 shadow-sm">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium text-cocoa/60">Lista de espera</p>
          <span className="font-serif text-2xl font-bold text-red">{entries.length}</span>
        </div>
        <ul className="mt-4 divide-y divide-cream-200">
          {entries.length === 0 ? (
            <li className="py-3 text-sm text-cocoa/50">Aún no hay registros.</li>
          ) : (
            entries.map((entry) => (
              <li key={entry.id} className="flex justify-between gap-4 py-3 text-sm">
                <span className="text-cocoa">{entry.email}</span>
                <span className="text-cocoa/40">
                  {new Date(entry.created_at).toLocaleDateString("es-BO")}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: `✓ Compiled successfully`; en rutas aparece `ƒ /dashboard` (dinámica por cookies).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)"
git commit -m "feat: dashboard de perfil con AynAI Score y waitlist real"
```

---

### Task 9: Conectar FinalCta a la waitlist real

**Files:**
- Modify: `src/components/sections/FinalCta.tsx:1-22` (imports + handler)

- [ ] **Step 1: Reemplazar imports y handler**

En `src/components/sections/FinalCta.tsx`, reemplazar el bloque de imports y el componente hasta `handleSubmit` (líneas 1-22 del archivo actual).

Buscar:
```tsx
"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChakanaPattern } from "@/components/shared/ChakanaPattern";
import { Reveal } from "@/components/shared/Reveal";

/**
 * CTA final — fondo cocoa con franja tricolor superior y un formulario de
 * email (validación visual). Es el ancla #contacto de la navegación.
 */
export const FinalCta = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  // Por ahora el envío es solo visual: confirma localmente sin backend.
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setSent(true);
  };
```

Reemplazar por:
```tsx
"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChakanaPattern } from "@/components/shared/ChakanaPattern";
import { Reveal } from "@/components/shared/Reveal";
import { createClient } from "@/lib/supabase/client";

/**
 * CTA final — fondo cocoa con franja tricolor superior y un formulario de
 * email que persiste el registro en la tabla `waitlist` de Supabase.
 * Es el ancla #contacto de la navegación.
 */
export const FinalCta = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Inserta el email en Supabase. Trata el duplicado (23505) como éxito amable.
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("waitlist")
      .insert({ email });

    setLoading(false);

    if (insertError && insertError.code !== "23505") {
      setError("No pudimos guardar tu correo. Inténtalo de nuevo.");
      return;
    }

    setSent(true);
  };
```

- [ ] **Step 2: Mostrar el error y estado de carga en el form**

En el mismo archivo, en el bloque del `<form>` (el `else` del ternario `sent ?`), reemplazar el `<Button>` de submit y agregar el mensaje de error.

Buscar:
```tsx
                <Button type="submit" size="lg" className="group shrink-0">
                  Únete ahora
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </Button>
              </form>
```

Reemplazar por:
```tsx
                <Button type="submit" size="lg" disabled={loading} className="group shrink-0">
                  {loading ? "Guardando..." : "Únete ahora"}
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </Button>
              </form>
```

Y justo debajo del `</form>` que cierra el formulario (antes del cierre de `</Reveal>`), agregar:
```tsx
            {error && (
              <p className="mx-auto mt-4 max-w-md text-sm text-gold">{error}</p>
            )}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/FinalCta.tsx
git commit -m "feat: FinalCta persiste el email en la waitlist de Supabase"
```

---

### Task 10: Accesos de auth en el Navbar

**Files:**
- Modify: `src/components/layout/Navbar.tsx:80-84` (CTA de escritorio) y bloque móvil

- [ ] **Step 1: Agregar enlaces de Login / Registro en escritorio**

En `src/components/layout/Navbar.tsx`, buscar el bloque del CTA de escritorio:
```tsx
        <div className="hidden md:block">
          <Button as="a" href="#contacto" size="sm">
            Únete ahora
          </Button>
        </div>
```

Reemplazar por:
```tsx
        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/login"
            className="text-sm font-medium text-cocoa/75 transition-colors hover:text-red"
          >
            Iniciar sesión
          </a>
          <Button as="a" href="/registro" size="sm">
            Crear cuenta
          </Button>
        </div>
```

- [ ] **Step 2: Agregar accesos en el panel móvil**

En el mismo archivo, buscar el `<li>` final del panel móvil:
```tsx
          <li className="mt-2 px-1">
            <Button as="a" href="#contacto" size="md" className="w-full" onClick={() => setOpen(false)}>
              Únete ahora
            </Button>
          </li>
```

Reemplazar por:
```tsx
          <li>
            <a
              href="/login"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-3 text-base font-medium text-cocoa/80 transition-colors hover:bg-cocoa/5 hover:text-red"
            >
              Iniciar sesión
            </a>
          </li>
          <li className="mt-2 px-1">
            <Button as="a" href="/registro" size="md" className="w-full" onClick={() => setOpen(false)}>
              Crear cuenta
            </Button>
          </li>
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Navbar.tsx
git commit -m "feat: accesos de login y registro en el navbar"
```

---

### Task 11: Verificación manual end-to-end

**Files:** (ninguno — solo verificación)

**Prerrequisitos:** `.env.local` con keys reales (Task 1) y migración aplicada (Task 2). En Supabase: **Authentication > Providers > Email**, desactivar "Confirm email" para que el registro entre directo (decisión del spec). Para Google: activar el provider con client ID/secret (opcional).

- [ ] **Step 1: Levantar el dev server**

Run: `npm run dev`
Expected: servidor en `http://localhost:3000`.

- [ ] **Step 2: Verificar landing intacta**

Abrir `http://localhost:3000`. Expected: la landing se ve igual que antes; el navbar ahora muestra "Iniciar sesión" y "Crear cuenta".

- [ ] **Step 3: Probar la waitlist**

En la sección final (#contacto), enviar un email. Expected: aparece la tarjeta "¡Registro Exitoso!". En Supabase **Table Editor > waitlist** aparece la fila. Reenviar el mismo email → también muestra éxito (duplicado tratado como amable).

- [ ] **Step 4: Registro**

Ir a `/registro`, crear cuenta con email/password. Expected: redirige a `/dashboard`, que muestra el nombre, AynAI Score 720 y la lista de espera con el/los email(s) del paso 3. En Supabase **profiles** aparece la fila creada por el trigger.

- [ ] **Step 5: Protección de ruta**

En ventana de incógnito, abrir `http://localhost:3000/dashboard`. Expected: redirige a `/login`.

- [ ] **Step 6: Login y logout**

Iniciar sesión en `/login` con la cuenta creada → `/dashboard`. Click "Cerrar sesión" → vuelve a `/` y `/dashboard` queda protegido otra vez.

- [ ] **Step 7: (Opcional) Google**

Si se configuró el provider: click "Continuar con Google" → flujo OAuth → vuelve autenticado a `/dashboard`.

- [ ] **Step 8: Build de producción final**

Run: `npm run build`
Expected: `✓ Compiled successfully` sin errores de tipos.

---

## Self-Review

**Cobertura del spec:**
- Estructura de carpetas → Tasks 3,5,6,7,8 ✓
- Tabla waitlist + RLS → Task 2 ✓
- Tabla profiles + RLS + trigger → Task 2 ✓
- Clientes Supabase (browser/server/middleware) → Task 3 ✓
- Middleware de protección → Task 4 ✓
- FinalCta → waitlist real → Task 9 ✓
- Registro (email/password + Google) → Task 6 ✓
- Login → Task 6 ✓
- Callback OAuth → Task 7 ✓
- Dashboard (perfil + score + waitlist) → Task 8 ✓
- Logout → Task 8 ✓
- Manejo de errores en español → Task 6 (auth-errors.ts) + Task 9 (waitlist) ✓
- Env vars + .env.example → Task 1 ✓
- Criterios de éxito → Task 11 ✓

**Desviación consciente del spec:** `hooks/useUser.ts` se omite (YAGNI): el dashboard lee al usuario en el servidor, así que no hay consumidor para un hook cliente. Se difiere hasta que exista UI cliente que lo necesite. Se agregó `src/lib/auth-errors.ts` (no listado en el spec) para centralizar la traducción de errores — sirve al requisito de "errores en español".

**Type consistency:** `Profile` y `WaitlistEntry` (Task 3) se usan con los mismos nombres en Task 8. `createClient` (browser) y `createClient` (server, async) viven en módulos distintos y se importan correctamente según contexto. `signOut` (Task 8) se define y consume en el mismo grupo.

**Placeholder scan:** sin TBD/TODO; todo el código está completo.
