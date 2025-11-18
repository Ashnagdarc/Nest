-- Fix RLS Policy on user_push_tokens table
-- Issue: Original policy was missing WITH CHECK clause, blocking all INSERT/UPDATE operations
-- Solution: Drop and recreate policy with complete FOR ALL + USING + WITH CHECK

-- Drop the incomplete policy
DROP POLICY IF EXISTS "push_tokens_user_policy" ON public.user_push_tokens;

-- Recreate with complete permissions for INSERT/UPDATE/DELETE
CREATE POLICY "push_tokens_user_policy" ON public.user_push_tokens
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create admin-only SELECT policy
CREATE POLICY "push_tokens_admin_policy" ON public.user_push_tokens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );
