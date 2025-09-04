-- Migration to fix calendar booking completion handling
-- This creates functions to properly handle when calendar bookings reach their end_date

-- Function to complete expired calendar bookings
CREATE OR REPLACE FUNCTION complete_expired_calendar_bookings()
RETURNS TABLE(
    completed_bookings INTEGER,
    updated_gears INTEGER,
    booking_details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    booking_record RECORD;
    completed_count INTEGER := 0;
    updated_gear_count INTEGER := 0;
    details JSONB := '[]'::JSONB;
    gear_record RECORD;
    new_available_quantity INTEGER;
BEGIN
    -- Find all approved bookings that have passed their end_date
    FOR booking_record IN
        SELECT 
            gcb.id,
            gcb.gear_id,
            gcb.user_id,
            gcb.end_date,
            gcb.reason,
            g.name as gear_name,
            g.quantity,
            g.available_quantity,
            g.status
        FROM gear_calendar_bookings gcb
        JOIN gears g ON gcb.gear_id = g.id
        WHERE gcb.status = 'Approved'
          AND gcb.end_date < NOW()
    LOOP
        -- Update the booking status to 'Completed'
        UPDATE gear_calendar_bookings
        SET 
            status = 'Completed',
            updated_at = NOW()
        WHERE id = booking_record.id;
        
        completed_count := completed_count + 1;
        
        -- Get current gear details
        SELECT quantity, available_quantity, status INTO gear_record
        FROM gears
        WHERE id = booking_record.gear_id;
        
        -- Calculate new available quantity (increase by 1 since booking is completed)
        new_available_quantity := LEAST(
            COALESCE(gear_record.quantity, 1),
            COALESCE(gear_record.available_quantity, 0) + 1
        );
        
        -- Update gear status based on new availability
        UPDATE gears
        SET 
            status = CASE 
                WHEN new_available_quantity >= COALESCE(gear_record.quantity, 1) THEN 'Available'
                WHEN new_available_quantity > 0 THEN 'Partially Checked Out'
                ELSE gear_record.status -- Keep current status if still no availability
            END,
            available_quantity = new_available_quantity,
            -- Clear checkout fields only if gear becomes fully available
            checked_out_to = CASE 
                WHEN new_available_quantity >= COALESCE(gear_record.quantity, 1) THEN NULL
                ELSE checked_out_to
            END,
            current_request_id = CASE 
                WHEN new_available_quantity >= COALESCE(gear_record.quantity, 1) THEN NULL
                ELSE current_request_id
            END,
            due_date = CASE 
                WHEN new_available_quantity >= COALESCE(gear_record.quantity, 1) THEN NULL
                ELSE due_date
            END,
            updated_at = NOW()
        WHERE id = booking_record.gear_id;
        
        updated_gear_count := updated_gear_count + 1;
        
        -- Log the completion in request_status_history
        INSERT INTO request_status_history (
            request_id,
            status,
            changed_at,
            note
        ) VALUES (
            booking_record.id::text,
            'Completed',
            NOW(),
            'Calendar booking completed automatically at end_date. Gear: ' || booking_record.gear_name || 
            '. Available quantity updated to: ' || new_available_quantity || ' of ' || COALESCE(gear_record.quantity, 1)
        );
        
        -- Add to details for return
        details := details || jsonb_build_object(
            'booking_id', booking_record.id,
            'gear_id', booking_record.gear_id,
            'gear_name', booking_record.gear_name,
            'user_id', booking_record.user_id,
            'end_date', booking_record.end_date,
            'new_available_quantity', new_available_quantity,
            'total_quantity', gear_record.quantity
        );
    END LOOP;
    
    -- Return results
    completed_bookings := completed_count;
    updated_gears := updated_gear_count;
    booking_details := details;
    
    RETURN NEXT;
END;
$$;

-- Function to handle individual calendar booking completion
CREATE OR REPLACE FUNCTION complete_calendar_booking(
    p_booking_id UUID
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    gear_status TEXT,
    available_quantity INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    booking_record RECORD;
    gear_record RECORD;
    new_available_quantity INTEGER;
BEGIN
    -- Get booking details
    SELECT 
        gcb.id,
        gcb.gear_id,
        gcb.user_id,
        gcb.status,
        gcb.end_date,
        g.name as gear_name,
        g.quantity,
        g.available_quantity,
        g.status as gear_status
    INTO booking_record
    FROM gear_calendar_bookings gcb
    JOIN gears g ON gcb.gear_id = g.id
    WHERE gcb.id = p_booking_id;
    
    -- Check if booking exists
    IF NOT FOUND THEN
        success := false;
        message := 'Booking not found';
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Check if booking is approved
    IF booking_record.status != 'Approved' THEN
        success := false;
        message := 'Only approved bookings can be completed';
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Update the booking status to 'Completed'
    UPDATE gear_calendar_bookings
    SET 
        status = 'Completed',
        updated_at = NOW()
    WHERE id = p_booking_id;
    
    -- Calculate new available quantity
    new_available_quantity := LEAST(
        COALESCE(booking_record.quantity, 1),
        COALESCE(booking_record.available_quantity, 0) + 1
    );
    
    -- Update gear status
    UPDATE gears
    SET 
        status = CASE 
            WHEN new_available_quantity >= COALESCE(booking_record.quantity, 1) THEN 'Available'
            WHEN new_available_quantity > 0 THEN 'Partially Checked Out'
            ELSE booking_record.gear_status
        END,
        available_quantity = new_available_quantity,
        checked_out_to = CASE 
            WHEN new_available_quantity >= COALESCE(booking_record.quantity, 1) THEN NULL
            ELSE checked_out_to
        END,
        current_request_id = CASE 
            WHEN new_available_quantity >= COALESCE(booking_record.quantity, 1) THEN NULL
            ELSE current_request_id
        END,
        due_date = CASE 
            WHEN new_available_quantity >= COALESCE(booking_record.quantity, 1) THEN NULL
            ELSE due_date
        END,
        updated_at = NOW()
    WHERE id = booking_record.gear_id;
    
    -- Log the completion
    INSERT INTO request_status_history (
        request_id,
        status,
        changed_at,
        note
    ) VALUES (
        p_booking_id::text,
        'Completed',
        NOW(),
        'Calendar booking completed manually. Gear: ' || booking_record.gear_name || 
        '. Available quantity updated to: ' || new_available_quantity || ' of ' || COALESCE(booking_record.quantity, 1)
    );
    
    -- Return success
    success := true;
    message := 'Booking completed successfully';
    gear_status := CASE 
        WHEN new_available_quantity >= COALESCE(booking_record.quantity, 1) THEN 'Available'
        WHEN new_available_quantity > 0 THEN 'Partially Checked Out'
        ELSE booking_record.gear_status
    END;
    available_quantity := new_available_quantity;
    
    RETURN NEXT;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION complete_expired_calendar_bookings() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION complete_calendar_booking(UUID) TO postgres, service_role, authenticated;

-- Fix existing expired bookings
DO $$
DECLARE
    result RECORD;
BEGIN
    SELECT * INTO result FROM complete_expired_calendar_bookings();
    
    RAISE NOTICE 'Fixed % expired calendar bookings and updated % gears', 
        result.completed_bookings, result.updated_gears;
    
    IF result.completed_bookings > 0 THEN
        RAISE NOTICE 'Details: %', result.booking_details;
    END IF;
END;
$$;