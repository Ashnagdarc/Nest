-- Update the gear status update function to use gear_states
CREATE OR REPLACE FUNCTION public.update_gear_status(
    p_gear_id UUID,
    p_status TEXT,
    p_available_quantity INTEGER,
    p_checked_out_to UUID DEFAULT NULL,
    p_current_request_id UUID DEFAULT NULL,
    p_due_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert new state
    INSERT INTO public.gear_states (
        gear_id,
        status,
        available_quantity,
        checked_out_to,
        current_request_id,
        due_date
    ) VALUES (
        p_gear_id,
        p_status,
        p_available_quantity,
        p_checked_out_to,
        p_current_request_id,
        p_due_date
    );

    -- Update the gear's quantity if needed
    UPDATE public.gears
    SET quantity = GREATEST(quantity, p_available_quantity)
    WHERE id = p_gear_id;
END;
$$;

-- Update the gear checkout function
CREATE OR REPLACE FUNCTION public.checkout_gear(
    p_gear_id UUID,
    p_user_id UUID,
    p_request_id UUID,
    p_quantity INTEGER,
    p_due_date TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_quantity INTEGER;
    v_new_status TEXT;
BEGIN
    -- Get current available quantity
    SELECT available_quantity INTO v_current_quantity
    FROM public.gear_states
    WHERE gear_id = p_gear_id
    ORDER BY created_at DESC
    LIMIT 1;

    -- Calculate new status based on remaining quantity
    IF v_current_quantity <= p_quantity THEN
        v_new_status := 'Checked Out';
    ELSE
        v_new_status := 'Partially Checked Out';
    END IF;

    -- Insert new state
    PERFORM public.update_gear_status(
        p_gear_id := p_gear_id,
        p_status := v_new_status,
        p_available_quantity := GREATEST(0, v_current_quantity - p_quantity),
        p_checked_out_to := p_user_id,
        p_current_request_id := p_request_id,
        p_due_date := p_due_date
    );
END;
$$;

-- Update the gear checkin function
CREATE OR REPLACE FUNCTION public.checkin_gear(
    p_gear_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_quantity INTEGER;
BEGIN
    -- Get total quantity from gears table
    SELECT quantity INTO v_total_quantity
    FROM public.gears
    WHERE id = p_gear_id;

    -- Insert new state
    PERFORM public.update_gear_status(
        p_gear_id := p_gear_id,
        p_status := 'Available',
        p_available_quantity := v_total_quantity,
        p_checked_out_to := NULL,
        p_current_request_id := NULL,
        p_due_date := NULL
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_gear_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_gear TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_gear TO authenticated;
