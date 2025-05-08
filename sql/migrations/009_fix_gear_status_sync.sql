-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_gear_request_status ON gear_requests;

-- Create a function to handle gear status updates when requests are approved
CREATE OR REPLACE FUNCTION sync_gear_request_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When a request is approved, update gear status
  IF NEW.status = 'Approved' AND (OLD.status IS NULL OR OLD.status != 'Approved') THEN
    -- Update gear status to Checked Out
    UPDATE gears
    SET 
      status = 'Checked Out',
      checked_out_to = NEW.user_id,
      current_request_id = NEW.id,
      last_checkout_date = NOW(),
      updated_at = NOW()
    WHERE id = ANY(NEW.gear_ids);
    
    -- Create checkout records
    INSERT INTO gear_checkouts (
      gear_id,
      user_id,
      request_id,
      checkout_date,
      expected_return_date,
      status
    )
    SELECT 
      unnest(NEW.gear_ids),
      NEW.user_id,
      NEW.id,
      NOW(),
      NOW() + INTERVAL '7 days',  -- Default expected return date
      'Checked Out'
    WHERE NOT EXISTS (
      SELECT 1 FROM gear_checkouts
      WHERE gear_id = ANY(NEW.gear_ids)
      AND status = 'Checked Out'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER sync_gear_request_status
  AFTER UPDATE ON gear_requests
  FOR EACH ROW
  EXECUTE FUNCTION sync_gear_request_status();

-- Fix any existing inconsistencies
WITH approved_requests AS (
  SELECT 
    id as request_id,
    user_id,
    gear_ids
  FROM gear_requests
  WHERE status = 'Approved'
  AND gear_ids IS NOT NULL
  AND array_length(gear_ids, 1) > 0
)
UPDATE gears g
SET 
  status = 'Checked Out',
  checked_out_to = ar.user_id,
  current_request_id = ar.request_id,
  last_checkout_date = NOW(),
  updated_at = NOW()
FROM approved_requests ar
WHERE g.id = ANY(ar.gear_ids)
AND (g.status != 'Checked Out' OR g.checked_out_to IS NULL); 