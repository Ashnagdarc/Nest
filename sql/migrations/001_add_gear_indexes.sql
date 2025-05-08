-- Add indexes to improve gear status queries and updates

-- Create an index on the status column for faster filtering by status
CREATE INDEX IF NOT EXISTS idx_gears_status ON gears(status);

-- Create an index for checked out gear lookups
CREATE INDEX IF NOT EXISTS idx_gears_checked_out_to ON gears(checked_out_to) WHERE checked_out_to IS NOT NULL;

-- Create an index for request-related lookups
CREATE INDEX IF NOT EXISTS idx_gears_current_request_id ON gears(current_request_id) WHERE current_request_id IS NOT NULL;

-- Create a combined index for due date queries (e.g., finding overdue gear)
CREATE INDEX IF NOT EXISTS idx_gears_status_due_date ON gears(status, due_date) WHERE status = 'Checked Out';

-- Update the trigger function that handles gear status updates
CREATE OR REPLACE FUNCTION update_gear_status_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- When a gear is updated, update the updated_at timestamp
    NEW.updated_at := NOW();
    
    -- Log the status change for auditing
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO gear_maintenance(
            gear_id,
            maintenance_type,
            description,
            performed_by,
            performed_at
        ) VALUES (
            NEW.id,
            'Status Change',
            'Status changed from ' || OLD.status || ' to ' || NEW.status,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'),
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'gear_status_update_trigger'
    ) THEN
        CREATE TRIGGER gear_status_update_trigger
        BEFORE UPDATE ON gears
        FOR EACH ROW
        EXECUTE FUNCTION update_gear_status_trigger();
    END IF;
END
$$; 