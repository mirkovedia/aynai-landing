-- Proyectos del portafolio de un usuario
create table public.portfolio_items (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  title       text        not null check (char_length(title) between 1 and 120),
  description text        check (char_length(description) <= 500),
  url         text,
  created_at  timestamptz not null default now()
);

create index portfolio_user_idx on public.portfolio_items(user_id, created_at);

alter table public.portfolio_items enable row level security;

-- Lectura pública
create policy "portafolio_publico"
  on public.portfolio_items for select
  using (true);

-- Solo el dueño puede insertar/actualizar/eliminar
create policy "dueno_gestiona_portafolio"
  on public.portfolio_items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
