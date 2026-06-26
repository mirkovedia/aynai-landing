-- AynAI — ratings: reputación tras un intercambio completado. Idempotente.

create table if not exists public.ratings (
  id                  uuid primary key default gen_random_uuid(),
  exchange_request_id uuid not null references public.exchange_requests(id) on delete cascade,
  rater_id            uuid not null references public.profiles(id) on delete cascade,
  ratee_id            uuid not null references public.profiles(id) on delete cascade,
  stars               int  not null check (stars between 1 and 5),
  comment             text,
  created_at          timestamptz not null default now(),
  unique (exchange_request_id, rater_id),
  check (rater_id <> ratee_id)
);
create index if not exists ratings_ratee_idx on public.ratings(ratee_id);

alter table public.ratings enable row level security;

-- Lectura pública (autenticados): los ratings se muestran en perfiles.
drop policy if exists "ratings_select_auth" on public.ratings;
create policy "ratings_select_auth" on public.ratings
  for select to authenticated using (true);

-- Insert: solo califico a la contraparte de un intercambio MÍO ya 'completed'.
drop policy if exists "ratings_insert_party" on public.ratings;
create policy "ratings_insert_party" on public.ratings
  for insert to authenticated
  with check (
    rater_id = auth.uid()
    and exists (
      select 1 from public.exchange_requests er
      where er.id = exchange_request_id
        and er.status = 'completed'
        and auth.uid() in (er.requester_id, er.recipient_id)
        and ratee_id in (er.requester_id, er.recipient_id)
        and ratee_id <> auth.uid()
    )
  );
