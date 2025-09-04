-- Create the missing handle_gear_reservation function
-- This function handles calendar reservations (NOT gear_requests)

CREATE OR REPLACE FUNCTION public.handle_gear_reservation(
    p_gear_ids UUID[],
    p_user_id UUID,
    p_reason TEXT,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_duration TEXT
)
RETURNS TABLE(booking_ids UUID[], booking_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id UUID;
    v_gear_id UUID;
    v_booking_count INTEGER := 0;
    v_booking_ids UUID[] := ARRAY[]::UUID[];
BEGIN
    -- Validate inputs
    IF p_gear_ids IS NULL OR array_length(p_gear_ids, 1) = 0 THEN
        RAISE EXCEPTION 'gear_ids array cannot be empty';
    END IF;
    
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'user_id is required';
    END IF;
    
    IF p_reason IS NULL OR p_reason = '' THEN
        RAISE EXCEPTION 'reason is required';
    END IF;

    -- Create a calendar booking for each gear
    FOREACH v_gear_id IN ARRAY p_gear_ids
    LOOP
        INSERT INTO public.gear_calendar_bookings (
            gear_id,
            user_id,
            title,
            start_date,
            end_date,
            reason,
            status,
            is_all_day,
            created_at,
            updated_at
        ) VALUES (
            v_gear_id,
            p_user_id,
            (SELECT name FROM public.gears WHERE id = v_gear_id), -- Title from gear name
            p_start_date,
            p_end_date,
            p_reason,
            'Pending', -- Initial status is Pending
            false, -- Assuming not all-day for now, can be extended
            NOW(),
            NOW()
        ) RETURNING id INTO v_booking_id;
        
        v_booking_ids := array_append(v_booking_ids, v_booking_id);
        v_booking_count := v_booking_count + 1;
    END LOOP;

    -- Create in-app notification for admins (using correct 'is_read' column)
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        is_read,
        created_at,
        updated_at,
        metadata
    )
    SELECT 
        p.id,
        'new_calendar_booking',
        'New Calendar Reservation',
        'A new gear reservation has been made for ' || v_booking_count || ' item(s) from ' || to_char(p_start_date, 'YYYY-MM-DD') || ' to ' || to_char(p_end_date, 'YYYY-MM-DD') || '.',
        false,
        NOW(),
        NOW(),
        json_build_object('bookingIds', v_booking_ids)::jsonb
    FROM public.profiles p
    WHERE p.role = 'Admin' AND p.status = 'Active';

    -- Create notification for user who made the reservation
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        is_read,
        created_at,
        updated_at,
        metadata
    ) VALUES (
        p_user_id,
        'reservation_created',
        'Reservation Created',
        'Your reservation for ' || v_booking_count || ' item(s) has been created and is pending admin approval.',
        false,
        NOW(),
        NOW(),
        json_build_object('bookingIds', v_booking_ids)::jsonb
    );

    -- Return the booking details
    booking_ids := v_booking_ids;
    booking_count := v_booking_count;
    RETURN NEXT;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_gear_reservation(UUID[], UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated, service_role;
