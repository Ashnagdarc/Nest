-- Debug script for announcements insert issues

-- 1. Verify the current user and their role
SELECT 
    auth.uid() as current_user_id,
    (SELECT role FROM profiles WHERE id = auth.uid()) as user_role,
    private.is_admin(auth.uid()) as is_admin;

-- 2. Verify table structure (confirm the field names)
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'announcements'
ORDER BY ordinal_position;

-- 3. Check foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
WHERE
    tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'announcements';

-- 4. Check RLS policies on the announcements table
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies 
WHERE 
    tablename = 'announcements';

-- 5. Try a direct insert as the postgres role (bypassing RLS)
-- This query should be run in the SQL editor with postgres privileges
INSERT INTO announcements (title, content, created_by)
VALUES ('Test Announcement', 'This is a test announcement created by postgres role', auth.uid())
RETURNING *;

-- 6. Check if there are any triggers that might be causing issues
SELECT
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM
    information_schema.triggers
WHERE
    event_object_table = 'announcements'; 