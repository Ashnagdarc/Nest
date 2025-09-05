-- Migration to create RPC functions for announcements
-- This fixes the error in AnnouncementPopup component

-- Function to get recent announcements with a limit
CREATE OR REPLACE FUNCTION public.get_recent_announcements(max_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    created_at TIMESTAMPTZ,
    created_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.content,
        a.created_at,
        a.created_by
    FROM public.announcements a
    ORDER BY a.created_at DESC
    LIMIT max_count;
END;
$$;

-- Function to get all announcements
CREATE OR REPLACE FUNCTION public.get_all_announcements()
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    created_at TIMESTAMPTZ,
    created_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.content,
        a.created_at,
        a.created_by
    FROM public.announcements a
    ORDER BY a.created_at DESC;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_recent_announcements(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_announcements() TO authenticated;
