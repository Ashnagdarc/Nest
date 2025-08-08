-- Migration to add request_status_history table for audit trail
-- This table tracks all status changes for gear requests with full audit trail

CREATE TABLE IF NOT EXISTS public.request_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES gear_requests(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    changed_by UUID REFERENCES profiles(id),
    note TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_request_status_history_request_id ON request_status_history(request_id);
CREATE INDEX IF NOT EXISTS idx_request_status_history_changed_at ON request_status_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_request_status_history_changed_by ON request_status_history(changed_by);

-- Enable Row Level Security
ALTER TABLE public.request_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own request history"
    ON public.request_status_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM gear_requests 
            WHERE gear_requests.id = request_status_history.request_id 
            AND gear_requests.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all request history"
    ON public.request_status_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'Admin'
        )
    );

CREATE POLICY "Admins can insert request history"
    ON public.request_status_history
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'Admin'
        )
    );

-- Add trigger to automatically add initial status when request is created
CREATE OR REPLACE FUNCTION add_initial_request_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO request_status_history (request_id, status, changed_by, note)
    VALUES (NEW.id, COALESCE(NEW.status, 'Pending'), NEW.user_id, 'Request created');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_initial_request_status
    AFTER INSERT ON gear_requests
    FOR EACH ROW
    EXECUTE FUNCTION add_initial_request_status();

-- Add trigger to automatically add status history when request status changes
CREATE OR REPLACE FUNCTION add_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only add history if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO request_status_history (request_id, status, changed_by, note)
        VALUES (
            NEW.id, 
            NEW.status, 
            COALESCE(NEW.updated_by, auth.uid()), 
            CASE 
                WHEN NEW.status = 'Approved' THEN 'Request approved by admin'
                WHEN NEW.status = 'Rejected' THEN 'Request rejected by admin'
                WHEN NEW.status = 'Checked Out' THEN 'Gear checked out'
                WHEN NEW.status = 'Returned' THEN 'Gear returned'
                WHEN NEW.status = 'Overdue' THEN 'Request marked as overdue'
                ELSE 'Status updated'
            END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_request_status_change
    AFTER UPDATE ON gear_requests
    FOR EACH ROW
    EXECUTE FUNCTION add_request_status_change();
