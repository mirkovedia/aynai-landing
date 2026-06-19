create table if not exists public.commission_payments (
  id uuid primary key default gen_random_uuid(),
  exchange_request_id uuid not null references public.exchange_requests(id) on delete cascade,
  payer_id uuid not null references public.profiles(id) on delete cascade,
  amount_bs integer not null,
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  provider text not null default 'mock',
  provider_ref text,
  qr_payload text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (exchange_request_id, payer_id)
);

create index if not exists commission_payer_idx on public.commission_payments(payer_id);
create index if not exists commission_exchange_idx on public.commission_payments(exchange_request_id);
create index if not exists commission_provider_ref_idx on public.commission_payments(provider_ref);

alter table public.commission_payments enable row level security;

-- Cada usuario ve solo sus propios pagos.
drop policy if exists "commission_select_own" on public.commission_payments;
create policy "commission_select_own" on public.commission_payments
  for select to authenticated
  using (payer_id = auth.uid());

-- Cualquiera de las dos partes del intercambio puede crear filas de pago
-- (el destinatario, al aceptar, inserta las filas de ambas partes).
drop policy if exists "commission_insert_party" on public.commission_payments;
create policy "commission_insert_party" on public.commission_payments
  for insert to authenticated
  with check (
    exists (
      select 1 from public.exchange_requests er
      where er.id = exchange_request_id
        and auth.uid() in (er.requester_id, er.recipient_id)
    )
  );

-- Cada usuario solo actualiza su propio pago.
drop policy if exists "commission_update_own" on public.commission_payments;
create policy "commission_update_own" on public.commission_payments
  for update to authenticated
  using (payer_id = auth.uid())
  with check (payer_id = auth.uid());
