-- Migration to sync the requests table with the live database schema
CREATE TABLE IF NOT EXISTS public.requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gear_id UUID,
    user_id UUID,
    status TEXT NOT NULL,
    reason TEXT,
    checkout_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    checkin_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    created_by UUID
);
-- Add any missing columns if the table already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.requests ADD COLUMN created_by UUID;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "select_own_requests"
    ON public.requests
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "insert_own_requests"
    ON public.requests
    FOR INSERT
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own_requests"
    ON public.requests
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "delete_own_requests"
    ON public.requests
    FOR DELETE
    USING (user_id = auth.uid()); 