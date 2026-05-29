-- Booking lifecycle v2 foundation (additive, dual-run safe)

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_lifecycle_status') THEN
    CREATE TYPE public.booking_lifecycle_status AS ENUM (
      'pending',
      'approved',
      'checked_out',
      'active',
      'completed',
      'cancelled',
      'overdue',
      'failed'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  source_type text NOT NULL CHECK (source_type IN ('gear_request', 'car_booking', 'manual')),
  source_id uuid NULL,
  requester_id uuid NOT NULL REFERENCES public.profiles(id),
  status public.booking_lifecycle_status NOT NULL DEFAULT 'pending',
  start_at timestamptz NULL,
  end_at timestamptz NULL,
  approved_at timestamptz NULL,
  completed_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id)
);

CREATE TABLE IF NOT EXISTS public.booking_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('gear', 'car')),
  gear_id uuid NULL REFERENCES public.gears(id),
  car_id uuid NULL REFERENCES public.cars(id),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status public.booking_lifecycle_status NOT NULL DEFAULT 'pending',
  checked_out_at timestamptz NULL,
  returned_at timestamptz NULL,
  failure_reason text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_items_single_item_ref CHECK (
    (item_type = 'gear' AND gear_id IS NOT NULL AND car_id IS NULL)
    OR (item_type = 'car' AND car_id IS NOT NULL AND gear_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.booking_status_history (
  id bigserial PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  old_status public.booking_lifecycle_status NULL,
  new_status public.booking_lifecycle_status NOT NULL,
  changed_by uuid NULL REFERENCES public.profiles(id),
  reason text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NULL REFERENCES public.bookings(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'resend',
  template_name text NOT NULL,
  recipient text NOT NULL,
  payload_hash text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 1,
  status text NOT NULL CHECK (status IN ('queued', 'sent', 'failed')),
  provider_message_id text NULL,
  error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipient, template_name, payload_hash)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigserial PRIMARY KEY,
  actor_id uuid NULL REFERENCES public.profiles(id),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_items_active_gear
  ON public.booking_items (gear_id)
  WHERE gear_id IS NOT NULL AND status IN ('approved', 'checked_out', 'active', 'overdue');

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_items_active_car
  ON public.booking_items (car_id)
  WHERE car_id IS NOT NULL AND status IN ('approved', 'checked_out', 'active', 'overdue');

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_idempotency
  ON public.bookings (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_items_idempotency
  ON public.booking_items (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_status_end_at ON public.bookings(status, end_at);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking_id ON public.booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking_id ON public.booking_status_history(booking_id, created_at DESC);

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
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active')
);

DROP POLICY IF EXISTS "bookings_insert_own_or_admin" ON public.bookings;
CREATE POLICY "bookings_insert_own_or_admin" ON public.bookings
FOR INSERT TO authenticated
WITH CHECK (
  requester_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active')
);

DROP POLICY IF EXISTS "bookings_update_own_or_admin" ON public.bookings;
CREATE POLICY "bookings_update_own_or_admin" ON public.bookings
FOR UPDATE TO authenticated
USING (
  requester_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active')
)
WITH CHECK (
  requester_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active')
);

DROP POLICY IF EXISTS "booking_items_select_by_booking_access" ON public.booking_items;
CREATE POLICY "booking_items_select_by_booking_access" ON public.booking_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND (
      b.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active')
    )
  )
);

DROP POLICY IF EXISTS "booking_items_mutate_admin_only" ON public.booking_items;
CREATE POLICY "booking_items_mutate_admin_only" ON public.booking_items
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active'));

DROP POLICY IF EXISTS "booking_status_history_select_by_booking_access" ON public.booking_status_history;
CREATE POLICY "booking_status_history_select_by_booking_access" ON public.booking_status_history
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND (
      b.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active')
    )
  )
);

DROP POLICY IF EXISTS "booking_status_history_insert_admin_only" ON public.booking_status_history;
CREATE POLICY "booking_status_history_insert_admin_only" ON public.booking_status_history
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active'));

