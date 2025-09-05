-- Create gear_requests table for equipment request management
-- This table stores equipment requests made by users

CREATE TABLE IF NOT EXISTS public.gear_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    destination TEXT,
    expected_duration TEXT,
    team_members TEXT,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    admin_notes TEXT,
    updated_by UUID REFERENCES public.profiles(id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_gear_requests_user_id ON public.gear_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gear_requests_status ON public.gear_requests(status);
CREATE INDEX IF NOT EXISTS idx_gear_requests_created_at ON public.gear_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_gear_requests_due_date ON public.gear_requests(due_date);

-- Enable Row Level Security
ALTER TABLE public.gear_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own requests
CREATE POLICY "gear_requests_select_own" ON public.gear_requests
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can create their own requests
CREATE POLICY "gear_requests_insert_own" ON public.gear_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own pending requests
CREATE POLICY "gear_requests_update_own_pending" ON public.gear_requests
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() AND status = 'Pending')
    WITH CHECK (user_id = auth.uid() AND status IN ('Pending', 'Cancelled'));

-- Users can delete their own pending requests
CREATE POLICY "gear_requests_delete_own_pending" ON public.gear_requests
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid() AND status = 'Pending');

-- Admins can view all requests
CREATE POLICY "gear_requests_admin_select_all" ON public.gear_requests
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Admins can update any request
CREATE POLICY "gear_requests_admin_update_all" ON public.gear_requests
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Service role can manage all requests
CREATE POLICY "gear_requests_service_role_all" ON public.gear_requests
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_gear_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_gear_requests_updated_at
    BEFORE UPDATE ON public.gear_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_gear_requests_updated_at();

-- Add comment
COMMENT ON TABLE public.gear_requests IS 'Equipment requests made by users';
COMMENT ON COLUMN public.gear_requests.status IS 'Request status: Pending, Approved, Rejected, Completed, Cancelled';
COMMENT ON COLUMN public.gear_requests.reason IS 'Reason for equipment request';
COMMENT ON COLUMN public.gear_requests.destination IS 'Where the equipment will be used';
COMMENT ON COLUMN public.gear_requests.expected_duration IS 'Expected duration of equipment use';
COMMENT ON COLUMN public.gear_requests.team_members IS 'Team members involved in the request';

