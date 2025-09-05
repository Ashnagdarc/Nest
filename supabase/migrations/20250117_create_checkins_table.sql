-- Create checkins table for equipment check-in/check-out history
-- This table tracks all equipment check-in and check-out activities

CREATE TABLE IF NOT EXISTS public.checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    gear_id UUID NOT NULL REFERENCES public.gears(id) ON DELETE CASCADE,
    request_id UUID REFERENCES public.gear_requests(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('Check Out', 'Check In', 'Return', 'Maintenance', 'Repair')),
    checkin_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Completed')),
    notes TEXT,
    condition TEXT CHECK (condition IN ('Excellent', 'Good', 'Fair', 'Poor', 'Damaged')),
    damage_notes TEXT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON public.checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_gear_id ON public.checkins(gear_id);
CREATE INDEX IF NOT EXISTS idx_checkins_request_id ON public.checkins(request_id);
CREATE INDEX IF NOT EXISTS idx_checkins_action ON public.checkins(action);
CREATE INDEX IF NOT EXISTS idx_checkins_status ON public.checkins(status);
CREATE INDEX IF NOT EXISTS idx_checkins_checkin_date ON public.checkins(checkin_date);
CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON public.checkins(created_at);

-- Enable Row Level Security
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own check-ins
CREATE POLICY "checkins_select_own" ON public.checkins
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can create check-ins for themselves
CREATE POLICY "checkins_insert_own" ON public.checkins
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own pending check-ins
CREATE POLICY "checkins_update_own_pending" ON public.checkins
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() AND status = 'Pending')
    WITH CHECK (user_id = auth.uid() AND status = 'Pending');

-- Admins can view all check-ins
CREATE POLICY "checkins_admin_select_all" ON public.checkins
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Admins can update any check-in
CREATE POLICY "checkins_admin_update_all" ON public.checkins
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Admins can delete check-ins
CREATE POLICY "checkins_admin_delete_all" ON public.checkins
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Service role can manage all check-ins
CREATE POLICY "checkins_service_role_all" ON public.checkins
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_checkins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_checkins_updated_at
    BEFORE UPDATE ON public.checkins
    FOR EACH ROW
    EXECUTE FUNCTION public.update_checkins_updated_at();

-- Create function to get user's check-in history
CREATE OR REPLACE FUNCTION public.get_user_checkin_history(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    gear_id UUID,
    gear_name TEXT,
    action TEXT,
    checkin_date TIMESTAMPTZ,
    status TEXT,
    notes TEXT,
    condition TEXT,
    quantity INTEGER,
    approved_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        c.id,
        c.gear_id,
        g.name as gear_name,
        c.action,
        c.checkin_date,
        c.status,
        c.notes,
        c.condition,
        c.quantity,
        c.approved_at
    FROM public.checkins c
    JOIN public.gears g ON c.gear_id = g.id
    WHERE c.user_id = p_user_id
    ORDER BY c.checkin_date DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- Create function to get gear check-in history
CREATE OR REPLACE FUNCTION public.get_gear_checkin_history(
    p_gear_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    user_name TEXT,
    action TEXT,
    checkin_date TIMESTAMPTZ,
    status TEXT,
    notes TEXT,
    condition TEXT,
    quantity INTEGER,
    approved_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        c.id,
        c.user_id,
        p.full_name as user_name,
        c.action,
        c.checkin_date,
        c.status,
        c.notes,
        c.condition,
        c.quantity,
        c.approved_at
    FROM public.checkins c
    JOIN public.profiles p ON c.user_id = p.id
    WHERE c.gear_id = p_gear_id
    ORDER BY c.checkin_date DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- Add comments
COMMENT ON TABLE public.checkins IS 'Equipment check-in/check-out history and tracking';
COMMENT ON COLUMN public.checkins.action IS 'Type of action: Check Out, Check In, Return, Maintenance, Repair';
COMMENT ON COLUMN public.checkins.status IS 'Status of the check-in: Pending, Approved, Rejected, Completed';
COMMENT ON COLUMN public.checkins.condition IS 'Condition of equipment: Excellent, Good, Fair, Poor, Damaged';
COMMENT ON COLUMN public.checkins.damage_notes IS 'Notes about any damage found during check-in';
COMMENT ON COLUMN public.checkins.quantity IS 'Number of units involved in this check-in/check-out';

