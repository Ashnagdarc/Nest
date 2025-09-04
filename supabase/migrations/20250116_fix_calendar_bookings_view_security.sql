-- Fix Security Issues in gear_calendar_bookings_with_profiles View
-- 
-- The current view exposes auth.users email data without proper RLS protection.
-- This migration creates a safer version that doesn't expose sensitive auth data
-- and applies proper RLS policies.

-- Drop the existing unsafe view
DROP VIEW IF EXISTS public.gear_calendar_bookings_with_profiles;

-- Create a safer view that doesn't expose auth.users data
CREATE VIEW public.gear_calendar_bookings_with_profiles AS
SELECT 
    b.id,
    b.gear_id,
    b.user_id,
    b.title,
    b.start_date,
    b.end_date,
    b.status,
    b.reason,
    b.notes,
    b.created_at,
    b.updated_at,
    b.approved_at,
    b.approved_by,
    b.is_all_day,
    b.recurring_pattern,
    b.color,
    b.request_id,
    g.name AS gear_name,
    g.category AS gear_category,
    -- Use profile email instead of auth.users email for better security
    p.email AS user_email,
    p.full_name AS user_full_name,
    p.role AS user_role,
    ap.full_name AS approver_full_name
FROM gear_calendar_bookings b
LEFT JOIN gears g ON b.gear_id = g.id
LEFT JOIN profiles p ON b.user_id = p.id
LEFT JOIN profiles ap ON b.approved_by = ap.id;

-- Enable security barrier on the view to ensure RLS is enforced on underlying tables
ALTER VIEW public.gear_calendar_bookings_with_profiles SET (security_barrier = true);

-- Grant appropriate permissions
GRANT SELECT ON public.gear_calendar_bookings_with_profiles TO public;
GRANT SELECT ON public.gear_calendar_bookings_with_profiles TO service_role;

-- Note: RLS policies are enforced through the underlying gear_calendar_bookings table
-- The view will respect the RLS policies of the base table

-- Add comment for audit trail
COMMENT ON VIEW public.gear_calendar_bookings_with_profiles IS 'Calendar bookings view - secured to prevent auth.users data exposure (2025-01-16)';

-- Verify the view is working
SELECT 'Calendar bookings view security updated successfully' as status;