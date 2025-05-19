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
CREATE POLICY "Allow insert for admins only"
    ON public.gears
    FOR INSERT
    USING ((( SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'Admin'))
    WITH CHECK ((( SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'Admin'));

CREATE POLICY "Allow select for admins and owners"
    ON public.gears
    FOR SELECT
    USING (((( SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'Admin') OR (owner_id = auth.uid())));

CREATE POLICY "Allow select for all authenticated users"
    ON public.gears
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view all gear"
    ON public.gears
    FOR SELECT
    USING (true);

CREATE POLICY "Only admins can create gear"
    ON public.gears
    FOR INSERT
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'));

CREATE POLICY "Only admins can update gear"
    ON public.gears
    FOR UPDATE
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'));

CREATE POLICY "Users can update gear they've checked out"
    ON public.gears
    FOR UPDATE
    USING ((auth.uid() = checked_out_by) AND (status = 'Checked Out'))
    WITH CHECK (status = 'Pending Check In');

CREATE POLICY "Users can view gear condition"
    ON public.gears
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "admin_delete_gears_policy"
    ON public.gears
    FOR DELETE
    USING (( SELECT (auth.uid() IN ( SELECT profiles.id FROM profiles WHERE profiles.role = 'Admin'))));

CREATE POLICY "Admins can do anything"
    ON public.gears
    FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'));

CREATE POLICY "Users can view all gears"
    ON public.gears
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their checked out gears"
    ON public.gears
    FOR UPDATE
    TO authenticated
    USING ((checked_out_to = auth.uid()) OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')))
    WITH CHECK ((checked_out_to = auth.uid()) OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'))); 