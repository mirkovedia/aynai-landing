-- AynAI — perfiles ricos: columnas nuevas, user_skills, RLS público, Storage de avatares.
-- Idempotente: se puede re-ejecutar sin romper.

-- ───────── profiles: columnas nuevas ─────────
alter table public.profiles
  add column if not exists username     text unique,
  add column if not exists avatar_url   text,
  add column if not exists availability text not null default 'unavailable',
  add column if not exists modality      text,
  add column if not exists links         jsonb not null default '{}'::jsonb;

-- ───────── user_skills (ofrezco / busco) ─────────
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
-- (profiles_update_own se mantiene: cada quien edita solo lo suyo)

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
