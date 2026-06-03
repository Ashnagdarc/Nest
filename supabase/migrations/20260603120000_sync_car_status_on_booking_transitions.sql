-- Keep car status in sync with booking lifecycle changes.
-- This closes the gap between manual returns, auto-return jobs, and legacy
-- booking updates by enforcing the state change at the database boundary.

begin;

create or replace function public.sync_car_status_from_booking_id(p_booking_id uuid, p_new_status text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_car_id uuid;
begin
  select ca.car_id
    into v_car_id
  from public.car_assignment ca
  where ca.booking_id = p_booking_id
    and ca.car_id is not null
  order by ca.created_at desc
  limit 1;

  if v_car_id is null then
    return;
  end if;

  if lower(coalesce(p_new_status, '')) = 'approved' then
    update public.cars
      set status = 'In Service',
          updated_at = now()
    where id = v_car_id
      and status = 'Available';
    return;
  end if;

  if lower(coalesce(p_new_status, '')) in ('completed', 'cancelled', 'rejected', 'failed') then
    update public.cars
      set status = 'Available',
          updated_at = now()
    where id = v_car_id
      and status = 'In Service';
    return;
  end if;
end;
$function$;

create or replace function public.sync_car_status_from_legacy_booking()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $function$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    perform public.sync_car_status_from_booking_id(new.id, new.status);
  end if;
  return new;
end;
$function$;

create or replace function public.sync_car_status_from_v2_booking()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $function$
begin
  if coalesce(new.source_type, '') = 'car_booking' and new.source_id is not null then
    if tg_op = 'INSERT' or new.status is distinct from old.status then
      perform public.sync_car_status_from_booking_id(new.source_id, new.status);
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_sync_car_status_from_legacy_booking on public.car_bookings;
create trigger trg_sync_car_status_from_legacy_booking
after insert or update of status on public.car_bookings
for each row
execute function public.sync_car_status_from_legacy_booking();

drop trigger if exists trg_sync_car_status_from_v2_booking on public.bookings;
create trigger trg_sync_car_status_from_v2_booking
after insert or update of status on public.bookings
for each row
execute function public.sync_car_status_from_v2_booking();

with approved_car_ids as (
  select distinct ca.car_id
  from public.car_assignment ca
  join public.car_bookings cb
    on cb.id = ca.booking_id
  where cb.status = 'Approved'
    and ca.car_id is not null
),
set_in_service as (
  update public.cars c
  set status = 'In Service',
      updated_at = now()
  where c.status is distinct from 'In Service'
    and c.status <> 'Retired'
    and exists (
      select 1
      from approved_car_ids ac
      where ac.car_id = c.id
    )
  returning c.id
),
set_available as (
  update public.cars c
  set status = 'Available',
      updated_at = now()
  where c.status = 'In Service'
    and c.status <> 'Retired'
    and not exists (
      select 1
      from approved_car_ids ac
      where ac.car_id = c.id
    )
  returning c.id
)
select
  (select count(*) from set_in_service) as marked_in_service,
  (select count(*) from set_available) as released_to_available;

commit;
