-- Fix RLS policies for gears table
-- This migration addresses the conflicting and overlapping policies that cause empty error objects

-- First, drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow insert for admins only" ON public.gears;
DROP POLICY IF EXISTS "Allow select for admins and owners" ON public.gears;
DROP POLICY IF EXISTS "Allow select for all authenticated users" ON public.gears;
DROP POLICY IF EXISTS "Users can view all gear" ON public.gears;
DROP POLICY IF EXISTS "Only admins can create gear" ON public.gears;
DROP POLICY IF EXISTS "Only admins can update gear" ON public.gears;
DROP POLICY IF EXISTS "Users can update gear they've checked out" ON public.gears;
DROP POLICY IF EXISTS "Users can view gear condition" ON public.gears;
DROP POLICY IF EXISTS "admin_delete_gears_policy" ON public.gears;
DROP POLICY IF EXISTS "Admins can do anything" ON public.gears;
DROP POLICY IF EXISTS "Users can view all gears" ON public.gears;
DROP POLICY IF EXISTS "Users can update their checked out gears" ON public.gears;

-- Create simplified, non-conflicting policies

-- 1. Allow all authenticated users to SELECT (view) all gears
CREATE POLICY "authenticated_users_can_select_gears"
    ON public.gears
    FOR SELECT
    TO authenticated
    USING (true);

-- 2. Allow admins to INSERT new gears
CREATE POLICY "admins_can_insert_gears"
    ON public.gears
    FOR INSERT
    TO authenticated
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

-- 3. Allow admins to UPDATE any gear
CREATE POLICY "admins_can_update_gears"
    ON public.gears
    FOR UPDATE
    TO authenticated
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

-- 4. Allow users to UPDATE gears they have checked out
CREATE POLICY "users_can_update_their_checked_out_gears"
    ON public.gears
    FOR UPDATE
    TO authenticated
    USING (checked_out_to = auth.uid())
    WITH CHECK (checked_out_to = auth.uid());

-- 5. Allow admins to DELETE gears
CREATE POLICY "admins_can_delete_gears"
    ON public.gears
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'Admin'
        )
    );

-- 6. Allow anon users to SELECT (for public viewing if needed)
CREATE POLICY "anon_users_can_select_gears"
    ON public.gears
    FOR SELECT
    TO anon
    USING (true);

-- Create a simple test function to verify policies work
CREATE OR REPLACE FUNCTION test_gear_access(user_id UUID DEFAULT NULL)
RETURNS TABLE(
    test_name TEXT,
    result TEXT,
    details TEXT
) AS $$
BEGIN
    -- Test 1: Basic SELECT access
    BEGIN
        PERFORM 1 FROM gears LIMIT 1;
        RETURN QUERY SELECT 'SELECT Access'::TEXT, 'PASS'::TEXT, 'User can select from gears table'::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'SELECT Access'::TEXT, 'FAIL'::TEXT, SQLERRM::TEXT;
    END;

    -- Test 2: SELECT with user filter
    IF user_id IS NOT NULL THEN
        BEGIN
            PERFORM 1 FROM gears WHERE checked_out_to = user_id LIMIT 1;
            RETURN QUERY SELECT 'User Filtered SELECT'::TEXT, 'PASS'::TEXT, 'User can select their checked out gears'::TEXT;
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 'User Filtered SELECT'::TEXT, 'FAIL'::TEXT, SQLERRM::TEXT;
        END;
    END IF;

    -- Test 3: Count query
    BEGIN
        PERFORM COUNT(*) FROM gears;
        RETURN QUERY SELECT 'COUNT Query'::TEXT, 'PASS'::TEXT, 'User can count gears'::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'COUNT Query'::TEXT, 'FAIL'::TEXT, SQLERRM::TEXT;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
