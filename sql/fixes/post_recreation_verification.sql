-- Step 1: Verify the table was recreated with all columns
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

-- Step 2: Verify that the function works
SELECT create_announcement(
    'Function Test After Recreation', 
    'This is a test using the function after recreating the table', 
    auth.uid()
);

-- Step 3: Verify that data has been inserted properly
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

-- Step 4: Show RLS policies
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

-- Step 5: Once we confirm everything works, make created_by NOT NULL
ALTER TABLE announcements 
ALTER COLUMN created_by SET NOT NULL; 