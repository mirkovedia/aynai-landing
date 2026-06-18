-- AynAI — marketplace MVP: solicitudes de intercambio (Ayni) entre perfiles.
-- Idempotente: se puede re-ejecutar sin romper.

-- ───────── exchange_requests ─────────
create table if not exists public.exchange_requests (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  offer_skill  text not null,   -- lo que el solicitante OFRECE
  want_skill   text not null,   -- lo que QUIERE del destinatario
  message      text,
  status       text not null default 'pending'
               check (status in ('pending','accepted','rejected','cancelled')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (requester_id <> recipient_id)
);
create index if not exists exchange_recipient_idx on public.exchange_requests(recipient_id);
create index if not exists exchange_requester_idx on public.exchange_requests(requester_id);

-- ───────── RLS ─────────
alter table public.exchange_requests enable row level security;

drop policy if exists "exchange_select_party" on public.exchange_requests;
create policy "exchange_select_party" on public.exchange_requests
  for select to authenticated
  using (auth.uid() in (requester_id, recipient_id));

drop policy if exists "exchange_insert_requester" on public.exchange_requests;
create policy "exchange_insert_requester" on public.exchange_requests
  for insert to authenticated
  with check (auth.uid() = requester_id);

drop policy if exists "exchange_update_party" on public.exchange_requests;
create policy "exchange_update_party" on public.exchange_requests
  for update to authenticated
  using (auth.uid() in (requester_id, recipient_id))
  with check (auth.uid() in (requester_id, recipient_id));
