-- Migration to sync the profiles table with the live database schema
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT,
    email TEXT,
    phone TEXT,
    department TEXT,
    role TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    avatar_url TEXT
);
-- Add any missing columns if the table already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow insert for authenticated users"
    ON public.profiles
    FOR INSERT
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow select for authenticated users"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Allow update for authenticated users"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Allow users to select their own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Allow Admins and Users to Access Their Profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING ((role = 'Admin') OR (auth.uid() = id));

CREATE POLICY "Enable read access for all users"
    ON public.profiles
    FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK ((auth.uid() = id) AND ((role IS NULL) OR (role = 'User')));

CREATE POLICY "Admins can manage profiles"
    ON public.profiles
    FOR ALL
    USING (private.is_admin(auth.uid()));

CREATE POLICY "Users can insert their own profile"
    ON public.profiles
    FOR INSERT
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id); 