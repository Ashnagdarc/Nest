-- Migration to fix calendar booking quantity issues
-- This ensures that when a calendar booking is approved, the gear's available_quantity is properly updated

-- Function to update gear quantity when a calendar booking is approved
CREATE OR REPLACE FUNCTION update_gear_on_calendar_booking_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- When a booking is approved, update the gear's status and available_quantity
  IF NEW.status = 'Approved' AND (OLD.status IS NULL OR OLD.status != 'Approved') THEN
    -- Get the current gear details
    DECLARE
      gear_record RECORD;
    BEGIN
      SELECT quantity, available_quantity INTO gear_record
      FROM gears
      WHERE id = NEW.gear_id;
      
      -- Calculate new available quantity
      DECLARE
        new_available_quantity INTEGER;
      BEGIN
        -- If available_quantity is NULL, use quantity
        IF gear_record.available_quantity IS NULL THEN
          new_available_quantity := COALESCE(gear_record.quantity, 1) - 1;
        ELSE
          new_available_quantity := GREATEST(0, gear_record.available_quantity - 1);
        END IF;
        
        -- Update the gear with new status and available_quantity
        UPDATE gears
        SET 
          status = CASE 
                    WHEN new_available_quantity > 0 THEN 'Partially Checked Out'
                    ELSE 'Checked Out'
                  END,
          available_quantity = new_available_quantity,
          checked_out_to = NEW.user_id,
          current_request_id = NEW.request_id,
          last_checkout_date = NOW(),
          due_date = NEW.end_date,
          updated_at = NOW()
        WHERE id = NEW.gear_id;
        
        -- Log the action
        INSERT INTO request_status_history (request_id, status, changed_at, note)
        VALUES (
          NEW.request_id::text,
          CASE 
            WHEN new_available_quantity > 0 THEN 'Partially Checked Out'
            ELSE 'Checked Out'
          END,
          NOW(),
          'Gear status updated due to calendar booking approval. Available quantity: ' || new_available_quantity || ' of ' || COALESCE(gear_record.quantity, 1)
        );
      END;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_gear_on_calendar_booking_approval ON gear_calendar_bookings;

-- Create trigger to automatically update gear when a calendar booking is approved
CREATE TRIGGER trigger_update_gear_on_calendar_booking_approval
  AFTER UPDATE ON gear_calendar_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_gear_on_calendar_booking_approval();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_gear_on_calendar_booking_approval() TO postgres, service_role;

-- Fix any existing approved bookings that didn't update the gear status correctly
DO $$
DECLARE
  booking RECORD;
BEGIN
  FOR booking IN 
    SELECT gcb.id, gcb.gear_id, gcb.user_id, gcb.request_id, gcb.end_date, g.quantity, g.available_quantity
    FROM gear_calendar_bookings gcb
    JOIN gears g ON gcb.gear_id = g.id
    WHERE gcb.status = 'Approved'
    AND (g.status != 'Checked Out' AND g.status != 'Partially Checked Out')
  LOOP
    -- Calculate new available quantity
    DECLARE
      new_available_quantity INTEGER;
    BEGIN
      -- If available_quantity is NULL, use quantity
      IF booking.available_quantity IS NULL THEN
        new_available_quantity := COALESCE(booking.quantity, 1) - 1;
      ELSE
        new_available_quantity := GREATEST(0, booking.available_quantity - 1);
      END IF;
      
      -- Update the gear with new status and available_quantity
      UPDATE gears
      SET 
        status = CASE 
                  WHEN new_available_quantity > 0 THEN 'Partially Checked Out'
                  ELSE 'Checked Out'
                END,
        available_quantity = new_available_quantity,
        checked_out_to = booking.user_id,
        current_request_id = booking.request_id,
        last_checkout_date = NOW(),
        due_date = booking.end_date,
        updated_at = NOW()
      WHERE id = booking.gear_id;
      
      -- Log the action
      INSERT INTO request_status_history (request_id, status, changed_at, note)
      VALUES (
        booking.request_id::text,
        CASE 
          WHEN new_available_quantity > 0 THEN 'Partially Checked Out'
          ELSE 'Checked Out'
        END,
        NOW(),
        'Gear status fixed for existing approved booking. Available quantity: ' || new_available_quantity || ' of ' || COALESCE(booking.quantity, 1)
      );
    END;
  END LOOP;
END $$;
