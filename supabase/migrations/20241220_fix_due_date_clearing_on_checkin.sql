-- Migration: Fix due_date clearing on gear check-in
-- Issue: Toyota Camry and other gears show due dates even when Available
-- Root Cause: update_gear_on_checkin_approval function doesn't clear due_date

-- Fix the update_gear_on_checkin_approval function to clear due_date when gear is returned
CREATE OR REPLACE FUNCTION public.update_gear_on_checkin_approval()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- When a check-in is approved (status = 'Completed'), update the gear
    IF NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
        UPDATE gears 
        SET status = CASE 
                        WHEN NEW.condition = 'Damaged' THEN 'Needs Repair' 
                        ELSE 'Available' 
                     END,
            checked_out_to = NULL,
            current_request_id = NULL,
            due_date = NULL,  -- FIX: Clear the due_date when gear is returned
            condition = NEW.condition,
            available_quantity = quantity, -- Reset available_quantity to full quantity
            updated_at = NOW()
        WHERE id = NEW.gear_id;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Clean up existing data: Clear due_date for gears that are Available but have a due_date set
UPDATE gears 
SET due_date = NULL, 
    updated_at = NOW()
WHERE status = 'Available' 
  AND checked_out_to IS NULL 
  AND due_date IS NOT NULL;

-- Log the cleanup for audit purposes
DO $$
DECLARE
    affected_count INTEGER;
BEGIN
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RAISE NOTICE 'Cleared due_date for % available gears that had stale due dates', affected_count;
END $$;

-- Add a comment to document the fix
COMMENT ON FUNCTION public.update_gear_on_checkin_approval() IS 
'Trigger function that updates gear status when check-in is approved. Fixed to properly clear due_date when gear becomes available.';

-- Verify the fix by checking if any Available gears still have due_date set
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM gears 
    WHERE status = 'Available' 
      AND checked_out_to IS NULL 
      AND due_date IS NOT NULL;
    
    IF remaining_count > 0 THEN
        RAISE WARNING 'Still have % Available gears with due_date set after cleanup', remaining_count;
    ELSE
        RAISE NOTICE 'Successfully cleaned up all Available gears - no stale due_dates remaining';
    END IF;
END $$;