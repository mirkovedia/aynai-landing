-- AynAI — AynAI Score real. Espejo de src/lib/scoring/compute.ts. Idempotente.

alter table public.profiles alter column ayni_score set default 600;

create or replace function public.recalc_ayni_score(p_user_id uuid)
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  v_avg            numeric;
  v_rating_count   int;
  v_completed      int;
  v_accepted_more  int;
  v_profile_items  int;
  v_reputation     numeric;
  v_volume         numeric;
  v_reliability    numeric;
  v_profile        numeric;
  v_total          int;
  v_p              public.profiles%rowtype;
begin
  select avg(stars), count(*) into v_avg, v_rating_count
    from public.ratings where ratee_id = p_user_id;

  select count(*) into v_completed
    from public.exchange_requests
    where status = 'completed' and (requester_id = p_user_id or recipient_id = p_user_id);

  select count(*) into v_accepted_more
    from public.exchange_requests
    where status in ('accepted','completed') and (requester_id = p_user_id or recipient_id = p_user_id);

  -- Arranque neutro: sin ratings ni completados → 600.
  if v_rating_count = 0 and v_completed = 0 then
    update public.profiles set ayni_score = 600 where id = p_user_id;
    return 600;
  end if;

  -- Completitud de perfil (0–5).
  select * into v_p from public.profiles where id = p_user_id;
  v_profile_items :=
      (case when v_p.avatar_url is not null and v_p.avatar_url <> '' then 1 else 0 end)
    + (case when exists (select 1 from public.user_skills where user_id = p_user_id and kind = 'offer') then 1 else 0 end)
    + (case when exists (select 1 from public.user_skills where user_id = p_user_id and kind = 'seek') then 1 else 0 end)
    + (case when v_p.links is not null and v_p.links <> '{}'::jsonb then 1 else 0 end)
    + (case when v_p.availability is not null and v_p.availability <> 'unavailable' then 1 else 0 end);

  v_reputation  := (coalesce(v_avg, 3) / 5.0) * 500;
  v_volume      := least(ln(1 + v_completed) / ln(1 + 20), 1) * 250;
  v_reliability := case when v_accepted_more > 0 then (v_completed::numeric / v_accepted_more) * 150 else 0 end;
  v_profile     := least(greatest(v_profile_items, 0), 5) * 20;

  v_total := least(round(v_reputation) + round(v_volume) + round(v_reliability) + round(v_profile), 1000);

  update public.profiles set ayni_score = v_total where id = p_user_id;
  return v_total;
end;
$$;

-- Trigger: nuevo rating → recalcular score del calificado.
create or replace function public.on_rating_recalc()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recalc_ayni_score(new.ratee_id);
  return new;
end;
$$;
drop trigger if exists trg_rating_recalc on public.ratings;
create trigger trg_rating_recalc
  after insert on public.ratings
  for each row execute function public.on_rating_recalc();

-- Trigger: intercambio pasa a 'completed' → recalcular ambas partes.
create or replace function public.on_exchange_completed_recalc()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    perform public.recalc_ayni_score(new.requester_id);
    perform public.recalc_ayni_score(new.recipient_id);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_exchange_completed_recalc on public.exchange_requests;
create trigger trg_exchange_completed_recalc
  after update on public.exchange_requests
  for each row execute function public.on_exchange_completed_recalc();

-- Backfill: recalcular el score de todos los perfiles existentes una vez.
do $$
declare r record;
begin
  for r in select id from public.profiles loop
    perform public.recalc_ayni_score(r.id);
  end loop;
end $$;
