-- Rollback for gear functions update

-- Restore original update_gear_status function
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
    UPDATE public.gears
    SET 
        status = p_status,
        available_quantity = p_available_quantity,
        checked_out_to = p_checked_out_to,
        current_request_id = p_current_request_id,
        due_date = p_due_date,
        updated_at = NOW()
    WHERE id = p_gear_id;
END;
$$;

-- Restore original checkout_gear function
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
BEGIN
    UPDATE public.gears
    SET 
        status = 'Checked Out',
        available_quantity = 0,
        checked_out_to = p_user_id,
        current_request_id = p_request_id,
        due_date = p_due_date,
        updated_at = NOW()
    WHERE id = p_gear_id;
END;
$$;

-- Restore original checkin_gear function
CREATE OR REPLACE FUNCTION public.checkin_gear(
    p_gear_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.gears
    SET 
        status = 'Available',
        available_quantity = quantity,
        checked_out_to = NULL,
        current_request_id = NULL,
        due_date = NULL,
        updated_at = NOW()
    WHERE id = p_gear_id;
END;
$$;

-- Restore execute permissions
GRANT EXECUTE ON FUNCTION public.update_gear_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_gear TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_gear TO authenticated;
