-- Create reusable function for handling gear reservations
CREATE OR REPLACE FUNCTION handle_gear_reservation(
    p_gear_ids UUID[],
    p_user_id UUID,
    p_reason TEXT,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_duration TEXT
) RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
BEGIN
    -- Create gear request
    INSERT INTO gear_requests (
        user_id,
        gear_ids,
        reason,
        expected_duration,
        status,
        created_at
    ) VALUES (
        p_user_id,
        p_gear_ids,
        p_reason,
        p_duration,
        'Pending',
        NOW()
    )
    RETURNING id INTO v_request_id;

    -- Create calendar bookings for each gear
    INSERT INTO gear_calendar_bookings (
        gear_id,
        user_id,
        request_id,
        title,
        start_date,
        end_date,
        status,
        reason,
        created_at
    )
    SELECT 
        g.id,
        p_user_id,
        v_request_id,
        format('%s Booking', g.name),
        p_start_date,
        p_end_date,
        'Pending',
        p_reason,
        NOW()
    FROM unnest(p_gear_ids) gid
    JOIN gears g ON g.id = gid::uuid;

    -- Update gear status to Pending
    UPDATE gears
    SET 
        status = 'Pending',
        current_request_id = v_request_id,
        updated_at = NOW()
    WHERE id = ANY(p_gear_ids);

    -- Create initial notification
    INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        read,
        created_at
    ) VALUES (
        p_user_id,
        'Booking Request Submitted',
        'Your gear request has been submitted and is pending approval.',
        'request',
        false,
        NOW()
    );

    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;
