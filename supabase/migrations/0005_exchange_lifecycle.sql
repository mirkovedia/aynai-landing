-- AynAI — ciclo de vida del intercambio: confirmación mutua y estado 'completed'.
-- Idempotente.

alter table public.exchange_requests
  add column if not exists requester_confirmed boolean not null default false,
  add column if not exists recipient_confirmed boolean not null default false,
  add column if not exists completed_at timestamptz;

-- Ampliar el CHECK de status para incluir 'completed'.
alter table public.exchange_requests
  drop constraint if exists exchange_requests_status_check;
alter table public.exchange_requests
  add constraint exchange_requests_status_check
  check (status in ('pending','accepted','rejected','cancelled','completed'));

-- Trigger: cuando ambas partes confirman, el intercambio pasa a 'completed'.
create or replace function public.handle_exchange_completion()
returns trigger
language plpgsql
as $$
begin
  if new.requester_confirmed and new.recipient_confirmed
     and new.status <> 'completed' then
    new.status := 'completed';
    new.completed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_exchange_confirm on public.exchange_requests;
create trigger on_exchange_confirm
  before update on public.exchange_requests
  for each row execute function public.handle_exchange_completion();
