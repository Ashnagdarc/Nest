-- Track who submitted a gear request when booking on behalf of someone else.
-- user_id = person the equipment is for; submitted_by_user_id = person who submitted.

ALTER TABLE public.gear_requests
  ADD COLUMN IF NOT EXISTS submitted_by_user_id UUID REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_gear_requests_submitted_by_user_id
  ON public.gear_requests (submitted_by_user_id)
  WHERE submitted_by_user_id IS NOT NULL;

COMMENT ON COLUMN public.gear_requests.submitted_by_user_id IS
  'When set, the authenticated user who submitted this request on behalf of user_id.';

-- Allow submitters to view requests they created for others.
DROP POLICY IF EXISTS "Users can view their own requests" ON public.gear_requests;

CREATE POLICY "Users can view their own requests"
  ON public.gear_requests
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() = submitted_by_user_id
  );
