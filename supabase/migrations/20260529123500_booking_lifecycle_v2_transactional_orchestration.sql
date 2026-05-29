-- Transactional orchestration RPCs for booking lifecycle v2

CREATE OR REPLACE FUNCTION public.create_booking_with_items_atomic(
  p_source_type text,
  p_source_id uuid,
  p_requester_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_metadata jsonb,
  p_idempotency_key text,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_existing public.bookings%ROWTYPE;
  v_item jsonb;
  v_items jsonb := '[]'::jsonb;
  v_inserted_item public.booking_items%ROWTYPE;
  v_reference text;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.bookings
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;

    IF v_existing.id IS NOT NULL THEN
      SELECT jsonb_agg(to_jsonb(bi.*)) INTO v_items
      FROM public.booking_items bi
      WHERE bi.booking_id = v_existing.id;

      RETURN jsonb_build_object('booking', to_jsonb(v_existing), 'items', COALESCE(v_items, '[]'::jsonb), 'idempotent', true);
    END IF;
  END IF;

  v_reference := 'NBE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  INSERT INTO public.bookings (
    reference,
    source_type,
    source_id,
    requester_id,
    status,
    start_at,
    end_at,
    metadata,
    idempotency_key
  ) VALUES (
    v_reference,
    p_source_type,
    p_source_id,
    p_requester_id,
    'pending',
    p_start_at,
    p_end_at,
    COALESCE(p_metadata, '{}'::jsonb),
    p_idempotency_key
  )
  RETURNING * INTO v_booking;

  IF p_items IS NOT NULL AND jsonb_typeof(p_items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      INSERT INTO public.booking_items (
        booking_id,
        item_type,
        gear_id,
        car_id,
        quantity,
        status,
        metadata,
        idempotency_key
      ) VALUES (
        v_booking.id,
        (v_item->>'itemType')::text,
        NULLIF(v_item->>'gearId', '')::uuid,
        NULLIF(v_item->>'carId', '')::uuid,
        GREATEST(1, COALESCE((v_item->>'quantity')::int, 1)),
        'pending',
        COALESCE(v_item->'metadata', '{}'::jsonb),
        NULLIF(v_item->>'idempotencyKey', '')
      )
      RETURNING * INTO v_inserted_item;

      v_items := v_items || jsonb_build_array(to_jsonb(v_inserted_item));
    END LOOP;
  END IF;

  INSERT INTO public.booking_status_history(
    booking_id,
    old_status,
    new_status,
    changed_by,
    reason,
    metadata
  ) VALUES (
    v_booking.id,
    NULL,
    'pending',
    p_requester_id,
    'booking created',
    jsonb_build_object('source', 'create_booking_with_items_atomic')
  );

  RETURN jsonb_build_object('booking', to_jsonb(v_booking), 'items', COALESCE(v_items, '[]'::jsonb), 'idempotent', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_booking_atomic(
  p_booking_id uuid,
  p_next_status public.booking_lifecycle_status,
  p_changed_by uuid,
  p_reason text,
  p_metadata jsonb,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_updated public.bookings%ROWTYPE;
  v_items jsonb;
  v_old_status public.booking_lifecycle_status;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  v_old_status := v_booking.status;

  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.booking_status_history bsh
      WHERE bsh.booking_id = p_booking_id
        AND bsh.metadata->>'idempotencyKey' = p_idempotency_key
    ) THEN
      SELECT jsonb_agg(to_jsonb(bi.*)) INTO v_items
      FROM public.booking_items bi
      WHERE bi.booking_id = p_booking_id;

      RETURN jsonb_build_object('booking', to_jsonb(v_booking), 'items', COALESCE(v_items, '[]'::jsonb), 'idempotent', true);
    END IF;
  END IF;

  IF v_old_status <> p_next_status AND NOT public.booking_status_transition_allowed(v_old_status, p_next_status) THEN
    RAISE EXCEPTION 'Invalid booking transition from % to %', v_old_status, p_next_status;
  END IF;

  UPDATE public.bookings
  SET
    status = p_next_status,
    approved_at = CASE WHEN p_next_status = 'approved' THEN now() ELSE approved_at END,
    completed_at = CASE WHEN p_next_status = 'completed' THEN now() ELSE completed_at END,
    cancelled_at = CASE WHEN p_next_status = 'cancelled' THEN now() ELSE cancelled_at END,
    updated_at = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_updated;

  -- Deterministic multi-item behavior
  -- completed: only mark non-failed items completed
  -- failed: keep completed items completed; mark others failed
  -- other statuses: update non-completed/non-failed items to next status
  IF p_next_status = 'completed' THEN
    UPDATE public.booking_items
    SET status = 'completed', returned_at = now(), updated_at = now()
    WHERE booking_id = p_booking_id
      AND status NOT IN ('completed', 'failed');
  ELSIF p_next_status = 'failed' THEN
    UPDATE public.booking_items
    SET status = 'failed', failure_reason = COALESCE(p_reason, 'booking transition failed'), updated_at = now()
    WHERE booking_id = p_booking_id
      AND status <> 'completed';
  ELSE
    UPDATE public.booking_items
    SET status = p_next_status, updated_at = now()
    WHERE booking_id = p_booking_id
      AND status NOT IN ('completed', 'failed');
  END IF;

  INSERT INTO public.booking_status_history(
    booking_id,
    old_status,
    new_status,
    changed_by,
    reason,
    metadata
  ) VALUES (
    p_booking_id,
    v_old_status,
    p_next_status,
    p_changed_by,
    p_reason,
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('idempotencyKey', p_idempotency_key, 'source', 'transition_booking_atomic')
  );

  SELECT jsonb_agg(to_jsonb(bi.*)) INTO v_items
  FROM public.booking_items bi
  WHERE bi.booking_id = p_booking_id;

  RETURN jsonb_build_object('booking', to_jsonb(v_updated), 'items', COALESCE(v_items, '[]'::jsonb), 'idempotent', false);
END;
$$;
