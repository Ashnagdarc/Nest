-- =============================================================================
-- Purpose (H-02 / FR-9.6): Align DB car exclusivity with date/slot overlap-only
--
-- APPLY ORDER: 3 of 3 in series 20260923140*
--   After 20260923140000 + 20260923140100. Shared STAGING CHECKLIST: see
--   header of 20260923140000_drop_gears_holder_update_policy.sql
--
-- Context:
--   Migration 20260226113000_enforce_car_booking_hard_lock.sql added a GLOBAL
--   hard lock: any other Approved booking for the same car blocks assignment
--   and approval, even on a different date/slot.
--
--   App rule (src/lib/car-bookings/overlap.ts, used by approve/assign/create):
--     conflict only when status = 'Approved' AND same date_of_use AND same
--     time_slot (nullish slots treated as '').
--
--   No later migration replaced these function bodies (phase3 only set
--   search_path on the function names). This migration removes the global
--   hard-lock branches and keeps the exact slot check.
--
-- Also fixes:
--   sync_car_status_from_booking_id previously set cars.status = 'Available'
--   whenever ANY booking completed/cancelled. With overlap-only Approved
--   coexistence, that would incorrectly free a car that still has another
--   Approved booking. Release only when no other Approved assignment remains.
--
-- Rollback:
--   Re-apply the function bodies from 20260226113000_enforce_car_booking_hard_lock.sql
--   (restore the second "Hard lock" SELECT blocks) and the prior
--   sync_car_status_from_booking_id from 20260603120000_sync_car_status_on_booking_transitions.sql
--   if product reverts to global lock.
--
-- Verify (read-only, before/after apply):
--   -- Triggers / functions present?
--   SELECT tgname, pg_get_triggerdef(oid)
--   FROM pg_trigger
--   WHERE NOT tgisinternal
--     AND tgrelid IN ('public.car_bookings'::regclass, 'public.car_assignment'::regclass)
--     AND tgname ILIKE '%car%';
--
--   SELECT proname, pg_get_functiondef(oid)
--   FROM pg_proc
--   WHERE pronamespace = 'public'::regnamespace
--     AND proname IN (
--       'prevent_approving_locked_car_booking',
--       'prevent_double_car_assignment',
--       'sync_car_status_from_booking_id'
--     );
--   -- After apply: function defs must NOT contain global hard-lock branches
--   -- (no "currently checked out" / any-Approved-same-car block); only slot
--   -- conflict. sync_car_status_from_booking_id must gate Available on
--   -- !EXISTS other Approved assignment.
--
--   -- Staging behavioral checks (two Approved bookings, same car, different days):
--   -- 1) Assign+approve booking A (date D1, slot Morning) → OK
--   -- 2) Assign+approve booking B (date D2, slot Morning) → OK after this migration
--   --    (FAILED under hard lock with "currently checked out")
--   -- 3) Assign+approve booking C (date D1, slot Morning) → FAIL slot conflict
--   -- 4) Complete A while B still Approved → car stays In Service
--   -- 5) Complete B → car becomes Available
--
-- DO NOT auto-apply to remote:
--   Local draft only. Apply manually after staging verify (and after 40000+40100).
--   Do not run `supabase db push` / MCP apply_migration without human review.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Assignment: slot conflict only (matches findApprovedSlotConflict)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_double_car_assignment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $function$
DECLARE
    v_target_booking RECORD;
    v_conflicting_booking RECORD;
BEGIN
    SELECT cb.id, cb.date_of_use, cb.time_slot
    INTO v_target_booking
    FROM public.car_bookings cb
    WHERE cb.id = NEW.booking_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- FR-9.6: only block when another Approved booking shares date + time_slot
    SELECT cb.id, cb.employee_name, cb.date_of_use, cb.time_slot
    INTO v_conflicting_booking
    FROM public.car_assignment ca
    JOIN public.car_bookings cb ON cb.id = ca.booking_id
    WHERE ca.car_id = NEW.car_id
      AND cb.id <> NEW.booking_id
      AND cb.status = 'Approved'
      AND cb.date_of_use IS NOT DISTINCT FROM v_target_booking.date_of_use
      AND COALESCE(cb.time_slot, '') = COALESCE(v_target_booking.time_slot, '')
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'Car is already assigned to another approved booking for this date and time slot.';
    END IF;

    RETURN NEW;
