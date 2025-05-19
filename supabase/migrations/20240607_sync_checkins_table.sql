-- Migration to sync the checkins table with the live database schema
CREATE TABLE IF NOT EXISTS public.checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    gear_id UUID NOT NULL,
    checkin_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    condition TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    damage_notes TEXT,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    request_id UUID
);
-- Add any missing columns if the table already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'checkins' AND column_name = 'damage_notes'
    ) THEN
        ALTER TABLE public.checkins ADD COLUMN damage_notes TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'checkins' AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE public.checkins ADD COLUMN approved_by UUID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'checkins' AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE public.checkins ADD COLUMN approved_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'checkins' AND column_name = 'request_id'
    ) THEN
        ALTER TABLE public.checkins ADD COLUMN request_id UUID;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Only admins can delete check-ins"
    ON public.checkins
    FOR DELETE
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'));

CREATE POLICY "Admins can view all check-ins"
    ON public.checkins
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'));

CREATE POLICY "Admins can update any check-in"
    ON public.checkins
    FOR UPDATE
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'));

CREATE POLICY "Users can view their own check-ins"
    ON public.checkins
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can create check-ins"
    ON public.checkins
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all check-ins"
    ON public.checkins
    FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'));

CREATE POLICY "Users can check-in their gear"
    ON public.checkins
    FOR INSERT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their pending check-ins"
    ON public.checkins
    FOR UPDATE
    USING (auth.uid() = user_id AND status = 'Pending');

CREATE POLICY "admin_all"
    ON public.checkins
    FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'));

CREATE POLICY "users_select_own"
    ON public.checkins
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid()); 