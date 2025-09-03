-- Emergency fix for gear quantity issues
-- This migration corrects available_quantity values that are incorrectly set to 0
-- when gears should actually be available

-- First, let's identify and log problematic gears
CREATE TEMP TABLE problematic_gears AS
SELECT 
  id,
  name,
  status,
  quantity,
  available_quantity,
  checked_out_to,
  current_request_id
FROM gears 
WHERE 
  (status = 'Available' AND available_quantity = 0 AND checked_out_to IS NULL)
  OR (status = 'Checked Out' AND available_quantity > 0)
  OR (available_quantity > COALESCE(quantity, 1))
  OR (status = 'Available' AND available_quantity != COALESCE(quantity, 1) AND checked_out_to IS NULL);

-- Log problematic gears for review (if request_status_history table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'request_status_history') THEN
    INSERT INTO request_status_history (request_id, status, changed_at, note)
    SELECT 
      gen_random_uuid()::text,
      'SYSTEM_LOG',
      NOW(),
      'Problematic gear detected: ' || name || ' - ' || 
      CASE 
        WHEN status = 'Available' AND available_quantity = 0 AND checked_out_to IS NULL 
        THEN 'Available gear has 0 available_quantity'
        WHEN status = 'Checked Out' AND available_quantity > 0 
        THEN 'Checked out gear has available_quantity > 0'
        WHEN available_quantity > COALESCE(quantity, 1) 
        THEN 'available_quantity exceeds total quantity'
        ELSE 'Unknown issue'
      END
    FROM problematic_gears;
  END IF;
END $$;

-- Fix available_quantity for Available gears that should have correct values
UPDATE gears 
SET 
  available_quantity = CASE 
    WHEN status = 'Available' AND checked_out_to IS NULL THEN COALESCE(quantity, 1)
    WHEN status = 'Checked Out' THEN 0
    WHEN status IN ('Under Repair', 'Needs Repair', 'Retired', 'Lost') THEN 0
    ELSE available_quantity
  END,
  updated_at = NOW()
WHERE 
  (status = 'Available' AND available_quantity = 0 AND checked_out_to IS NULL)
  OR (status = 'Checked Out' AND available_quantity > 0)
  OR (status IN ('Under Repair', 'Needs Repair', 'Retired', 'Lost') AND available_quantity > 0);

-- Clean up temporary table
DROP TABLE problematic_gears;

-- Create a more robust trigger function for future quantity management
CREATE OR REPLACE FUNCTION update_gear_available_quantity_robust()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate available quantity based on status and relationships
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
        -- Check if gear is currently checked out
        IF NEW.checked_out_to IS NOT NULL AND NEW.current_request_id IS NOT NULL THEN
          NEW.available_quantity = 0;
        ELSE
          NEW.available_quantity = COALESCE(NEW.quantity, 1);
        END IF;
      END IF;
    
    WHEN 'Checked Out' THEN
      NEW.available_quantity = 0;
      
    WHEN 'Under Repair', 'Needs Repair', 'Retired', 'Lost', 'Pending Check-in' THEN
      NEW.available_quantity = 0;
    
    ELSE
      -- For any other status, check if there's a pending check-in or if it's checked out
      IF EXISTS (
        SELECT 1 FROM checkins 
        WHERE gear_id = NEW.id 
        AND status = 'Pending Admin Approval'
      ) OR (NEW.checked_out_to IS NOT NULL AND NEW.current_request_id IS NOT NULL) THEN
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

-- Create new robust trigger
CREATE TRIGGER trigger_update_gear_available_quantity
  BEFORE UPDATE ON gears
  FOR EACH ROW
  EXECUTE FUNCTION update_gear_available_quantity_robust();

-- Function to update available_quantity when request is approved (improved version)
CREATE OR REPLACE FUNCTION update_gear_available_quantity_on_request_approval_robust()
RETURNS TRIGGER AS $$
BEGIN
  -- When a request is approved, update available_quantity for all gears in the request
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    IF NEW.gear_ids IS NOT NULL AND array_length(NEW.gear_ids, 1) > 0 THEN
      -- Update gears to checked out status and set available_quantity to 0
      UPDATE gears 
      SET 
        status = 'Checked Out',
        checked_out_to = NEW.user_id,
        current_request_id = NEW.id,
        available_quantity = 0,
        last_checkout_date = NOW(),
        due_date = NEW.due_date,
        updated_at = NOW()
      WHERE id = ANY(NEW.gear_ids);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_gear_available_quantity_on_request_approval ON gear_requests;

-- Create new robust trigger
CREATE TRIGGER trigger_update_gear_available_quantity_on_request_approval
  AFTER UPDATE ON gear_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_gear_available_quantity_on_request_approval_robust();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_gear_available_quantity_robust() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION update_gear_available_quantity_on_request_approval_robust() TO postgres, service_role;
