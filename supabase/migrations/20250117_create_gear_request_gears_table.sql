-- Create gear_request_gears junction table
-- This table creates a many-to-many relationship between gear_requests and gears

CREATE TABLE IF NOT EXISTS public.gear_request_gears (
    id BIGSERIAL PRIMARY KEY,
    gear_request_id UUID NOT NULL REFERENCES public.gear_requests(id) ON DELETE CASCADE,
    gear_id UUID NOT NULL REFERENCES public.gears(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique combination of request and gear
    UNIQUE(gear_request_id, gear_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_gear_request_gears_request_id ON public.gear_request_gears(gear_request_id);
CREATE INDEX IF NOT EXISTS idx_gear_request_gears_gear_id ON public.gear_request_gears(gear_id);
CREATE INDEX IF NOT EXISTS idx_gear_request_gears_created_at ON public.gear_request_gears(created_at);

-- Enable Row Level Security
ALTER TABLE public.gear_request_gears ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view gear lines for their own requests
CREATE POLICY "gear_request_gears_select_own" ON public.gear_request_gears
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.gear_requests 
            WHERE id = gear_request_id AND user_id = auth.uid()
        )
    );

-- Users can create gear lines for their own requests
CREATE POLICY "gear_request_gears_insert_own" ON public.gear_request_gears
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.gear_requests 
            WHERE id = gear_request_id AND user_id = auth.uid() AND status = 'Pending'
        )
    );

-- Users can update gear lines for their own pending requests
CREATE POLICY "gear_request_gears_update_own" ON public.gear_request_gears
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.gear_requests 
            WHERE id = gear_request_id AND user_id = auth.uid() AND status = 'Pending'
        )
    );

-- Users can delete gear lines for their own pending requests
CREATE POLICY "gear_request_gears_delete_own" ON public.gear_request_gears
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.gear_requests 
            WHERE id = gear_request_id AND user_id = auth.uid() AND status = 'Pending'
        )
    );

-- Admins can view all gear request lines
CREATE POLICY "gear_request_gears_admin_select_all" ON public.gear_request_gears
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Admins can manage all gear request lines
CREATE POLICY "gear_request_gears_admin_all" ON public.gear_request_gears
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Service role can manage all gear request lines
CREATE POLICY "gear_request_gears_service_role_all" ON public.gear_request_gears
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_gear_request_gears_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_gear_request_gears_updated_at
    BEFORE UPDATE ON public.gear_request_gears
    FOR EACH ROW
    EXECUTE FUNCTION public.update_gear_request_gears_updated_at();

-- Add comment
COMMENT ON TABLE public.gear_request_gears IS 'Junction table linking gear requests to specific gear items with quantities';
COMMENT ON COLUMN public.gear_request_gears.quantity IS 'Number of units requested for this gear item';