DROP POLICY IF EXISTS "email_logs_admin_only" ON public.email_logs;
CREATE POLICY "email_logs_admin_only" ON public.email_logs
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active'));

DROP POLICY IF EXISTS "audit_logs_admin_only" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_only" ON public.audit_logs
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin' AND p.status = 'Active'));

CREATE OR REPLACE FUNCTION public.booking_status_transition_allowed(
  p_old public.booking_lifecycle_status,
  p_new public.booking_lifecycle_status
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_old = p_new THEN true
    WHEN p_old = 'pending' AND p_new IN ('approved', 'cancelled', 'failed') THEN true
    WHEN p_old = 'approved' AND p_new IN ('checked_out', 'cancelled', 'failed') THEN true
    WHEN p_old = 'checked_out' AND p_new IN ('active', 'completed', 'overdue', 'failed') THEN true
    WHEN p_old = 'active' AND p_new IN ('completed', 'overdue', 'failed') THEN true
    WHEN p_old = 'overdue' AND p_new IN ('completed', 'failed') THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_booking_from_legacy(
  p_source_type text,
  p_source_id uuid,
  p_requester_id uuid,
  p_status public.booking_lifecycle_status,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id uuid;
  v_ref text;
BEGIN
  v_ref := upper(substr(md5(p_source_type || '-' || p_source_id::text), 1, 10));

  INSERT INTO public.bookings(reference, source_type, source_id, requester_id, status, start_at, end_at, metadata)
  VALUES(v_ref, p_source_type, p_source_id, p_requester_id, p_status, p_start_at, p_end_at, COALESCE(p_metadata, '{}'::jsonb))
  ON CONFLICT (source_type, source_id)
  DO UPDATE SET
    requester_id = excluded.requester_id,
    status = excluded.status,
    start_at = excluded.start_at,
    end_at = excluded.end_at,
    metadata = excluded.metadata,
    updated_at = now()
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.backfill_bookings_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r record;
  v_booking_id uuid;
BEGIN
  FOR r IN
    SELECT id, user_id, status, created_at, due_date FROM public.gear_requests
  LOOP
    v_booking_id := public.upsert_booking_from_legacy(
      'gear_request',
      r.id,
      r.user_id,
      CASE
        WHEN lower(r.status) = 'approved' THEN 'approved'::public.booking_lifecycle_status
        WHEN lower(r.status) = 'completed' THEN 'completed'::public.booking_lifecycle_status
        WHEN lower(r.status) = 'cancelled' THEN 'cancelled'::public.booking_lifecycle_status
        WHEN lower(r.status) = 'rejected' THEN 'failed'::public.booking_lifecycle_status
        ELSE 'pending'::public.booking_lifecycle_status
      END,
      r.created_at,
      r.due_date,
      jsonb_build_object('legacy', 'gear_requests')
    );

    INSERT INTO public.booking_items(booking_id, item_type, gear_id, quantity, status, metadata)
    SELECT
      v_booking_id,
      'gear',
      grg.gear_id,
      grg.quantity,
      (SELECT status FROM public.bookings WHERE id = v_booking_id),
      jsonb_build_object('legacy_line_id', grg.id)
    FROM public.gear_request_gears grg
    WHERE grg.gear_request_id = r.id
    ON CONFLICT DO NOTHING;
  END LOOP;

  FOR r IN
    SELECT id, requester_id, status, created_at, date_of_use, time_slot, start_time, end_time FROM public.car_bookings
  LOOP
    v_booking_id := public.upsert_booking_from_legacy(
      'car_booking',
      r.id,
      r.requester_id,
      CASE
        WHEN lower(r.status) = 'approved' THEN 'approved'::public.booking_lifecycle_status
        WHEN lower(r.status) = 'completed' THEN 'completed'::public.booking_lifecycle_status
        WHEN lower(r.status) = 'cancelled' THEN 'cancelled'::public.booking_lifecycle_status
        WHEN lower(r.status) = 'rejected' THEN 'failed'::public.booking_lifecycle_status
        ELSE 'pending'::public.booking_lifecycle_status
      END,
      r.created_at,
      COALESCE((r.date_of_use::text || ' ' || COALESCE(r.end_time::text, split_part(COALESCE(r.time_slot, ''), '-', 2), '23:59'))::timestamptz, r.created_at),
      jsonb_build_object('legacy', 'car_bookings', 'time_slot', r.time_slot)
    );

    INSERT INTO public.booking_items(booking_id, item_type, car_id, quantity, status, metadata)
    SELECT
      v_booking_id,
      'car',
      ca.car_id,
      1,
      (SELECT status FROM public.bookings WHERE id = v_booking_id),
      jsonb_build_object('legacy_booking_id', r.id)
    FROM public.car_assignment ca
    WHERE ca.booking_id = r.id
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_complete_overdue_car_bookings()
RETURNS TABLE(processed integer, failed integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r record;
  v_processed integer := 0;
  v_failed integer := 0;
BEGIN
  FOR r IN
    SELECT b.id AS booking_id, b.source_id AS legacy_car_booking_id
    FROM public.bookings b
    WHERE b.source_type = 'car_booking'
      AND b.status IN ('approved', 'checked_out', 'active', 'overdue')
      AND b.end_at IS NOT NULL
      AND b.end_at <= now()
  LOOP
    BEGIN
      UPDATE public.bookings
      SET status = 'completed', completed_at = now(), updated_at = now()
      WHERE id = r.booking_id
        AND status <> 'completed';

      UPDATE public.booking_items
      SET status = 'completed', returned_at = now(), updated_at = now()
      WHERE booking_id = r.booking_id
        AND item_type = 'car'
        AND status <> 'completed';

      INSERT INTO public.booking_status_history(booking_id, old_status, new_status, reason, metadata)
      SELECT r.booking_id, b.status, 'completed', 'auto check-in by scheduler', jsonb_build_object('job', 'auto_complete_overdue_car_bookings')
      FROM public.bookings b
      WHERE b.id = r.booking_id
      ON CONFLICT DO NOTHING;

      IF r.legacy_car_booking_id IS NOT NULL THEN
        UPDATE public.car_bookings
        SET status = 'Completed', updated_at = now()
        WHERE id = r.legacy_car_booking_id
          AND status <> 'Completed';
      END IF;

      INSERT INTO public.audit_logs(actor_id, entity_type, entity_id, action, metadata)
      VALUES (NULL, 'booking', r.booking_id::text, 'auto_checkin_completed', jsonb_build_object('legacy_car_booking_id', r.legacy_car_booking_id));

      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT v_processed, v_failed;
END;
$$;

-- Compatibility view for frontend dual-run introspection
CREATE OR REPLACE VIEW public.v_booking_lifecycle_compat AS
SELECT
  b.id,
  b.reference,
  b.source_type,
  b.source_id,
  b.requester_id,
  b.status,
  b.start_at,
  b.end_at,
  b.created_at,
  b.updated_at,
  COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', bi.id,
      'item_type', bi.item_type,
      'gear_id', bi.gear_id,
      'car_id', bi.car_id,
      'quantity', bi.quantity,
      'status', bi.status
    )
  ) FILTER (WHERE bi.id IS NOT NULL), '[]'::jsonb) AS items
FROM public.bookings b
LEFT JOIN public.booking_items bi ON bi.booking_id = b.id
GROUP BY b.id;

-- Backfill now (safe, idempotent)
SELECT public.backfill_bookings_v2();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'nest_auto_complete_overdue_car_bookings'
    ) THEN
      PERFORM cron.schedule(
        'nest_auto_complete_overdue_car_bookings',
        '*/5 * * * *',
        $cron$SELECT public.auto_complete_overdue_car_bookings();$cron$
      );
    END IF;
  END IF;
END $$;
