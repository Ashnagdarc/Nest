-- Migration to add trigger for automatic gear updates when requests are approved
-- This ensures that when a gear request is approved, the individual gears are properly updated

-- Function to update gears when a request is approved
CREATE OR REPLACE FUNCTION update_gears_on_request_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update gears when status changes to 'approved'
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Update all gears in the approved request
        IF NEW.gear_ids IS NOT NULL AND array_length(NEW.gear_ids, 1) > 0 THEN
            UPDATE gears 
            SET status = 'Checked Out',
                checked_out_to = NEW.user_id,
                current_request_id = NEW.id,
                last_checkout_date = NOW(),
                due_date = NEW.due_date,
                updated_at = NOW()
            WHERE id = ANY(NEW.gear_ids);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_gears_on_request_approval ON gear_requests;

-- Create the trigger
CREATE TRIGGER trigger_update_gears_on_request_approval
    AFTER UPDATE ON gear_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_gears_on_request_approval();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_gears_on_request_approval() TO postgres, service_role;
