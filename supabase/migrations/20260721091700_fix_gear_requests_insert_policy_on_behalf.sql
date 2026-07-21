-- Fix: allow on-behalf booking by permitting submitter to insert rows
-- where submitted_by_user_id = auth.uid() (booking for someone else).
DROP POLICY IF EXISTS "users_insert_own_requests" ON public.gear_requests;

CREATE POLICY "users_insert_own_requests"
  ON public.gear_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR (submitted_by_user_id IS NOT NULL AND auth.uid() = submitted_by_user_id)
  );
