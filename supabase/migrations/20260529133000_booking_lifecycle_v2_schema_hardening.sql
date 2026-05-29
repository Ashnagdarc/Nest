-- Schema hardening for booking lifecycle v2

-- 1) Ensure RLS policies actually exist on newly introduced tables
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select_own_or_admin" ON public.bookings;
CREATE POLICY "bookings_select_own_or_admin" ON public.bookings
FOR SELECT TO authenticated
USING (
  requester_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active'
  )
);

DROP POLICY IF EXISTS "bookings_insert_own_or_admin" ON public.bookings;
CREATE POLICY "bookings_insert_own_or_admin" ON public.bookings
FOR INSERT TO authenticated
WITH CHECK (
  requester_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active'
  )
);

DROP POLICY IF EXISTS "bookings_update_own_or_admin" ON public.bookings;
CREATE POLICY "bookings_update_own_or_admin" ON public.bookings
FOR UPDATE TO authenticated
USING (
  requester_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active'
  )
)
WITH CHECK (
  requester_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active'
  )
);

DROP POLICY IF EXISTS "booking_items_select_by_booking_access" ON public.booking_items;
CREATE POLICY "booking_items_select_by_booking_access" ON public.booking_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = booking_id
      AND (
        b.requester_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active'
        )
      )
  )
);

DROP POLICY IF EXISTS "booking_items_mutate_admin_only" ON public.booking_items;
CREATE POLICY "booking_items_mutate_admin_only" ON public.booking_items
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active'
  )
);

DROP POLICY IF EXISTS "booking_status_history_select_by_booking_access" ON public.booking_status_history;
CREATE POLICY "booking_status_history_select_by_booking_access" ON public.booking_status_history
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = booking_id
      AND (
        b.requester_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active'
        )
      )
  )
);

DROP POLICY IF EXISTS "booking_status_history_insert_admin_only" ON public.booking_status_history;
CREATE POLICY "booking_status_history_insert_admin_only" ON public.booking_status_history
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active'
  )
);

DROP POLICY IF EXISTS "email_logs_admin_only" ON public.email_logs;
CREATE POLICY "email_logs_admin_only" ON public.email_logs
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active'
  )
);

DROP POLICY IF EXISTS "audit_logs_admin_only" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_only" ON public.audit_logs
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active'
  )
);

-- 2) Remove SECURITY DEFINER risk on compat view
ALTER VIEW public.v_booking_lifecycle_compat SET (security_invoker = true);

-- 3) Restrict RPC exposure for internal/admin-only functions
REVOKE EXECUTE ON FUNCTION public.upsert_booking_from_legacy(text, uuid, uuid, public.booking_lifecycle_status, timestamptz, timestamptz, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.backfill_bookings_v2() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_complete_overdue_car_bookings() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.create_booking_with_items_atomic(text, uuid, uuid, timestamptz, timestamptz, jsonb, text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.transition_booking_atomic(uuid, public.booking_lifecycle_status, uuid, text, jsonb, text) FROM PUBLIC, anon;

-- Keep callable for authenticated app users only if intentionally needed through PostgREST/RPC.
-- If you want API-only access, revoke from authenticated too and rely on service_role backend calls.

-- 4) Lock function search_path for newly introduced functions
ALTER FUNCTION public.upsert_booking_from_legacy(text, uuid, uuid, public.booking_lifecycle_status, timestamptz, timestamptz, jsonb)
  SET search_path = public, extensions;
ALTER FUNCTION public.backfill_bookings_v2()
  SET search_path = public, extensions;
ALTER FUNCTION public.auto_complete_overdue_car_bookings()
  SET search_path = public, extensions;
ALTER FUNCTION public.create_booking_with_items_atomic(text, uuid, uuid, timestamptz, timestamptz, jsonb, text, jsonb)
  SET search_path = public, extensions;
ALTER FUNCTION public.transition_booking_atomic(uuid, public.booking_lifecycle_status, uuid, text, jsonb, text)
  SET search_path = public, extensions;
