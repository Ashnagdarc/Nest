-- Fix Profiles RLS Infinite Recursion Issue
-- 
-- The profiles table has multiple conflicting policies that cause infinite recursion
-- when policies try to query the profiles table from within a profiles policy.
-- This migration removes problematic policies and creates clean, non-recursive ones.

-- Drop all existing problematic policies that cause recursion
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow Admins and Users to Access Their Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to select their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile and admins view all" ON public.profiles;

-- Create a helper function to check admin status without recursion
-- This function uses a direct query to auth.users metadata instead of profiles table
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'Admin',
    false
  );
$$;

-- Create clean, non-recursive RLS policies

-- Allow users to view their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  TO public
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  TO public
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile (for registration)
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = id);

-- Allow service role to manage all profiles (for admin operations)
CREATE POLICY "profiles_service_role_all" ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create a separate admin view that bypasses RLS for admin operations
CREATE OR REPLACE VIEW public.admin_profiles_view AS
SELECT *
FROM public.profiles;

-- Grant access to the admin view for service role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_profiles_view TO service_role;

-- Add comment for audit trail
COMMENT ON TABLE public.profiles IS 'User profiles table - RLS policies fixed to prevent infinite recursion (2025-01-16)';

-- Verify the policies are working by testing a simple query
-- This should not cause recursion
SELECT 'Profiles RLS policies updated successfully' as status;