-- Verify announcements table structure
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

-- Verify function exists
SELECT 
    routine_name, 
    data_type AS return_type,
    specific_name,
    routine_definition
FROM 
    information_schema.routines 
WHERE 
    routine_name = 'create_announcement' 
    AND routine_type = 'FUNCTION'
LIMIT 1;

-- Verify existing data (if any)
SELECT 
    id, 
    title, 
    content, 
    created_by, 
    created_at 
FROM 
    announcements
ORDER BY 
    created_at DESC;

-- Verify RLS policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd, 
    roles
FROM 
    pg_policies 
WHERE 
    tablename = 'announcements';

-- Simple test of the function
SELECT create_announcement(
    'Test via Function', 
    'This tests the create_announcement function explicitly.', 
    auth.uid()
); 