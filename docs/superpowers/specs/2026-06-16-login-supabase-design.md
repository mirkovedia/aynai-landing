# Diseño: Login + Supabase + reestructura del stack

**Fecha:** 2026-06-16
**Proyecto:** AynAI Landing
**Estado:** Aprobado para implementación

## Objetivo

Convertir la landing estática de AynAI en una app con autenticación real y base de
datos, manteniendo la landing actual intacta. Meta inmediata: tener un avance
presentable hoy (login funcional + perfil de usuario + datos reales persistidos).

## Decisiones (acordadas con el usuario)

- **Detrás del login:** perfil de usuario + datos reales (waitlist persistida).
- **Auth:** Email/contraseña (camino confiable) + Google OAuth (extra opcional).
- **Reestructura:** moderada — route groups + capa Supabase + `types/` + `hooks/` + middleware.
- **Supabase:** el usuario crea el proyecto en paralelo; se le piden las keys al integrar.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript strict + Tailwind 4 + Framer Motion (existente).
- Nuevas dependencias: `@supabase/supabase-js`, `@supabase/ssr`.
- Patrón oficial de auth para App Router: `@supabase/ssr` (sesión vía cookies, lectura
  segura en Server Components).

## Estructura de carpetas (reorg moderada)

```
src/
├── app/
│   ├── (marketing)/
│   │   ├── layout.tsx          # Navbar + Footer (shell de la landing)
│   │   └── page.tsx            # landing actual (movida desde app/page.tsx)
│   ├── (auth)/
│   │   ├── layout.tsx          # shell centrado, fondo cocoa
│   │   ├── login/page.tsx
│   │   └── registro/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx          # protegido + topbar con logout
│   │   └── dashboard/page.tsx  # perfil + AynAI Score + waitlist
│   ├── auth/callback/route.ts  # callback de Google OAuth (intercambia code → sesión)
│   ├── layout.tsx              # root (fonts, html) — sin cambios estructurales
│   └── globals.css
├── components/
│   ├── layout/   sections/   shared/   ui/   (existentes)
│   └── auth/                   # AuthForm, GoogleButton (nuevos)
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # createBrowserClient
│   │   ├── server.ts           # createServerClient (cookies de next/headers)
│   │   └── middleware.ts       # updateSession helper
│   └── utils.ts                # existente
├── types/database.ts           # tipos de las tablas (waitlist, profiles)
├── hooks/useUser.ts            # hook cliente para sesión/usuario
└── middleware.ts               # protege rutas de (dashboard)
```

Nota: mover `app/page.tsx` a `app/(marketing)/page.tsx`. La URL sigue siendo `/`.
El `Navbar` y `Footer` pasan al `(marketing)/layout.tsx` para que el dashboard tenga
su propio shell.

## Base de datos

RLS **activado** en ambas tablas (regla global del usuario).

### Tabla `waitlist`

| columna     | tipo         | notas                          |
|-------------|--------------|--------------------------------|
| id          | uuid PK      | default gen_random_uuid()      |
| email       | text UNIQUE  | NOT NULL                       |
| created_at  | timestamptz  | default now()                  |

Políticas RLS:
- `anon` + `authenticated` pueden **INSERT** (cualquiera se suma a la lista).
- **SELECT** solo para `authenticated` (panel del dashboard en el demo).
  - Nota de seguridad: para un producto real, la lectura de waitlist debería
    restringirse a un rol admin. Para el demo se acepta lectura por usuario
    autenticado y se deja documentado.

### Tabla `profiles`

| columna     | tipo         | notas                                   |
|-------------|--------------|-----------------------------------------|
| id          | uuid PK      | references auth.users(id) on delete cascade |
| full_name   | text         |                                         |
| email       | text         |                                         |
| ayni_score  | int          | default 720 (valor mock presentable)    |
| bio         | text         | nullable                                |
| skills      | text[]       | default '{}'                            |
| location    | text         | nullable                                |
| created_at  | timestamptz  | default now()                           |

