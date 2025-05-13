-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS gear_request_status_trigger ON gear_requests;
DROP TRIGGER IF EXISTS sync_gear_request_status ON gear_requests;

-- Recreate the gear_requests table with proper schema
CREATE TABLE IF NOT EXISTS public.gear_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    gear_ids UUID[] NOT NULL,
    reason TEXT,
    destination TEXT,
    expected_duration TEXT,
    team_members TEXT,
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    checkout_date TIMESTAMPTZ,
    admin_notes TEXT,
    updated_by UUID REFERENCES auth.users(id)
);

-- Add comment for due_date column
COMMENT ON COLUMN public.gear_requests.due_date IS 'The date when the gear is expected to be returned';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gear_requests_user_id ON gear_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gear_requests_status ON gear_requests(status);
CREATE INDEX IF NOT EXISTS idx_gear_requests_created_at ON gear_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_gear_requests_due_date ON gear_requests(due_date);

-- Enable Row Level Security
ALTER TABLE public.gear_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own requests"
    ON gear_requests
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can create requests"
    ON gear_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their pending requests"
    ON gear_requests
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() AND status = 'Pending');

CREATE POLICY "Admins have full access"
    ON gear_requests
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'Admin'
        )
    );

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_gear_requests_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp updates
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON gear_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_gear_requests_timestamp();

-- Recreate the sync trigger function
CREATE OR REPLACE FUNCTION sync_gear_request_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When a request is approved, update gear status
    IF NEW.status = 'Approved' AND (OLD.status IS NULL OR OLD.status != 'Approved') THEN
        -- Set approved_at timestamp
        NEW.approved_at = NOW();
        
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
            COALESCE(NEW.due_date, NOW() + INTERVAL '7 days'),
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

-- Recreate the trigger
CREATE TRIGGER gear_request_status_trigger
    AFTER UPDATE ON gear_requests
    FOR EACH ROW
    EXECUTE FUNCTION sync_gear_request_status();

-- Migrate any existing data
DO $$
BEGIN
    -- Convert any text gear_ids to UUID array if needed
    UPDATE gear_requests
    SET gear_ids = ARRAY(
        SELECT CAST(jsonb_array_elements_text(gear_ids::jsonb) AS UUID)
    )
    WHERE gear_ids IS NOT NULL AND gear_ids != '{}';
END $$; 