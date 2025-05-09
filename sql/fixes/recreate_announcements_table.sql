-- First, backup any existing announcements if they exist
CREATE TABLE IF NOT EXISTS announcements_backup AS 
SELECT * FROM announcements WHERE false;

INSERT INTO announcements_backup 
SELECT * FROM announcements;

-- Drop existing announcements table and recreate it properly
DROP TABLE IF EXISTS announcements CASCADE;

-- Create the announcements table with all required columns
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Re-enable Row Level Security
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Recreate policies
-- All users can view announcements
CREATE POLICY "Anyone can view announcements" 
ON announcements FOR SELECT 
USING (true);

-- Any authenticated user can create announcements (for testing)
CREATE POLICY "Any authenticated user can create announcements" 
ON announcements FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Only admins can update announcements
CREATE POLICY "Only admins can update announcements" 
ON announcements FOR UPDATE 
TO authenticated
USING (private.is_admin(auth.uid()))
WITH CHECK (private.is_admin(auth.uid()));

-- Only admins can delete announcements
CREATE POLICY "Only admins can delete announcements" 
ON announcements FOR DELETE 
TO authenticated
USING (private.is_admin(auth.uid()));

-- Recreate the function
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

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);

-- Try a test insertion
INSERT INTO announcements (title, content, created_by, created_at, updated_at)
VALUES (
    'Test Announcement After Recreate', 
    'This is a test announcement created after recreating the table.', 
    auth.uid(), -- Current user
    NOW(), 
    NOW()
)
RETURNING *; 