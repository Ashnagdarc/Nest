-- Implement check_gear_availability function to prevent double-booking
-- This function checks if gear is available for booking during specified dates

CREATE OR REPLACE FUNCTION check_gear_availability(
    p_gear_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_gear_record RECORD;
    v_conflicting_bookings INTEGER;
    v_available_quantity INTEGER;
    v_requested_quantity INTEGER := 1; -- Default to 1 for calendar bookings
    v_result JSONB;
BEGIN
    -- Validate input parameters
    IF p_gear_id IS NULL THEN
        RETURN jsonb_build_object(
            'available', false,
            'error', 'Gear ID is required',
            'available_quantity', 0
        );
    END IF;
    
    IF p_start_date IS NULL OR p_end_date IS NULL THEN
        RETURN jsonb_build_object(
            'available', false,
            'error', 'Start date and end date are required',
            'available_quantity', 0
        );
    END IF;
    
    IF p_start_date >= p_end_date THEN
        RETURN jsonb_build_object(
            'available', false,
            'error', 'Start date must be before end date',
            'available_quantity', 0
        );
    END IF;
    
    -- Get gear information
    SELECT id, name, total_quantity, available_quantity, status
    INTO v_gear_record
    FROM gears
    WHERE id = p_gear_id;
    
    -- Check if gear exists
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'available', false,
            'error', 'Gear not found',
            'available_quantity', 0
        );
    END IF;
    
    -- Check if gear is in maintenance
    IF v_gear_record.status = 'Maintenance' THEN
        RETURN jsonb_build_object(
            'available', false,
            'error', 'Gear is currently under maintenance',
            'available_quantity', 0,
            'gear_status', v_gear_record.status
        );
    END IF;
    
    -- Check for active maintenance during the requested period
    IF EXISTS (
        SELECT 1 FROM gear_maintenance gm
        WHERE gm.gear_id = p_gear_id
        AND gm.status IN ('Scheduled', 'In Progress')
        AND (gm.start_date, gm.end_date) OVERLAPS (p_start_date, p_end_date)
    ) THEN
        RETURN jsonb_build_object(
            'available', false,
            'error', 'Gear has scheduled maintenance during this period',
            'available_quantity', 0,
            'gear_status', v_gear_record.status
        );
    END IF;
    
    -- Count conflicting approved/pending bookings during the requested period
    SELECT COUNT(*)
    INTO v_conflicting_bookings
    FROM gear_calendar_bookings
    WHERE gear_id = p_gear_id
    AND status IN ('Approved', 'Pending')
    AND id != COALESCE(p_exclude_booking_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (start_date, end_date) OVERLAPS (p_start_date, p_end_date);
    
    -- Calculate available quantity during the requested period
    v_available_quantity := v_gear_record.total_quantity - v_conflicting_bookings;
    
    -- Check if there's enough quantity available
    IF v_available_quantity >= v_requested_quantity THEN
        v_result := jsonb_build_object(
            'available', true,
            'available_quantity', v_available_quantity,
            'total_quantity', v_gear_record.total_quantity,
            'conflicting_bookings', v_conflicting_bookings,
            'gear_status', v_gear_record.status,
            'gear_name', v_gear_record.name
        );
    ELSE
        v_result := jsonb_build_object(
            'available', false,
            'error', 'Insufficient quantity available during this period',
            'available_quantity', v_available_quantity,
            'total_quantity', v_gear_record.total_quantity,
            'conflicting_bookings', v_conflicting_bookings,
            'gear_status', v_gear_record.status,
            'gear_name', v_gear_record.name
        );
    END IF;
    
    RETURN v_result;
END;
$$;

-- Create a simpler boolean version for backward compatibility
CREATE OR REPLACE FUNCTION check_gear_availability_simple(
    p_gear_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
BEGIN
    v_result := check_gear_availability(p_gear_id, p_start_date, p_end_date, p_exclude_booking_id);
    RETURN (v_result->>'available')::BOOLEAN;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_gear_availability(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_gear_availability_simple(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated, service_role;

-- Add comments
COMMENT ON FUNCTION check_gear_availability(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) IS 'Comprehensive gear availability check with detailed response including quantity and conflict information';
COMMENT ON FUNCTION check_gear_availability_simple(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) IS 'Simple boolean gear availability check for backward compatibility';