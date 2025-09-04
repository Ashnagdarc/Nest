-- Migration to enhance gear status updates
-- This migration adds comprehensive functions to handle gear status updates and prevent double-booking

-- Create a comprehensive function to handle gear status updates
CREATE OR REPLACE FUNCTION update_gear_status_comprehensive(
    p_gear_id UUID,
    p_status TEXT,
    p_checked_out_to UUID,
    p_current_request_id UUID,
    p_last_checkout_date TIMESTAMPTZ,
    p_due_date TIMESTAMPTZ,
    p_available_quantity INTEGER,
    p_source TEXT DEFAULT 'manual'
) RETURNS VOID AS $$
DECLARE
    v_old_status TEXT;
    v_old_checked_out_to UUID;
    v_old_available_quantity INTEGER;
    v_quantity INTEGER;
    v_log_message TEXT;
BEGIN
    -- Get current gear state for logging
    SELECT 
        status, 
        checked_out_to, 
        available_quantity,
        quantity
    INTO 
        v_old_status, 
        v_old_checked_out_to, 
        v_old_available_quantity,
        v_quantity
    FROM gears
    WHERE id = p_gear_id;
    
    -- Validate input parameters
    IF p_available_quantity < 0 THEN
        p_available_quantity := 0;
    END IF;
    
    IF p_available_quantity > v_quantity THEN
        p_available_quantity := v_quantity;
    END IF;
    
    -- Determine correct status based on available_quantity if not explicitly provided
    IF p_status IS NULL THEN
        IF p_available_quantity = 0 THEN
            p_status := 'Checked Out';
        ELSIF p_available_quantity < v_quantity THEN
            p_status := 'Partially Checked Out';
        ELSE
            p_status := 'Available';
        END IF;
    END IF;
    
    -- Update the gear record
    UPDATE gears
    SET 
        status = p_status,
        checked_out_to = p_checked_out_to,
        current_request_id = p_current_request_id,
        last_checkout_date = p_last_checkout_date,
        due_date = p_due_date,
        available_quantity = p_available_quantity,
        updated_at = NOW()
    WHERE id = p_gear_id;
    
    -- Create a log message for the history
    v_log_message := format(
        'Status changed from %s to %s. Available quantity changed from %s to %s. Source: %s',
        v_old_status,
        p_status,
        v_old_available_quantity,
        p_available_quantity,
        p_source
    );
    
    -- Add to gear_states for historical tracking
    INSERT INTO gear_states (
        gear_id,
        status,
        available_quantity,
        checked_out_to,
        due_date,
        current_request_id,
        created_at,
        updated_at
    ) VALUES (
        p_gear_id,
        p_status,
        p_available_quantity,
        p_checked_out_to,
        p_due_date,
        p_current_request_id,
        NOW(),
        NOW()
    );
    
    -- Log the status change in gear_maintenance
    INSERT INTO gear_maintenance(
        gear_id,
        status,
        maintenance_type,
        description,
        performed_by,
        performed_at
    ) VALUES (
        p_gear_id,
        'Completed',
        'Status Change',
        v_log_message,
        COALESCE(p_checked_out_to, v_old_checked_out_to),
        NOW()
    );
    
    -- If this is related to a request, log in request_status_history
    IF p_current_request_id IS NOT NULL THEN
        INSERT INTO request_status_history(
            request_id,
            status,
            changed_at,
            note
        ) VALUES (
            p_current_request_id,
            p_status,
            NOW(),
            v_log_message
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a function to check gear availability before booking
CREATE OR REPLACE FUNCTION check_gear_availability(
    p_gear_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
) RETURNS TABLE (
    is_available BOOLEAN,
    available_quantity INTEGER,
    total_quantity INTEGER,
    current_status TEXT,
    conflicting_bookings INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH gear_info AS (
        SELECT 
            g.quantity,
            g.available_quantity,
            g.status
        FROM gears g
        WHERE g.id = p_gear_id
    ),
    booking_conflicts AS (
        SELECT 
            COUNT(*) as conflict_count
        FROM gear_calendar_bookings gcb
        WHERE 
            gcb.gear_id = p_gear_id AND
            gcb.status = 'Approved' AND
            gcb.start_date <= p_end_date AND
            gcb.end_date >= p_start_date
    )
    SELECT
        CASE 
            WHEN g.status = 'Under Repair' THEN false
            WHEN g.available_quantity <= 0 THEN false
            WHEN bc.conflict_count >= g.available_quantity THEN false
            ELSE true
        END as is_available,
        g.available_quantity,
        g.quantity,
        g.status,
        bc.conflict_count
    FROM gear_info g
    CROSS JOIN booking_conflicts bc;
END;
$$ LANGUAGE plpgsql;

-- Update the existing update_gear_checkout_status function to use the new comprehensive function
CREATE OR REPLACE FUNCTION update_gear_checkout_status(
    p_gear_id UUID,
    p_status TEXT,
    p_checked_out_to UUID,
    p_current_request_id UUID,
    p_last_checkout_date TIMESTAMPTZ,
    p_due_date TIMESTAMPTZ,
    p_available_quantity INTEGER
) RETURNS VOID AS $$
BEGIN
    -- Call the comprehensive function with 'calendar_booking' as source
    PERFORM update_gear_status_comprehensive(
        p_gear_id,
        p_status,
        p_checked_out_to,
        p_current_request_id,
        p_last_checkout_date,
        p_due_date,
        p_available_quantity,
        'calendar_booking'
    );
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to prevent double-booking
CREATE OR REPLACE FUNCTION prevent_double_booking() RETURNS TRIGGER AS $$
DECLARE
    v_availability RECORD;
BEGIN
    -- Only check for Pending -> Approved transitions
    IF (TG_OP = 'UPDATE' AND NEW.status = 'Approved' AND OLD.status = 'Pending') THEN
        -- Check availability using our function
        SELECT * INTO v_availability 
        FROM check_gear_availability(NEW.gear_id, NEW.start_date, NEW.end_date);
        
        -- If not available, prevent the update
        IF NOT v_availability.is_available THEN
            RAISE EXCEPTION 'Cannot approve booking: Gear % is not available for the requested period. Current status: %, Available: % of % units, Conflicting bookings: %', 
                NEW.gear_id, 
                v_availability.current_status,
                v_availability.available_quantity,
                v_availability.total_quantity,
                v_availability.conflicting_bookings;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on gear_calendar_bookings
DROP TRIGGER IF EXISTS prevent_double_booking_trigger ON gear_calendar_bookings;
CREATE TRIGGER prevent_double_booking_trigger
BEFORE UPDATE ON gear_calendar_bookings
FOR EACH ROW
EXECUTE FUNCTION prevent_double_booking();
