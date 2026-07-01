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

alter publication supabase_realtime add table public.exchange_milestones;
alter publication supabase_realtime add table public.exchange_notes;
