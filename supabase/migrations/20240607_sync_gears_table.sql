-- Migration to sync the gears table with the live database schema
CREATE TABLE IF NOT EXISTS public.gears (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    serial_number TEXT,
    purchase_date DATE,
    image_url TEXT,
    initial_condition TEXT,
    status TEXT,
    owner_id UUID,
    created_at TIMESTAMPTZ,
    checked_out_by UUID,
    updated_at TIMESTAMPTZ,
    checked_out_to UUID,
    current_request_id UUID,
    last_checkout_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    condition TEXT
);
-- Add any missing columns if the table already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gears' AND column_name = 'serial_number'
    ) THEN
        ALTER TABLE public.gears ADD COLUMN serial_number TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gears' AND column_name = 'purchase_date'
    ) THEN
        ALTER TABLE public.gears ADD COLUMN purchase_date DATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gears' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE public.gears ADD COLUMN image_url TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gears' AND column_name = 'initial_condition'
    ) THEN
        ALTER TABLE public.gears ADD COLUMN initial_condition TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gears' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.gears ADD COLUMN status TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gears' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE public.gears ADD COLUMN owner_id UUID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gears' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.gears ADD COLUMN created_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gears' AND column_name = 'checked_out_by'
    ) THEN
        ALTER TABLE public.gears ADD COLUMN checked_out_by UUID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gears' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.gears ADD COLUMN updated_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gears' AND column_name = 'checked_out_to'
    ) THEN
        ALTER TABLE public.gears ADD COLUMN checked_out_to UUID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gears' AND column_name = 'current_request_id'
    ) THEN
        ALTER TABLE public.gears ADD COLUMN current_request_id UUID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gears' AND column_name = 'last_checkout_date'
    ) THEN
        ALTER TABLE public.gears ADD COLUMN last_checkout_date TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gears' AND column_name = 'due_date'
    ) THEN
        ALTER TABLE public.gears ADD COLUMN due_date TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gears' AND column_name = 'condition'
    ) THEN
        ALTER TABLE public.gears ADD COLUMN condition TEXT;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.gears ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow insert for admins only" ON public.gears;
DROP POLICY IF EXISTS "Allow select for admins and owners" ON public.gears;
DROP POLICY IF EXISTS "Allow select for all authenticated users" ON public.gears;
DROP POLICY IF EXISTS "Users can view all gear" ON public.gears;
DROP POLICY IF EXISTS "Only admins can create gear" ON public.gears;
DROP POLICY IF EXISTS "Only admins can update gear" ON public.gears;
DROP POLICY IF EXISTS "Users can update gear they've checked out" ON public.gears;
DROP POLICY IF EXISTS "Users can view gear condition" ON public.gears;
DROP POLICY IF EXISTS "admin_delete_gears_policy" ON public.gears;
DROP POLICY IF EXISTS "Admins can do anything" ON public.gears;
DROP POLICY IF EXISTS "Users can view all gears" ON public.gears;
DROP POLICY IF EXISTS "Users can update their checked out gears" ON public.gears;

CREATE POLICY "Allow read access to all authenticated users"
    ON public.gears
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access to admins"
    ON public.gears
    FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'));

CREATE POLICY "Allow update access to admins"
    ON public.gears
    FOR UPDATE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'));

CREATE POLICY "Allow delete access to admins"
    ON public.gears
    FOR DELETE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'));