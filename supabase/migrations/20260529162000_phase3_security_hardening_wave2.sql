-- Phase 3 security hardening wave 2
-- Goal: reduce remaining high-risk advisor findings with low breakage risk.
-- Strategy:
--   1) Tighten permissive RLS policies flagged as always-true.
--   2) Revoke ANON execute on SECURITY DEFINER functions in exposed schemas.
--   3) Set fixed search_path on remaining mutable functions flagged by advisor.

-- ---------------------------------------------------------------------------
-- 1) Tighten permissive RLS policies
-- ---------------------------------------------------------------------------

-- announcements: keep "any authenticated can create" behavior, but require
-- ownership consistency so WITH CHECK is not always true.
DROP POLICY IF EXISTS "Any authenticated user can create announcements" ON public.announcements;
DROP POLICY IF EXISTS "announcements_insert_authenticated" ON public.announcements;
CREATE POLICY "announcements_insert_authenticated"
  ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    OR private.is_admin(auth.uid())
  );

-- gear_request_gears: remove legacy permissive insert policy and enforce that
-- inserted lines belong to caller's own pending request (or admin).
DROP POLICY IF EXISTS "insert_gear_request_gears_authenticated" ON public.gear_request_gears;
DROP POLICY IF EXISTS "gear_request_gears_insert_own" ON public.gear_request_gears;
CREATE POLICY "gear_request_gears_insert_own"
  ON public.gear_request_gears
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.gear_requests gr
      WHERE gr.id = gear_request_id
        AND gr.user_id = auth.uid()
        AND lower(gr.status) = 'pending'
    )
  );

-- notifications: remove permissive insert policy and scope inserts to self,
-- while keeping admin capability for cross-user notifications.
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_self_or_admin" ON public.notifications;
CREATE POLICY "notifications_insert_self_or_admin"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR private.is_admin(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 2) Revoke ANON execute on SECURITY DEFINER functions
-- ---------------------------------------------------------------------------
-- This closes public unauthenticated RPC access while preserving authenticated
-- app behavior for now.
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
    WHERE n.nspname IN ('public', 'private')
      AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon, PUBLIC',
      r.schema_name,
      r.function_name,
      r.args
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Lock search_path on remaining mutable functions (advisor-targeted)
-- ---------------------------------------------------------------------------
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
        'get_recent_announcements',
        'get_all_announcements',
        'get_equipment_stats',
        'get_user_stats',
        'get_request_stats',
        'sync_gear_status_with_availability',
        'send_announcement_emails',
        'get_user_dashboard',
        'migrate_status_change_maintenance_to_activity',
        'get_request_audit',
        'get_announcement_email_data',
        'insert_gear_request_lines',
        'create_announcement_notifications'
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
