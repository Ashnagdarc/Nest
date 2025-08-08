-- Migration to add triggers for automatic request status history logging
-- This ensures all status changes are automatically tracked

-- Function to log status changes
CREATE OR REPLACE FUNCTION log_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status has changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO request_status_history (
            request_id,
            status,
            changed_by,
            note,
            changed_at
        ) VALUES (
            NEW.id,
            NEW.status,
            NEW.approved_by, -- Use approved_by as the person making the change
            CASE 
                WHEN NEW.status = 'Approved' THEN 'Request approved by admin'
                WHEN NEW.status = 'Rejected' THEN COALESCE(NEW.admin_notes, 'Request rejected by admin')
                WHEN NEW.status = 'Checked Out' THEN 'Gear checked out to user'
                WHEN NEW.status = 'Returned' THEN 'Gear returned by user'
                WHEN NEW.status = 'Overdue' THEN 'Request marked as overdue'
                ELSE 'Status updated'
            END,
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically log status changes
DROP TRIGGER IF EXISTS trigger_log_request_status_change ON gear_requests;
CREATE TRIGGER trigger_log_request_status_change
    AFTER UPDATE ON gear_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_request_status_change();

-- Function to log initial status when request is created
CREATE OR REPLACE FUNCTION log_initial_request_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO request_status_history (
        request_id,
        status,
        changed_by,
        note,
        changed_at
    ) VALUES (
        NEW.id,
        NEW.status,
        NEW.user_id, -- User who created the request
        'Request created by user',
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log initial status
DROP TRIGGER IF EXISTS trigger_log_initial_request_status ON gear_requests;
CREATE TRIGGER trigger_log_initial_request_status
    AFTER INSERT ON gear_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_initial_request_status();

-- Add RLS policies for request_status_history table
ALTER TABLE request_status_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view history for their own requests
CREATE POLICY "Users can view their own request history" ON request_status_history
    FOR SELECT USING (
        request_id IN (
            SELECT id FROM gear_requests WHERE user_id = auth.uid()
        )
    );

-- Policy: Admins can view all request history
CREATE POLICY "Admins can view all request history" ON request_status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Policy: System can insert history entries (for triggers)
CREATE POLICY "System can insert history entries" ON request_status_history
    FOR INSERT WITH CHECK (true);

-- Policy: Only admins can update history entries
CREATE POLICY "Only admins can update history entries" ON request_status_history
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Policy: Only admins can delete history entries
CREATE POLICY "Only admins can delete history entries" ON request_status_history
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );
