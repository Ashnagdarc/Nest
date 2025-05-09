-- Fix for infinite recursion in profiles table policies
-- Using SECURITY DEFINER function to bypass RLS when checking admin status

-- First, drop any existing problematic policies
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create private schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS private;

-- Set appropriate permissions on the private schema
GRANT USAGE ON SCHEMA private TO authenticated, anon;
REVOKE CREATE ON SCHEMA private FROM PUBLIC;

-- Create a secure function to check if a user is an admin (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION private.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = uid AND role = 'Admin'
  );
$$;

-- Create simplified policies that won't cause recursion
-- 1. Basic read access for all authenticated users
CREATE POLICY "Enable read access for all users" 
ON profiles 
FOR SELECT USING (true);

-- 2. Self-update policy (users can only update their own profiles)
CREATE POLICY "Users can update their own profile" 
ON profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND (role IS NULL OR role = 'User'));

-- 3. Admin policy using the security definer function to avoid recursion
CREATE POLICY "Admins can manage profiles" 
ON profiles 
FOR ALL
USING (private.is_admin(auth.uid()));

-- 4. Insert policy to handle initial profile creation
CREATE POLICY "Users can insert their own profile" 
ON profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id); 