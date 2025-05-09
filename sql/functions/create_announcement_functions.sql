-- Create function to get all announcements
-- This bypasses potential schema cache issues by using direct SQL

-- Drop function if it exists (allows re-running this script)
DROP FUNCTION IF EXISTS get_all_announcements();

-- Create the function to get all announcements
CREATE OR REPLACE FUNCTION get_all_announcements()
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        jsonb_build_object(
            'id', a.id,
            'title', a.title,
            'content', a.content,
            'created_by', a.created_by,
            'created_at', a.created_at,
            'updated_at', a.updated_at
        )
    FROM 
        announcements a
    ORDER BY 
        a.created_at DESC;
END;
$$;

-- Grant access to the function for authenticated users
GRANT EXECUTE ON FUNCTION get_all_announcements() TO authenticated;

-- Function to get a single announcement by ID
CREATE OR REPLACE FUNCTION get_announcement_by_id(announcement_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT
        jsonb_build_object(
            'id', a.id,
            'title', a.title,
            'content', a.content,
            'created_by', a.created_by,
            'created_at', a.created_at,
            'updated_at', a.updated_at
        ) INTO v_result
    FROM
        announcements a
    WHERE
        a.id = announcement_id;
    
    RETURN v_result;
END;
$$;

-- Grant access to the function for authenticated users
GRANT EXECUTE ON FUNCTION get_announcement_by_id(UUID) TO authenticated;

-- Function to get recent announcements
CREATE OR REPLACE FUNCTION get_recent_announcements(max_count INTEGER DEFAULT 5)
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        jsonb_build_object(
            'id', a.id,
            'title', a.title,
            'content', a.content,
            'created_by', a.created_by,
            'created_at', a.created_at,
            'updated_at', a.updated_at
        )
    FROM 
        announcements a
    ORDER BY 
        a.created_at DESC
    LIMIT 
        max_count;
END;
$$;

-- Grant access to the function for authenticated users
GRANT EXECUTE ON FUNCTION get_recent_announcements(INTEGER) TO authenticated; 