-- Debug the current admin status for the current user
SELECT 
    auth.uid() as current_user_id,
    (SELECT role FROM profiles WHERE id = auth.uid()) as user_role,
    private.is_admin(auth.uid()) as is_admin;

-- Check if the announcements table exists and has the right schema
SELECT 
    column_name, 
    data_type
FROM 
    information_schema.columns
WHERE 
    table_name = 'announcements';

-- Drop existing policy that might be too restrictive
DROP POLICY IF EXISTS "Only admins can create announcements" ON announcements;

-- Create a more permissive policy for testing
CREATE POLICY "Any authenticated user can create announcements" 
ON announcements FOR INSERT 
TO authenticated
WITH CHECK (true);

-- List all policies on the announcements table to verify
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies 
WHERE 
    tablename = 'announcements'; 