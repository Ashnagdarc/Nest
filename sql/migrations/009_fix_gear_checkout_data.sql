-- Fix the data inconsistency between gear_requests and gears tables
-- This script will ensure that all approved gear requests have their gears properly checked out

-- Find all approved gear requests
WITH approved_requests AS (
  SELECT 
    id as request_id,
    user_id,
    gear_ids,
    status
  FROM 
    public.gear_requests
  WHERE 
    status = 'Approved'
    AND gear_ids IS NOT NULL
    AND array_length(gear_ids, 1) > 0
)
-- For each approved request, update any gears that don't show as checked out
UPDATE public.gears g
SET 
  status = 'Checked Out',
  checked_out_to = ar.user_id,
  current_request_id = ar.request_id,
  updated_at = NOW(),
  last_checkout_date = NOW(),
  due_date = NOW() + INTERVAL '7 days'
FROM 
  approved_requests ar
WHERE 
  g.id = ANY(ar.gear_ids)
  AND (g.status != 'Checked Out' OR g.checked_out_to IS NULL);

-- Log how many records were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Fixed % gear records to show checked out status', updated_count;
END $$;

-- Add any missing gear_checkouts records
INSERT INTO public.gear_checkouts (
  gear_id,
  user_id,
  request_id,
  checkout_date,
  expected_return_date,
  status
)
SELECT 
  g.id as gear_id,
  g.checked_out_to as user_id,
  g.current_request_id as request_id,
  g.last_checkout_date as checkout_date,
  g.due_date as expected_return_date,
  'Checked Out' as status
FROM 
  public.gears g
WHERE 
  g.status = 'Checked Out'
  AND g.checked_out_to IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.gear_checkouts gc
    WHERE gc.gear_id = g.id AND gc.status = 'Checked Out'
  );

-- Log how many checkout records were added
DO $$
DECLARE
  inserted_count INTEGER;
BEGIN
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RAISE NOTICE 'Added % missing gear_checkouts records', inserted_count;
END $$;

-- Add a trigger to automatically keep these tables in sync in the future
CREATE OR REPLACE FUNCTION sync_gear_checkout_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When a gear request is approved, update the gear status
  IF NEW.status = 'Approved' AND (OLD.status IS NULL OR OLD.status != 'Approved') THEN
    -- Update gear status to Checked Out
    UPDATE public.gears
    SET 
      status = 'Checked Out',
      checked_out_to = NEW.user_id,
      current_request_id = NEW.id,
      updated_at = NOW(),
      last_checkout_date = NOW(),
      due_date = COALESCE(NEW.due_date, NOW() + INTERVAL '7 days')
    WHERE id = ANY(NEW.gear_ids);
    
    -- Create checkout records if they don't exist
    INSERT INTO public.gear_checkouts (
      gear_id,
      user_id,
      request_id,
      checkout_date,
      expected_return_date,
      status
    )
    SELECT 
      gear_id,
      NEW.user_id,
      NEW.id,
      NOW(),
      COALESCE(NEW.due_date, NOW() + INTERVAL '7 days'),
      'Checked Out'
    FROM unnest(NEW.gear_ids) AS gear_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.gear_checkouts
      WHERE gear_id = unnest(NEW.gear_ids) AND status = 'Checked Out'
    );
  END IF;
  
  -- When a gear request is updated to Returned, update the gear status
  IF NEW.status = 'Returned' AND OLD.status != 'Returned' THEN
    -- Update gear status to Available
    UPDATE public.gears
    SET 
      status = 'Available',
      checked_out_to = NULL,
      current_request_id = NULL,
      updated_at = NOW()
    WHERE id = ANY(NEW.gear_ids);
    
    -- Update checkout records
    UPDATE public.gear_checkouts
    SET 
      status = 'Returned',
      actual_return_date = NOW()
    WHERE 
      request_id = NEW.id
      AND status = 'Checked Out';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to gear_requests table
DROP TRIGGER IF EXISTS gear_request_status_trigger ON public.gear_requests;
CREATE TRIGGER gear_request_status_trigger
AFTER UPDATE ON public.gear_requests
FOR EACH ROW
EXECUTE FUNCTION sync_gear_checkout_status(); 