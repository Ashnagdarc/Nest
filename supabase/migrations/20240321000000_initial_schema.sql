-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create custom types for enums
CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE user_status AS ENUM ('Active', 'Inactive', 'Pending');
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error', 'gear', 'profile', 'system');
CREATE TYPE gear_status AS ENUM ('available', 'checked_out', 'maintenance', 'retired');
CREATE TYPE gear_condition AS ENUM ('new', 'good', 'fair', 'poor');

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    department TEXT,
    role user_role DEFAULT 'user' NOT NULL,
    status user_status DEFAULT 'Pending' NOT NULL,
    avatar_url TEXT,
    CONSTRAINT email_validation CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false NOT NULL
);

-- Create gear table
CREATE TABLE IF NOT EXISTS public.gear (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    status gear_status DEFAULT 'available' NOT NULL,
    condition gear_condition DEFAULT 'good' NOT NULL,
    location TEXT,
    last_maintenance TIMESTAMP WITH TIME ZONE,
    checked_out_to UUID REFERENCES public.profiles(id),
    checked_out_at TIMESTAMP WITH TIME ZONE,
    due_back_at TIMESTAMP WITH TIME ZONE,
    image_url TEXT
);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'user',
        'Pending'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create notification function
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type notification_type,
    p_title TEXT,
    p_message TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (p_user_id, p_type, p_title, p_message);
END;
$$;

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND (
            CASE WHEN role IS NOT NULL
                THEN EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE id = auth.uid() AND role = 'admin'
                )
                ELSE TRUE
            END
        )
    );

CREATE POLICY "Admins can update all profiles"
    ON public.profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Notifications Policies
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can create notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Gear Policies
CREATE POLICY "Anyone can view available gear"
    ON public.gear FOR SELECT
    USING (TRUE);

CREATE POLICY "Users can view gear details"
    ON public.gear FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND status = 'Active'
        )
    );

CREATE POLICY "Admins can create gear"
    ON public.gear FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update gear"
    ON public.gear FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can update gear they checked out"
    ON public.gear FOR UPDATE
    USING (checked_out_to = auth.uid())
    WITH CHECK (checked_out_to = auth.uid());

CREATE POLICY "Admins can delete gear"
    ON public.gear FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_gear_status ON public.gear(status);
CREATE INDEX IF NOT EXISTS idx_gear_checked_out_to ON public.gear(checked_out_to);
CREATE INDEX IF NOT EXISTS idx_gear_category ON public.gear(category);

-- Set up storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('gear-images', 'gear-images', true);

-- Storage policies
CREATE POLICY "Avatar images are publicly accessible."
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload an avatar."
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can update their own avatar."
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'avatars');

CREATE POLICY "Gear images are publicly accessible."
    ON storage.objects FOR SELECT
    USING (bucket_id = 'gear-images');

CREATE POLICY "Only admins can upload gear images."
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'gear-images' AND (
            SELECT role FROM public.profiles WHERE id = auth.uid()
        ) = 'admin'
    ); 