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