END;
$function$;

-- Ensure assignment path is enforced even if trigger was missing from prior migrations
DROP TRIGGER IF EXISTS trg_prevent_double_car_assignment ON public.car_assignment;
CREATE TRIGGER trg_prevent_double_car_assignment
BEFORE INSERT OR UPDATE OF car_id, booking_id ON public.car_assignment
FOR EACH ROW
EXECUTE FUNCTION public.prevent_double_car_assignment();

-- -----------------------------------------------------------------------------
-- Approval: slot conflict only (matches findApprovedSlotConflict)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_approving_locked_car_booking()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $function$
DECLARE
    v_car_id uuid;
    v_conflicting_booking RECORD;
BEGIN
    IF NEW.status IS DISTINCT FROM 'Approved' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;

    SELECT ca.car_id
    INTO v_car_id
    FROM public.car_assignment ca
    WHERE ca.booking_id = NEW.id
    LIMIT 1;

    IF v_car_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT cb.id, cb.employee_name, cb.date_of_use, cb.time_slot
    INTO v_conflicting_booking
    FROM public.car_assignment ca
    JOIN public.car_bookings cb ON cb.id = ca.booking_id
    WHERE ca.car_id = v_car_id
      AND cb.id <> NEW.id
      AND cb.status = 'Approved'
      AND cb.date_of_use IS NOT DISTINCT FROM NEW.date_of_use
      AND COALESCE(cb.time_slot, '') = COALESCE(NEW.time_slot, '')
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'Car is already assigned and approved for this specific time slot.';
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_approving_locked_car_booking ON public.car_bookings;
CREATE CONSTRAINT TRIGGER trg_prevent_approving_locked_car_booking
AFTER INSERT OR UPDATE ON public.car_bookings
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.prevent_approving_locked_car_booking();

-- -----------------------------------------------------------------------------
-- Car fleet status: do not free car while another Approved booking remains
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_car_status_from_booking_id(p_booking_id uuid, p_new_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  v_car_id uuid;
  v_other_approved boolean;
BEGIN
  SELECT ca.car_id
    INTO v_car_id
  FROM public.car_assignment ca
  WHERE ca.booking_id = p_booking_id
    AND ca.car_id IS NOT NULL
  ORDER BY ca.created_at DESC
  LIMIT 1;

  IF v_car_id IS NULL THEN
    RETURN;
  END IF;

  IF lower(coalesce(p_new_status, '')) = 'approved' THEN
    UPDATE public.cars
      SET status = 'In Service',
          updated_at = now()
    WHERE id = v_car_id
      AND status = 'Available';
    RETURN;
  END IF;

  IF lower(coalesce(p_new_status, '')) IN ('completed', 'cancelled', 'rejected', 'failed') THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.car_assignment ca
      JOIN public.car_bookings cb ON cb.id = ca.booking_id
      WHERE ca.car_id = v_car_id
        AND ca.booking_id IS DISTINCT FROM p_booking_id
        AND cb.status = 'Approved'
    ) INTO v_other_approved;

    IF v_other_approved THEN
      -- Keep In Service while another Approved booking still holds the car
      UPDATE public.cars
        SET status = 'In Service',
            updated_at = now()
      WHERE id = v_car_id
        AND status <> 'Retired';
      RETURN;
    END IF;

    UPDATE public.cars
      SET status = 'Available',
          updated_at = now()
    WHERE id = v_car_id
      AND status = 'In Service';
    RETURN;
  END IF;
END;
$function$;

COMMIT;
