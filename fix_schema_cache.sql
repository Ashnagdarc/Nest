-- Script to fix schema cache and verify column existence

-- Verify the announcements table structure
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'announcements'
ORDER BY ordinal_position;

-- If needed, you can refresh the database's internal schema cache (Postgres)
-- This is useful if the schema cache is out of sync
NOTIFY pgrst, 'reload schema';

-- The command below refreshes PostgREST's schema cache
-- This affects Supabase's API layer
SELECT pg_notify('pgrst', 'reload schema');

-- To check if the created_by column exists and its foreign key constraint
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
    AND tc.table_name = 'announcements'
    AND kcu.column_name = 'created_by';

-- Check if there are any RLS policies referencing this column
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd,
    qual,
    with_check
FROM 
    pg_policies 
WHERE 
    tablename = 'announcements'
    AND (qual::text LIKE '%created_by%' OR with_check::text LIKE '%created_by%');

-- If the column doesn't exist (verify first!), add it with the correct constraint
-- DO NOT RUN THESE COMMANDS if the column already exists!
/*
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
*/ 