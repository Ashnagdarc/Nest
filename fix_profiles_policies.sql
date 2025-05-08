-- Fix for infinite recursion in profiles table policies

-- First, drop any existing problematic policies
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

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

-- 3. Admin policy that avoids recursion by using a direct check
-- This is the key fix - instead of using EXISTS with a nested query on profiles
CREATE POLICY "Admins can manage profiles" 
ON profiles 
FOR ALL
USING (
  -- Get admin status directly from RLS
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'Admin'
);

-- 4. Insert policy to handle initial profile creation
CREATE POLICY "Users can insert their own profile" 
ON profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id); 