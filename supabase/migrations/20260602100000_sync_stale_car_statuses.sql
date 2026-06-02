-- One-time cleanup for car statuses that were already approved before the
-- car status sync was added to the lifecycle routes.
--
-- Safe behavior:
-- - Marks cars with an approved assignment as "In Service"
-- - Releases cars stuck in "In Service" with no active approved assignment
-- - Never touches Retired cars
-- - Never overwrites Maintenance / Unavailable rows unless they are already
--   in the stale "In Service" state with no active approved booking

begin;

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

