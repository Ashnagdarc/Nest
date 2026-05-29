-- Phase 3 security hardening follow-up
-- Safe, additive, and idempotent.

-- 1) Fix remaining security-definer view finding on legacy compatibility view
DO $$
BEGIN
  IF to_regclass('public.v_gears_with_state') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.v_gears_with_state SET (security_invoker = true)';
  END IF;
END $$;

-- 2) Lock search_path on selected public functions that are commonly flagged
--    by Supabase advisor as function_search_path_mutable.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        -- booking lifecycle v2
        'upsert_booking_from_legacy',
        'backfill_bookings_v2',
        'auto_complete_overdue_car_bookings',
        'create_booking_with_items_atomic',
        'transition_booking_atomic',
        -- booking / car / inventory flow helpers
        'update_car_bookings_updated_at',
        'prevent_approving_locked_car_booking',
        'prevent_double_car_assignment',
        'sync_car_timeblock',
        'complete_expired_calendar_bookings',
        'complete_calendar_booking',
        'update_gears_on_request_approval',
        'update_gear_on_checkin_status_change',
        'update_gear_request_status_on_checkin_completion',
        'update_gear_available_quantity',
        'update_gear_status_on_checkin_approval',
        'reconcile_gear_inventory_from_requests',
        'validate_gear_request_completion',
        'recompute_gear_inventory_state',
        'is_admin_user'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, extensions',
      r.schema_name,
      r.function_name,
      r.args
    );
  END LOOP;
END $$;

-- 3) Tighten execute grants for internal lifecycle backfill/admin functions.
--    Keep this narrow to avoid breaking user-facing RPC calls.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'upsert_booking_from_legacy',
        'backfill_bookings_v2',
        'auto_complete_overdue_car_bookings'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated', r.schema_name, r.function_name, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role', r.schema_name, r.function_name, r.args);
  END LOOP;
END $$;
