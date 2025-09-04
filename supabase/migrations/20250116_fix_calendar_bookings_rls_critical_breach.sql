-- Fix critical RLS security breach on gear_calendar_bookings table
-- The current policy uses 'public' role which bypasses authentication
-- This allows unauthenticated users and all authenticated users to see all bookings

-- Drop the problematic policy that uses 'public' role
DROP POLICY IF EXISTS "Users can view own bookings and admins view all" ON gear_calendar_bookings;

-- Create a new policy that properly restricts access to authenticated users only
CREATE POLICY "Users can view own bookings and admins view all" ON gear_calendar_bookings
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() 
        OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'Admin'
        )
    );

-- Ensure RLS is enabled (should already be enabled but double-check)
ALTER TABLE gear_calendar_bookings ENABLE ROW LEVEL SECURITY;

-- Add comment explaining the fix
COMMENT ON POLICY "Users can view own bookings and admins view all" ON gear_calendar_bookings IS 
'Fixed critical security breach: Changed from public role to authenticated role to prevent unauthorized access to all bookings';