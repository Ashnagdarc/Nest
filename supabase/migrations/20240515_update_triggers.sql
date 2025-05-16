-- Create or update trigger function for calendar booking status changes
CREATE OR REPLACE FUNCTION update_on_booking_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- If the booking is being approved
    IF NEW.status = 'Approved' AND OLD.status = 'Pending' THEN
        -- Update gear request status to Pending Checkout
        UPDATE gear_requests
        SET status = 'Pending Checkout',
            updated_at = NOW()
        WHERE id = NEW.request_id;
        
        -- Update gear status
        UPDATE gears
        SET status = 'Reserved'
        WHERE id = NEW.gear_id;
        
        -- Create notification
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            read,
            created_at
        ) VALUES (
            NEW.user_id,
            'Booking Approved',
            format('Your booking for %s has been approved. Please check your My Requests page for checkout details.', (
                SELECT name FROM gears WHERE id = NEW.gear_id
            )),
            'approval',
            false,
            NOW()
        );
    
    -- If the booking is being rejected
    ELSIF NEW.status = 'Rejected' AND OLD.status = 'Pending' THEN
        -- Update gear request status to Rejected
        UPDATE gear_requests
        SET status = 'Rejected',
            updated_at = NOW()
        WHERE id = NEW.request_id;
        
        -- Update gear status back to Available
        UPDATE gears
        SET status = 'Available',
            current_request_id = NULL
        WHERE id = NEW.gear_id;
        
        -- Create notification
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            read,
            created_at
        ) VALUES (
            NEW.user_id,
            'Booking Rejected',
            format('Your booking for %s has been rejected. Reason: %s', (
                SELECT name FROM gears WHERE id = NEW.gear_id
            ), COALESCE(NEW.notes, 'No reason provided')),
            'rejection',
            false,
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS booking_status_change_trigger ON gear_calendar_bookings;

-- Create new trigger
CREATE TRIGGER booking_status_change_trigger
    AFTER UPDATE OF status ON gear_calendar_bookings
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_on_booking_approval();

-- Create function to automatically update calendar bookings when gear is checked out
CREATE OR REPLACE FUNCTION update_on_gear_checkout()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Checked Out' AND OLD.status = 'Pending Checkout' THEN
        -- Update calendar booking status
        UPDATE gear_calendar_bookings
        SET status = 'In Use'
        WHERE request_id = NEW.id
        AND status = 'Approved';
        
        -- Create notification
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            read,
            created_at
        ) VALUES (
            NEW.user_id,
            'Gear Checked Out',
            'Your gear has been checked out. Please remember to return it on time.',
            'checkout',
            false,
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for gear checkout
DROP TRIGGER IF EXISTS gear_checkout_trigger ON gear_requests;
CREATE TRIGGER gear_checkout_trigger
    AFTER UPDATE OF status ON gear_requests
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_on_gear_checkout();
