-- Mensajes de chat vinculados a un intercambio aceptado
create table public.messages (
  id                   uuid        primary key default gen_random_uuid(),
  exchange_request_id  uuid        not null references public.exchange_requests(id) on delete cascade,
  sender_id            uuid        not null references auth.users(id) on delete cascade,
  content              text        not null check (char_length(content) between 1 and 2000),
  read_at              timestamptz,
  created_at           timestamptz not null default now()
);

create index messages_exchange_idx on public.messages(exchange_request_id, created_at);

alter table public.messages enable row level security;

-- Solo los dos participantes del intercambio pueden leer mensajes
create policy "participantes_ven_mensajes"
  on public.messages for select
  using (
    exists (
      select 1 from public.exchange_requests er
      where er.id = messages.exchange_request_id
        and (er.requester_id = auth.uid() or er.recipient_id = auth.uid())
    )
  );

-- Solo participantes pueden enviar; el intercambio debe estar aceptado o completado
create policy "participantes_envian_mensajes"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.exchange_requests er
      where er.id = messages.exchange_request_id
        and (er.requester_id = auth.uid() or er.recipient_id = auth.uid())
        and er.status in ('accepted', 'completed')
    )
  );

-- Activar Realtime para mensajes en tiempo real
alter publication supabase_realtime add table public.messages;
