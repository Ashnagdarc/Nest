-- Phase 3 security hardening wave 3
-- 1) Revoke authenticated EXECUTE on SECURITY DEFINER functions except explicit allowlist
-- 2) Remove broad storage listing policy on public gear_images bucket

-- ---------------------------------------------------------------------------
-- 1) SECURITY DEFINER execute hardening (authenticated allowlist)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  allowed_names text[] := ARRAY[
    -- User/app RPCs currently referenced in code
    'create_booking_with_items_atomic',
    'transition_booking_atomic',
    'get_recent_announcements',
    'get_all_announcements',
    'get_popular_gears',
    'get_user_dashboard',
    'get_weekly_activity_report',
    'get_gear_status_breakdown',
    'get_category_availability',
    'cancel_gear_request',
    'mark_notification_as_read',
    'mark_all_notifications_as_read',
    'create_announcement',
    'delete_gear_by_admin',
    'insert_gear_request_lines',
    -- Common notification/read APIs likely used by existing clients
    'get_user_notifications',
    'get_user_unread_notification_count',
    'fetch_user_notifications',
    'set_notification_read',
    'set_all_notifications_read'
  ];
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
      AND NOT (p.proname = ANY(allowed_names))
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM authenticated',
      r.schema_name,
      r.function_name,
      r.args
    );

    -- Ensure backend/service-role still has access
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
      r.schema_name,
      r.function_name,
      r.args
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Storage listing hardening for public bucket
-- ---------------------------------------------------------------------------
-- Remove broad SELECT listing policies for gear_images bucket on storage.objects.
-- Public object URL reads for public buckets continue to work without broad RLS listing.
DROP POLICY IF EXISTS "Anyone can view gear images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_0" ON storage.objects;

-- Optional: allow authenticated uploads only to gear_images (if uploads are app-driven).
-- Safe no-op if already present with same name dropped/recreated.
DROP POLICY IF EXISTS "gear_images_upload_authenticated" ON storage.objects;
CREATE POLICY "gear_images_upload_authenticated"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gear_images');
