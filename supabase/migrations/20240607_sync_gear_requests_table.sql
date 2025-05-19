-- Migration to sync the gear_requests table with the live database schema
CREATE TABLE IF NOT EXISTS public.gear_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    gear_ids UUID[] NOT NULL,
    reason TEXT NOT NULL,
    destination TEXT,
    expected_duration TEXT,
    team_members TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    checkout_date TIMESTAMPTZ,
    admin_notes TEXT,
    updated_by UUID
);
-- Add any missing columns if the table already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_requests' AND column_name = 'destination'
    ) THEN
        ALTER TABLE public.gear_requests ADD COLUMN destination TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_requests' AND column_name = 'expected_duration'
    ) THEN
        ALTER TABLE public.gear_requests ADD COLUMN expected_duration TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_requests' AND column_name = 'team_members'
    ) THEN
        ALTER TABLE public.gear_requests ADD COLUMN team_members TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_requests' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.gear_requests ADD COLUMN status TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_requests' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.gear_requests ADD COLUMN created_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_requests' AND column_name = 'due_date'
    ) THEN
        ALTER TABLE public.gear_requests ADD COLUMN due_date TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_requests' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.gear_requests ADD COLUMN updated_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_requests' AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE public.gear_requests ADD COLUMN approved_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_requests' AND column_name = 'checkout_date'
    ) THEN
        ALTER TABLE public.gear_requests ADD COLUMN checkout_date TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_requests' AND column_name = 'admin_notes'
    ) THEN
        ALTER TABLE public.gear_requests ADD COLUMN admin_notes TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_requests' AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE public.gear_requests ADD COLUMN updated_by UUID;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.gear_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow insert for users"
    ON public.gear_requests
    FOR INSERT
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow select for users"
    ON public.gear_requests
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own requests"
    ON public.gear_requests
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own requests"
    ON public.gear_requests
    FOR INSERT
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending requests"
    ON public.gear_requests
    FOR UPDATE
    USING ((auth.uid() = user_id) AND (status = 'Pending'))
    WITH CHECK ((auth.uid() = user_id) AND (status = ANY (ARRAY['Pending', 'Canceled'])));

CREATE POLICY "Admins can view all requests"
    ON public.gear_requests
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'));

CREATE POLICY "Admins can update any request"
    ON public.gear_requests
    FOR UPDATE
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')); 