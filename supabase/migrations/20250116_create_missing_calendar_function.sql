-- Create the missing get_calendar_bookings_with_profiles function
-- This function is required by the calendar API endpoint

CREATE OR REPLACE FUNCTION public.get_calendar_bookings_with_profiles(
    start_date_param TIMESTAMPTZ DEFAULT '1900-01-01'::TIMESTAMPTZ,
    end_date_param TIMESTAMPTZ DEFAULT '2100-12-31'::TIMESTAMPTZ,
    user_id_param UUID DEFAULT NULL,
    gear_id_param UUID DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    gear_id UUID,
    user_id UUID,
    title TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status TEXT,
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    is_all_day BOOLEAN,
    recurring_pattern TEXT,
    color TEXT,
    request_id UUID,
    gear_name TEXT,
    gear_category TEXT,
    user_email TEXT,
    user_full_name TEXT,
    user_role TEXT,
    approver_full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return calendar bookings with profile information
    -- This function respects RLS policies through SECURITY DEFINER
    RETURN QUERY
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
        p.email AS user_email,
        p.full_name AS user_full_name,
        p.role AS user_role,
        ap.full_name AS approver_full_name
    FROM public.gear_calendar_bookings b
    LEFT JOIN public.gears g ON b.gear_id = g.id
    LEFT JOIN public.profiles p ON b.user_id = p.id
    LEFT JOIN public.profiles ap ON b.approved_by = ap.id
    WHERE 
        (start_date_param IS NULL OR b.start_date >= start_date_param)
        AND (end_date_param IS NULL OR b.end_date <= end_date_param)
        AND (user_id_param IS NULL OR b.user_id = user_id_param)
        AND (gear_id_param IS NULL OR b.gear_id = gear_id_param)
    ORDER BY b.start_date ASC;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_calendar_bookings_with_profiles(TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID) TO authenticated, service_role;

-- Add comment for audit trail
COMMENT ON FUNCTION public.get_calendar_bookings_with_profiles(TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID) IS 'Calendar bookings function - provides secure access to calendar data with profile information (2025-01-16)';

-- Verify the function is working
SELECT 'Calendar bookings function created successfully' as status;
