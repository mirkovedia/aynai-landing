-- Flag para saber si el usuario completó el flujo de bienvenida
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;
