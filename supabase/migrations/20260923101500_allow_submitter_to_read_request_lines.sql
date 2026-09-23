-- On-behalf bookings store the colleague as user_id and the booker as
-- submitted_by_user_id. The request row was already visible to the booker,
-- but the equipment lines were not, so My Requests showed no equipment.
DROP POLICY IF EXISTS "users_select_own_request_lines" ON public.gear_request_gears;

CREATE POLICY "users_select_own_request_lines"
  ON public.gear_request_gears
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.gear_requests gr
      WHERE gr.id = gear_request_gears.gear_request_id
        AND (
          gr.user_id = auth.uid()
          OR gr.submitted_by_user_id = auth.uid()
        )
    )
  );
