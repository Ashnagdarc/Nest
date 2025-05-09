-- Check if table exists and show structure
SELECT 
    column_name, data_type, is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_name = 'announcements'
ORDER BY 
    ordinal_position;

-- Check if any data exists in the table
SELECT COUNT(*) FROM announcements;

-- Show RLS policies on announcements table
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd, 
    permissive, 
    roles,
    qual,
    with_check
FROM 
    pg_policies 
WHERE 
    tablename = 'announcements';

-- Try to manually insert a test announcement
-- This will help determine if there's a permission issue or structural issue
INSERT INTO announcements (title, content, created_by, created_at, updated_at)
VALUES (
    'Test Announcement from SQL', 
    'This is a test announcement created directly via SQL to diagnose issues.', 
    auth.uid(), -- Current user
    NOW(), 
    NOW()
)
RETURNING *;

-- Check if the create_announcement function exists
SELECT 
    routine_name, 
    data_type AS return_type
FROM 
    information_schema.routines 
WHERE 
    routine_name = 'create_announcement' 
    AND routine_type = 'FUNCTION'; 