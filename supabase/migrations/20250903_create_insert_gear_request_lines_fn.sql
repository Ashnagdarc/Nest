-- Secure RPC to insert gear request lines bypassing RLS via SECURITY DEFINER
-- This ensures line insertion works even if the web runtime fails to use the service role key.

CREATE OR REPLACE FUNCTION public.insert_gear_request_lines(
  p_request_id uuid,
  p_lines jsonb
)
RETURNS TABLE(gear_request_id uuid, gear_id uuid, quantity int)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item jsonb;
  v_gear_id uuid;
  v_qty int;
BEGIN
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'request_id is required';
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' THEN
    RAISE EXCEPTION 'lines must be a JSON array';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_gear_id := (v_item->>'gear_id')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::int, 1);
    IF v_gear_id IS NULL THEN
      RAISE EXCEPTION 'line missing gear_id';
    END IF;
    IF v_qty IS NULL OR v_qty < 1 THEN
      v_qty := 1;
    END IF;

    INSERT INTO public.gear_request_gears (gear_request_id, gear_id, quantity, created_at, updated_at)
    VALUES (p_request_id, v_gear_id, v_qty, NOW(), NOW())
    RETURNING gear_request_id, gear_id, quantity
    INTO gear_request_id, gear_id, quantity;

    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.insert_gear_request_lines(uuid, jsonb) TO authenticated, service_role;


