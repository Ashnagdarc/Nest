-- Fix Critical RLS Security Vulnerabilities
-- This migration addresses urgent security issues in RLS policies

-- 1. Fix gear_calendar_bookings - Users should only see their own bookings and admins see all
DROP POLICY IF EXISTS "Users can view all bookings" ON gear_calendar_bookings;

CREATE POLICY "Users can view own bookings and admins view all" ON gear_calendar_bookings
    FOR SELECT
    USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'Admin'
        )
    );

-- 2. Fix profiles - Users should only see their own profile and admins see all
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

CREATE POLICY "Users can view own profile and admins view all" ON profiles
    FOR SELECT
    USING (
        id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'Admin'
        )
    );

-- 3. Fix request_status_history - Restrict overly permissive "Allow all" policy
DROP POLICY IF EXISTS "Allow all" ON request_status_history;

-- Users can view status history for their own requests
CREATE POLICY "Users can view own request history" ON request_status_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM gear_requests gr 
            WHERE gr.id = request_status_history.request_id 
            AND gr.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM gear_calendar_bookings gcb 
            WHERE gcb.request_id = request_status_history.request_id 
            AND gcb.user_id = auth.uid()
        )
    );

-- Admins can view all request history
CREATE POLICY "Admins can view all request history" ON request_status_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'Admin'
        )
    );

-- Only admins can insert/update/delete request history
CREATE POLICY "Admins can manage request history" ON request_status_history
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'Admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'Admin'
        )
    );

-- 4. Fix user_push_tokens - Users should only manage their own tokens
DROP POLICY IF EXISTS "Allow all" ON user_push_tokens;

CREATE POLICY "Users can manage own push tokens" ON user_push_tokens
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Admins can view all push tokens for administrative purposes
CREATE POLICY "Admins can view all push tokens" ON user_push_tokens
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'Admin'
        )
    );

-- 5. Fix gear_requests - Remove duplicate overly permissive policies
DROP POLICY IF EXISTS "Allow read to all" ON gear_requests;
DROP POLICY IF EXISTS "Allow select for all (realtime)" ON gear_requests;

-- Keep the existing proper policies:
-- "Users can view their own requests" - allows users to see their own requests
-- "Admins can view all requests" - allows admins to see all requests
-- These are already properly restrictive

-- 6. Fix gear_request_gears - Should follow same pattern as gear_requests
DROP POLICY IF EXISTS "gear_request_gears_select_policy" ON gear_request_gears;

CREATE POLICY "Users can view own request gears" ON gear_request_gears
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM gear_requests gr 
            WHERE gr.id = gear_request_gears.gear_request_id 
            AND gr.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all request gears" ON gear_request_gears
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'Admin'
        )
    );

-- Add comment for audit trail
COMMENT ON TABLE gear_calendar_bookings IS 'RLS policies updated 2025-01-16: Fixed overly permissive "Users can view all bookings" policy';
COMMENT ON TABLE profiles IS 'RLS policies updated 2025-01-16: Fixed overly permissive "Enable read access for all users" policy';
COMMENT ON TABLE request_status_history IS 'RLS policies updated 2025-01-16: Fixed overly permissive "Allow all" policy';
COMMENT ON TABLE user_push_tokens IS 'RLS policies updated 2025-01-16: Fixed overly permissive "Allow all" policy';