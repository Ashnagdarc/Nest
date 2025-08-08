-- Migration to add quantity and available_quantity fields to gears table
-- This fixes the dashboard count discrepancy between admin and user views

-- Add quantity and available_quantity columns if they don't exist
DO $$
BEGIN
    -- Add quantity column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gears' 
        AND column_name = 'quantity'
    ) THEN
        ALTER TABLE public.gears ADD COLUMN quantity INTEGER DEFAULT 1;
    END IF;
    
    -- Add available_quantity column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gears' 
        AND column_name = 'available_quantity'
    ) THEN
        ALTER TABLE public.gears ADD COLUMN available_quantity INTEGER DEFAULT 1;
    END IF;
END $$;

-- Initialize available_quantity based on current status
UPDATE gears 
SET available_quantity = CASE 
    WHEN status = 'Available' THEN COALESCE(quantity, 1)
    ELSE 0
END
WHERE available_quantity IS NULL OR available_quantity != CASE 
    WHEN status = 'Available' THEN COALESCE(quantity, 1)
    ELSE 0
END;

-- Function to automatically update available_quantity when gear status changes
CREATE OR REPLACE FUNCTION update_gear_available_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate available quantity based on status
  CASE NEW.status
    WHEN 'Available' THEN
      -- Check if there's a pending check-in for this gear
      IF EXISTS (
        SELECT 1 FROM checkins 
        WHERE gear_id = NEW.id 
        AND status = 'Pending Admin Approval'
      ) THEN
        NEW.available_quantity = 0;
      ELSE
        NEW.available_quantity = COALESCE(NEW.quantity, 1);
      END IF;
    
    WHEN 'Checked Out', 'Under Repair', 'Needs Repair', 'Retired', 'Lost', 'Pending Check-in' THEN
      NEW.available_quantity = 0;
    
    ELSE
      -- For any other status, check if there's a pending check-in
      IF EXISTS (
        SELECT 1 FROM checkins 
        WHERE gear_id = NEW.id 
        AND status = 'Pending Admin Approval'
      ) THEN
        NEW.available_quantity = 0;
      ELSE
        NEW.available_quantity = COALESCE(NEW.quantity, 1);
      END IF;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_gear_available_quantity ON gears;

-- Create trigger to automatically update available_quantity
CREATE TRIGGER trigger_update_gear_available_quantity
  BEFORE UPDATE ON gears
  FOR EACH ROW
  EXECUTE FUNCTION update_gear_available_quantity();

-- Function to update available_quantity when check-in status changes
CREATE OR REPLACE FUNCTION update_gear_on_checkin_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When a check-in is created with 'Pending Admin Approval' status
  IF NEW.status = 'Pending Admin Approval' AND (OLD.status IS NULL OR OLD.status != 'Pending Admin Approval') THEN
    -- Set gear available_quantity to 0
    UPDATE gears 
    SET available_quantity = 0,
        updated_at = NOW()
    WHERE id = NEW.gear_id;
  END IF;
  
  -- When a check-in is approved (status = 'Completed')
  IF NEW.status = 'Completed' AND OLD.status = 'Pending Admin Approval' THEN
    -- Update gear status and available_quantity
    UPDATE gears 
    SET status = CASE 
                  WHEN NEW.condition = 'Damaged' THEN 'Needs Repair' 
                  ELSE 'Available' 
                END,
        available_quantity = CASE 
                              WHEN NEW.condition = 'Damaged' THEN 0
                              ELSE COALESCE(quantity, 1)
                            END,
        checked_out_to = NULL,
        current_request_id = NULL,
        condition = NEW.condition,
        updated_at = NOW()
    WHERE id = NEW.gear_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_gear_on_checkin_status_change ON checkins;

-- Create trigger to automatically update gear when check-in status changes
CREATE TRIGGER trigger_update_gear_on_checkin_status_change
  AFTER INSERT OR UPDATE ON checkins
  FOR EACH ROW
  EXECUTE FUNCTION update_gear_on_checkin_status_change();

-- Function to update available_quantity when request is approved
CREATE OR REPLACE FUNCTION update_gear_available_quantity_on_request_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- When a request is approved, update available_quantity for all gears in the request
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    IF NEW.gear_ids IS NOT NULL AND array_length(NEW.gear_ids, 1) > 0 THEN
      UPDATE gears 
      SET available_quantity = 0,
          updated_at = NOW()
      WHERE id = ANY(NEW.gear_ids);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_gear_available_quantity_on_request_approval ON gear_requests;

-- Create trigger to automatically update available_quantity when request is approved
CREATE TRIGGER trigger_update_gear_available_quantity_on_request_approval
  AFTER UPDATE ON gear_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_gear_available_quantity_on_request_approval();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_gear_available_quantity() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION update_gear_on_checkin_status_change() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION update_gear_available_quantity_on_request_approval() TO postgres, service_role;