Políticas RLS:
- SELECT/UPDATE: `auth.uid() = id` (cada usuario solo su propia fila).
- INSERT: lo realiza el trigger (security definer), no el cliente.

### Trigger de creación de perfil

Función `handle_new_user()` (SECURITY DEFINER) que en `on auth.users insert`
inserta una fila en `profiles` con `id = new.id`, `email = new.email`,
`full_name = new.raw_user_meta_data->>'full_name'` (cuando exista).

### Entrega de la migración

Un archivo SQL idempotente en `supabase/migrations/0001_init.sql` que el usuario
pega en el SQL Editor de Supabase (o aplica vía CLI). Incluye: extensión, tablas,
políticas RLS, función y trigger.

## Flujos

### FinalCta (landing)
- Deja de ser "solo visual". El submit hace `INSERT` real en `waitlist` vía browser client.
- Manejo de duplicados (email ya existe → código de error de unique) → mensaje amable
  "Ya estás en la lista". Otros errores → mensaje genérico. Éxito → la tarjeta de
  confirmación actual.

### Registro (`/registro`)
- Email/password: `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`.
- Google: `signInWithOAuth({ provider: 'google', options: { redirectTo: /auth/callback } })`.
- Tras registro exitoso → redirect a `/dashboard` (o a verificación si se activa
  confirmación por email; para el demo se asume confirmación desactivada en Supabase).

### Login (`/login`)
- Email/password: `signInWithPassword`. Google: igual que registro.
- Éxito → redirect a `/dashboard`. Error → mensaje inline en español.

### Dashboard (`/dashboard`, Server Component)
- Lee el usuario con el server client. Si no hay sesión, el middleware ya redirigió.
- Carga el `profile` del usuario y muestra: nombre, AynAI Score, skills, ubicación.
- Tarjeta "Waitlist" con el conteo y la lista de registros (demuestra la BD viva).
- Botón de logout (Server Action o route que llama `signOut` y redirige a `/`).

### Middleware (`middleware.ts`)
- Usa `updateSession` para refrescar la cookie de sesión en cada request.
- Si la ruta empieza con `/dashboard` y no hay usuario → redirect a `/login`.

## Manejo de errores

- Auth: mapear errores comunes de Supabase a mensajes en español (credenciales
  inválidas, email ya registrado, password débil). Mostrar inline en el form.
- Waitlist: distinguir duplicado (unique violation, code `23505`) del resto.
- Server: nunca exponer `service_role`; solo `anon key` (pública por diseño) en el cliente.

## Variables de entorno

`.env.local` (no se commitea; se agrega `.env.example` con placeholders):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Google OAuth — nota de alcance

El botón y el código quedan listos, pero Google requiere:
1. Credenciales OAuth en Google Cloud (client ID/secret).
2. Activar el provider Google en el dashboard de Supabase con esas credenciales.
3. Registrar la redirect URL `<supabase-url>/auth/v1/callback`.

Si hoy no alcanza el tiempo, email/password funciona de forma independiente y es el
camino confiable para la demo. Google se trata como extra opcional.

## Criterios de éxito

1. `npm run build` pasa sin errores.
2. Un visitante puede registrarse con email/password y queda logueado en `/dashboard`.
3. El dashboard muestra el perfil real del usuario (creado por el trigger).
4. Enviar el form de la landing inserta una fila real en `waitlist` y se ve reflejada
   en el dashboard.
5. `/dashboard` sin sesión redirige a `/login`.
6. La landing pública sigue intacta en `/`.

## Fuera de alcance (YAGNI para hoy)

- Edición de perfil desde la UI (solo lectura por ahora).
- Recuperación de contraseña / verificación por email.
- Panel admin con roles.
- TanStack Query / state management avanzado (la reorg moderada no lo requiere aún).
- Migración a arquitectura por features (modules/), reservada para una iteración futura.
