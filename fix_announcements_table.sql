-- First, let's see the current structure of the announcements table
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_name = 'announcements'
ORDER BY 
    ordinal_position;

-- Add the missing created_by column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'announcements' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE announcements 
        ADD COLUMN created_by UUID REFERENCES profiles(id);
        
        RAISE NOTICE 'Added created_by column to announcements table';
    ELSE
        RAISE NOTICE 'created_by column already exists in announcements table';
    END IF;
END $$;

-- Check the structure after the update
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_name = 'announcements'
ORDER BY 
    ordinal_position;

-- Let's try inserting a test announcement now
INSERT INTO announcements (title, content, created_by, created_at, updated_at)
VALUES (
    'Test Announcement After Fix', 
    'This is a test announcement created after fixing the table structure.', 
    auth.uid(), -- Current user
    NOW(), 
    NOW()
)
RETURNING *;

-- Make sure the create_announcement function exists
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