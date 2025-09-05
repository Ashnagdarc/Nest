-- Create essential database functions for gear management
-- This migration creates functions for gear availability, checkout, checkin, and request processing

-- Function to check gear availability
CREATE OR REPLACE FUNCTION public.check_gear_availability(
    p_gear_id UUID,
    p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    gear_record RECORD;
    current_state RECORD;
    result JSONB;
BEGIN
    -- Get gear information
    SELECT id, name, quantity as total_quantity
    INTO gear_record
    FROM public.gears
    WHERE id = p_gear_id;
    
    -- Check if gear exists
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'available', false,
            'error', 'Gear not found',
            'available_quantity', 0,
            'total_quantity', 0
        );
    END IF;
    
    -- Get current state
    SELECT status, available_quantity
    INTO current_state
    FROM public.gear_states
    WHERE gear_id = p_gear_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no state exists, create one
    IF NOT FOUND THEN
        INSERT INTO public.gear_states (gear_id, status, available_quantity)
        VALUES (p_gear_id, 'Available', gear_record.total_quantity);
        
        current_state.status := 'Available';
        current_state.available_quantity := gear_record.total_quantity;
    END IF;
    
    -- Check availability
    IF current_state.status = 'Available' AND current_state.available_quantity >= p_quantity THEN
        result := jsonb_build_object(
            'available', true,
            'available_quantity', current_state.available_quantity,
            'total_quantity', gear_record.total_quantity,
            'gear_name', gear_record.name
        );
    ELSE
        result := jsonb_build_object(
            'available', false,
            'available_quantity', current_state.available_quantity,
            'total_quantity', gear_record.total_quantity,
            'gear_name', gear_record.name,
            'reason', CASE 
                WHEN current_state.status != 'Available' THEN 'Gear is ' || current_state.status
                ELSE 'Insufficient quantity available'
            END
        );
    END IF;
    
    RETURN result;
END;
$$;

