-- Fix: allow on-behalf submitter to insert gear lines for requests they submitted.
DROP POLICY IF EXISTS "gear_request_gears_insert_own" ON public.gear_request_gears;

CREATE POLICY "gear_request_gears_insert_own"
  ON public.gear_request_gears
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.gear_requests gr
      WHERE gr.id = gear_request_gears.gear_request_id
        AND (
          gr.user_id = auth.uid()
          OR gr.submitted_by_user_id = auth.uid()
        )
        AND lower(gr.status) = 'pending'
    )
  );
