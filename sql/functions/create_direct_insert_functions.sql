-- Create a function that matches the exact name being called from the React app
-- The announcement page is using create_announcement(p_title, p_content, p_user_id)

DROP FUNCTION IF EXISTS create_announcement(text, text, uuid);

CREATE OR REPLACE FUNCTION create_announcement(
    p_title TEXT,
    p_content TEXT,
    p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_announcement_id UUID;
    v_result JSONB;
BEGIN
    -- Insert the announcement
    INSERT INTO announcements (
        title,
        content,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        p_title,
        p_content,
        p_user_id,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_announcement_id;
    
    -- Return the newly created announcement
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
        a.id = v_announcement_id;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'error', true,
            'message', SQLERRM,
            'details', SQLSTATE
        );
END;
$$;

-- Grant access to the function for authenticated users
GRANT EXECUTE ON FUNCTION create_announcement(TEXT, TEXT, UUID) TO authenticated;

-- Debug function to see all announcements with full schema - use for troubleshooting
CREATE OR REPLACE FUNCTION debug_announcements()
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    table_schema TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Return the schema information as well as the data
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.content,
        a.created_by,
        a.created_at,
        a.updated_at,
        (SELECT string_agg(column_name || ' (' || data_type || ')', ', ')
         FROM information_schema.columns 
         WHERE table_name = 'announcements') AS table_schema
    FROM 
        announcements a
    ORDER BY 
        a.created_at DESC;
END;
$$;

-- Grant access to the debug function
GRANT EXECUTE ON FUNCTION debug_announcements() TO authenticated; 