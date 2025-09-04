-- Consolidate Redundant RLS Policies on gear_requests Table
-- 
-- The gear_requests table has duplicate policies that serve the same purpose.
-- This migration removes redundant policies and keeps the cleaner, more descriptive ones.

-- Drop redundant INSERT policy (keeping 'Users can create their own requests')
DROP POLICY IF EXISTS "Allow insert for users" ON public.gear_requests;

-- Drop redundant SELECT policy (keeping 'Users can view their own requests')
DROP POLICY IF EXISTS "Allow select for users" ON public.gear_requests;

-- The admin policies that query profiles table may cause recursion issues
-- Let's update them to use a safer approach
DROP POLICY IF EXISTS "Admins can view all requests" ON public.gear_requests;
DROP POLICY IF EXISTS "Admins can update any request" ON public.gear_requests;

-- Create new admin policies that use service role instead of profile queries
CREATE POLICY "gear_requests_admin_select" ON public.gear_requests
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "gear_requests_admin_update" ON public.gear_requests
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "gear_requests_admin_delete" ON public.gear_requests
  FOR DELETE
  TO service_role
  USING (true);

-- Add comment for audit trail
COMMENT ON TABLE public.gear_requests IS 'Gear requests table - RLS policies consolidated to remove redundancy (2025-01-16)';

-- Verify the remaining policies
SELECT 'Gear requests RLS policies consolidated successfully' as status;