-- Function to update gear state
CREATE OR REPLACE FUNCTION public.update_gear_state(
    p_gear_id UUID,
    p_status TEXT,
    p_available_quantity INTEGER,
    p_checked_out_to UUID DEFAULT NULL,
    p_current_request_id UUID DEFAULT NULL,
    p_due_date TIMESTAMPTZ DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert new state record
    INSERT INTO public.gear_states (
        gear_id,
        status,
        available_quantity,
        checked_out_to,
        current_request_id,
        due_date,
        notes
    ) VALUES (
        p_gear_id,
        p_status,
        p_available_quantity,
        p_checked_out_to,
        p_current_request_id,
        p_due_date,
        p_notes
    );
END;
$$;

-- Function to process gear checkout
CREATE OR REPLACE FUNCTION public.process_gear_checkout(
    p_gear_id UUID,
    p_user_id UUID,
    p_request_id UUID,
    p_quantity INTEGER,
    p_due_date TIMESTAMPTZ,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    availability_result JSONB;
    current_state RECORD;
    new_available_quantity INTEGER;
    new_status TEXT;
    result JSONB;
BEGIN
    -- Check availability first
    availability_result := public.check_gear_availability(p_gear_id, p_quantity);
    
    IF NOT (availability_result->>'available')::boolean THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', availability_result->>'reason',
            'availability', availability_result
        );
    END IF;
    
    -- Get current state
    SELECT available_quantity
    INTO current_state
    FROM public.gear_states
    WHERE gear_id = p_gear_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Calculate new quantities
    new_available_quantity := current_state.available_quantity - p_quantity;
    
    -- Determine new status
    IF new_available_quantity <= 0 THEN
        new_status := 'Checked Out';
    ELSE
        new_status := 'Partially Available';
    END IF;
    
    -- Update gear state
    PERFORM public.update_gear_state(
        p_gear_id,
        new_status,
        new_available_quantity,
        p_user_id,
        p_request_id,
        p_due_date,
        p_notes
    );
    
    -- Create check-in record for checkout
    INSERT INTO public.checkins (
        user_id,
        gear_id,
        request_id,
        action,
        status,
        quantity,
        notes
    ) VALUES (
        p_user_id,
        p_gear_id,
        p_request_id,
        'Check Out',
        'Completed',
        p_quantity,
        p_notes
    );
    
    result := jsonb_build_object(
        'success', true,
        'new_status', new_status,
        'new_available_quantity', new_available_quantity,
        'checked_out_quantity', p_quantity
    );
    
    RETURN result;
END;
$$;

-- Function to process gear checkin
CREATE OR REPLACE FUNCTION public.process_gear_checkin(
    p_gear_id UUID,
    p_user_id UUID,
    p_quantity INTEGER,
    p_condition TEXT DEFAULT 'Good',
    p_notes TEXT DEFAULT NULL,
    p_damage_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_state RECORD;
    total_quantity INTEGER;
    new_available_quantity INTEGER;
    new_status TEXT;
    result JSONB;
BEGIN
    -- Get gear total quantity
    SELECT quantity INTO total_quantity
    FROM public.gears
    WHERE id = p_gear_id;
    
    -- Get current state
    SELECT available_quantity
    INTO current_state
    FROM public.gear_states
    WHERE gear_id = p_gear_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Calculate new quantities
    new_available_quantity := current_state.available_quantity + p_quantity;
    
    -- Determine new status
    IF new_available_quantity >= total_quantity THEN
        new_status := 'Available';
    ELSE
        new_status := 'Partially Available';
    END IF;
    
    -- Update gear state
    PERFORM public.update_gear_state(
        p_gear_id,
        new_status,
        new_available_quantity,
        NULL, -- checked_out_to
        NULL, -- current_request_id
        NULL, -- due_date
        p_notes
    );
    
    -- Create check-in record
    INSERT INTO public.checkins (
        user_id,
        gear_id,
        action,
        status,
        quantity,
        condition,
        notes,
        damage_notes
    ) VALUES (
        p_user_id,
        p_gear_id,
        'Check In',
        'Completed',
        p_quantity,
        p_condition,
        p_notes,
        p_damage_notes
    );
    
    result := jsonb_build_object(
        'success', true,
        'new_status', new_status,
        'new_available_quantity', new_available_quantity,
        'checked_in_quantity', p_quantity
    );
    
    RETURN result;
END;
$$;

-- Function to approve gear request
CREATE OR REPLACE FUNCTION public.approve_gear_request(
    p_request_id UUID,
    p_admin_id UUID,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    request_record RECORD;
    gear_line RECORD;
    checkout_result JSONB;
    all_successful BOOLEAN := true;
    results JSONB := '[]'::jsonb;
    result JSONB;
BEGIN
    -- Get request details
    SELECT * INTO request_record
    FROM public.gear_requests
    WHERE id = p_request_id AND status = 'Pending';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request not found or not pending'
        );
    END IF;
    
    -- Update request status
    UPDATE public.gear_requests
    SET 
        status = 'Approved',
        approved_at = NOW(),
        admin_notes = p_admin_notes,
        updated_by = p_admin_id
    WHERE id = p_request_id;
    
    -- Process each gear in the request
    FOR gear_line IN 
        SELECT grg.gear_id, grg.quantity
        FROM public.gear_request_gears grg
        WHERE grg.gear_request_id = p_request_id
    LOOP
        -- Process checkout for this gear
        checkout_result := public.process_gear_checkout(
            gear_line.gear_id,
            request_record.user_id,
            p_request_id,
            gear_line.quantity,
            request_record.due_date,
            'Approved by admin'
        );
        
        -- Add to results
        results := results || jsonb_build_object(
            'gear_id', gear_line.gear_id,
            'quantity', gear_line.quantity,
            'checkout_result', checkout_result
        );
        
        -- Check if this checkout was successful
        IF NOT (checkout_result->>'success')::boolean THEN
            all_successful := false;
        END IF;
    END LOOP;
    
    -- Create notification for user
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        link,
        metadata
    ) VALUES (
        request_record.user_id,
        'Approval',
        'Request Approved',
        'Your equipment request has been approved.',
        '/user/requests/' || p_request_id,
        jsonb_build_object('request_id', p_request_id)
    );
    
    result := jsonb_build_object(
        'success', all_successful,
        'request_id', p_request_id,
        'gear_results', results
    );
    
    RETURN result;
END;
$$;

-- Function to reject gear request
CREATE OR REPLACE FUNCTION public.reject_gear_request(
    p_request_id UUID,
    p_admin_id UUID,
    p_admin_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    request_record RECORD;
    result JSONB;
BEGIN
    -- Get request details
    SELECT * INTO request_record
    FROM public.gear_requests
    WHERE id = p_request_id AND status = 'Pending';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request not found or not pending'
        );
    END IF;
    
    -- Update request status
    UPDATE public.gear_requests
    SET 
        status = 'Rejected',
        admin_notes = p_admin_notes,
        updated_by = p_admin_id
    WHERE id = p_request_id;
    
    -- Create notification for user
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        link,
        metadata
    ) VALUES (
        request_record.user_id,
        'Rejection',
        'Request Rejected',
        'Your equipment request has been rejected: ' || p_admin_notes,
        '/user/requests/' || p_request_id,
        jsonb_build_object('request_id', p_request_id)
    );
    
    result := jsonb_build_object(
        'success', true,
        'request_id', p_request_id,
        'status', 'Rejected'
    );
    
    RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.check_gear_availability(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_gear_state(UUID, TEXT, INTEGER, UUID, UUID, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_gear_checkout(UUID, UUID, UUID, INTEGER, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_gear_checkin(UUID, UUID, INTEGER, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_gear_request(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_gear_request(UUID, UUID, TEXT) TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.check_gear_availability(UUID, INTEGER) IS 'Check if gear is available for checkout';
COMMENT ON FUNCTION public.update_gear_state(UUID, TEXT, INTEGER, UUID, UUID, TIMESTAMPTZ, TEXT) IS 'Update gear state and availability';
COMMENT ON FUNCTION public.process_gear_checkout(UUID, UUID, UUID, INTEGER, TIMESTAMPTZ, TEXT) IS 'Process equipment checkout';
COMMENT ON FUNCTION public.process_gear_checkin(UUID, UUID, INTEGER, TEXT, TEXT, TEXT) IS 'Process equipment check-in';
COMMENT ON FUNCTION public.approve_gear_request(UUID, UUID, TEXT) IS 'Approve equipment request and process checkouts';
COMMENT ON FUNCTION public.reject_gear_request(UUID, UUID, TEXT) IS 'Reject equipment request';

