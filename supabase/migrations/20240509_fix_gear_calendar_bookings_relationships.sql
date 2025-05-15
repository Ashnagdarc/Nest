-- Drop existing foreign key constraints if they exist
ALTER TABLE IF EXISTS public.gear_calendar_bookings
    DROP CONSTRAINT IF EXISTS gear_calendar_bookings_user_id_fkey,
    DROP CONSTRAINT IF EXISTS gear_calendar_bookings_approved_by_fkey;

-- Add foreign key constraints to link with profiles table
ALTER TABLE public.gear_calendar_bookings
    ADD CONSTRAINT gear_calendar_bookings_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

ALTER TABLE public.gear_calendar_bookings
    ADD CONSTRAINT gear_calendar_bookings_approved_by_fkey 
    FOREIGN KEY (approved_by) 
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- Create a view to simplify joining with profiles
CREATE OR REPLACE VIEW public.gear_calendar_bookings_with_profiles AS
SELECT 
    gcb.*,
    up.id AS user_profile_id,
    up.full_name AS user_full_name,
    up.email AS user_email,
    up.role AS user_role,
    ap.id AS approver_profile_id,
    ap.full_name AS approver_full_name,
    ap.email AS approver_email,
    ap.role AS approver_role,
    g.name AS gear_name,
    g.category AS gear_category,
    g.status AS gear_status
FROM 
    public.gear_calendar_bookings gcb
    LEFT JOIN public.profiles up ON up.id = gcb.user_id
    LEFT JOIN public.profiles ap ON ap.id = gcb.approved_by
    LEFT JOIN public.gears g ON g.id = gcb.gear_id;

-- Grant appropriate permissions
GRANT SELECT ON public.gear_calendar_bookings_with_profiles TO authenticated;

-- Add RLS policy for the view
CREATE POLICY "Users can view their own bookings and admins can view all"
    ON public.gear_calendar_bookings_with_profiles
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    ); 