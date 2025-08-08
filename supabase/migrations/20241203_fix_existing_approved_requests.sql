-- Migration to fix existing approved requests where gears weren't properly updated
-- This ensures data consistency for any requests that were approved before the trigger was added

-- Function to fix existing approved requests
CREATE OR REPLACE FUNCTION fix_existing_approved_requests()
RETURNS void AS $$
DECLARE
    request_record RECORD;
BEGIN
    -- Find all approved requests where gears might not be properly updated
    FOR request_record IN 
        SELECT id, user_id, gear_ids, due_date
        FROM gear_requests 
        WHERE status = 'approved' 
        AND gear_ids IS NOT NULL 
        AND array_length(gear_ids, 1) > 0
    LOOP
        -- Update gears for this approved request
        UPDATE gears 
        SET status = 'Checked Out',
            checked_out_to = request_record.user_id,
            current_request_id = request_record.id,
            last_checkout_date = COALESCE(last_checkout_date, NOW()),
            due_date = request_record.due_date,
            updated_at = NOW()
        WHERE id = ANY(request_record.gear_ids)
        AND (checked_out_to IS NULL OR checked_out_to != request_record.user_id OR status != 'Checked Out');
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the fix
SELECT fix_existing_approved_requests();

-- Clean up the function
DROP FUNCTION fix_existing_approved_requests();
