-- Create a database function to insert announcements
-- This bypasses potential schema cache issues by using direct SQL

-- Drop function if it exists (allows re-running this script)
DROP FUNCTION IF EXISTS create_announcement(text, text, uuid);

-- Create the function
CREATE OR REPLACE FUNCTION create_announcement(
    p_title TEXT,
    p_content TEXT,
    p_user_id UUID
) RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with owner privileges
SET search_path = public
AS $$
DECLARE
    v_result JSON;
    v_id UUID;
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
    RETURNING id INTO v_id;
    
    -- Query the inserted record to return it
    SELECT 
        json_build_object(
            'id', a.id,
            'title', a.title,
            'content', a.content,
            'created_by', a.created_by,
            'created_at', a.created_at,
            'success', TRUE
        ) INTO v_result
    FROM 
        announcements a
    WHERE 
        a.id = v_id;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', FALSE,
            'error_message', SQLERRM,
            'error_detail', SQLSTATE
        );
END;
$$;

-- Grant access to the function for authenticated users
GRANT EXECUTE ON FUNCTION create_announcement TO authenticated;

-- Test the function
-- SELECT create_announcement('Test Title', 'Test Content', auth.uid()) as result; 