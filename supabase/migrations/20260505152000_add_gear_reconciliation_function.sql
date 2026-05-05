BEGIN;

-- Reconcile gear availability and pointer fields from canonical request/check-in quantities.
-- Scope: gears + gear_requests + gear_request_gears + checkins only (no car tables).
CREATE OR REPLACE FUNCTION public.reconcile_gear_inventory_from_requests()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated_count integer := 0;
BEGIN
  WITH active_requests AS (
    SELECT id, user_id, due_date, updated_at
    FROM public.gear_requests
    WHERE status IN ('Approved', 'Checked Out', 'Partially Checked Out', 'Overdue')
  ),
  requested_by_user AS (
    SELECT
      ar.id AS request_id,
      ar.user_id,
      grg.gear_id,
      ar.due_date,
      ar.updated_at,
      SUM(GREATEST(COALESCE(grg.quantity, 1), 1))::integer AS requested_qty
    FROM active_requests ar
    JOIN public.gear_request_gears grg ON grg.gear_request_id = ar.id
    GROUP BY ar.id, ar.user_id, grg.gear_id, ar.due_date, ar.updated_at
  ),
  completed_by_user AS (
    SELECT
      c.request_id,
      c.user_id,
      c.gear_id,
      SUM(GREATEST(COALESCE(c.quantity, 1), 1))::integer AS completed_qty
    FROM public.checkins c
    WHERE c.status = 'Completed'
      AND c.request_id IS NOT NULL
    GROUP BY c.request_id, c.user_id, c.gear_id
  ),
  pending_by_user AS (
    SELECT
      c.request_id,
      c.user_id,
      c.gear_id,
      SUM(GREATEST(COALESCE(c.quantity, 1), 1))::integer AS pending_qty
    FROM public.checkins c
    WHERE c.status = 'Pending Admin Approval'
      AND c.request_id IS NOT NULL
    GROUP BY c.request_id, c.user_id, c.gear_id
  ),
  outstanding_by_request_user AS (
    SELECT
      rbu.request_id,
      rbu.user_id,
      rbu.gear_id,
      rbu.due_date,
      rbu.updated_at,
      GREATEST(
        rbu.requested_qty
        - COALESCE(cbu.completed_qty, 0)
        - COALESCE(pbu.pending_qty, 0),
        0
      )::integer AS outstanding_qty
    FROM requested_by_user rbu
    LEFT JOIN completed_by_user cbu
      ON cbu.request_id = rbu.request_id
     AND cbu.user_id = rbu.user_id
     AND cbu.gear_id = rbu.gear_id
    LEFT JOIN pending_by_user pbu
      ON pbu.request_id = rbu.request_id
     AND pbu.user_id = rbu.user_id
     AND pbu.gear_id = rbu.gear_id
  ),
  nonzero_outstanding AS (
    SELECT *
    FROM outstanding_by_request_user
    WHERE outstanding_qty > 0
  ),
  primary_holder AS (
    SELECT request_id, user_id, gear_id, due_date
    FROM (
      SELECT
        nzo.*,
        ROW_NUMBER() OVER (
          PARTITION BY nzo.gear_id
          ORDER BY nzo.outstanding_qty DESC, nzo.updated_at DESC, nzo.request_id DESC
        ) AS rn
      FROM nonzero_outstanding nzo
    ) ranked
    WHERE rn = 1
  ),
  outstanding_per_gear AS (
    SELECT gear_id, SUM(outstanding_qty)::integer AS outstanding_qty
    FROM nonzero_outstanding
    GROUP BY gear_id
  ),
  pending_per_gear AS (
    SELECT
      gear_id,
      SUM(GREATEST(COALESCE(quantity, 1), 1))::integer AS pending_qty
    FROM public.checkins
    WHERE status = 'Pending Admin Approval'
    GROUP BY gear_id
  ),
  desired_state AS (
    SELECT
      g.id AS gear_id,
      GREATEST(COALESCE(g.quantity, 1), 1)::integer AS total_qty,
      GREATEST(
        0,
        GREATEST(COALESCE(g.quantity, 1), 1)::integer - COALESCE(opg.outstanding_qty, 0)
      )::integer AS desired_available_qty,
      COALESCE(ppg.pending_qty, 0)::integer AS pending_qty,
      ph.user_id AS desired_checked_out_to,
      ph.request_id AS desired_request_id,
      ph.due_date AS desired_due_date
    FROM public.gears g
    LEFT JOIN outstanding_per_gear opg ON opg.gear_id = g.id
    LEFT JOIN pending_per_gear ppg ON ppg.gear_id = g.id
    LEFT JOIN primary_holder ph ON ph.gear_id = g.id
    WHERE g.category IS DISTINCT FROM 'Cars'
  ),
  computed_state AS (
    SELECT
      ds.gear_id,
      ds.desired_available_qty,
      CASE
        WHEN ds.pending_qty > 0 AND ds.desired_available_qty = 0 THEN 'Pending Check-in'
        WHEN ds.pending_qty > 0 AND ds.desired_available_qty < ds.total_qty THEN 'Partially Available'
        WHEN ds.desired_available_qty >= ds.total_qty THEN 'Available'
        WHEN ds.desired_available_qty = 0 THEN 'Checked Out'
        ELSE 'Partially Available'
      END AS desired_status,
      CASE WHEN ds.desired_available_qty >= ds.total_qty THEN NULL ELSE ds.desired_checked_out_to END AS desired_checked_out_to,
      CASE WHEN ds.desired_available_qty >= ds.total_qty THEN NULL ELSE ds.desired_request_id END AS desired_request_id,
      CASE WHEN ds.desired_available_qty >= ds.total_qty THEN NULL ELSE ds.desired_due_date END AS desired_due_date
    FROM desired_state ds
  ),
  updated AS (
    UPDATE public.gears g
    SET
      available_quantity = cs.desired_available_qty,
      status = cs.desired_status,
      checked_out_to = cs.desired_checked_out_to,
      current_request_id = cs.desired_request_id,
      due_date = cs.desired_due_date,
      updated_at = NOW()
    FROM computed_state cs
    WHERE g.id = cs.gear_id
      AND (
        COALESCE(g.available_quantity, -1) <> COALESCE(cs.desired_available_qty, -1)
        OR COALESCE(g.status, '') <> COALESCE(cs.desired_status, '')
        OR g.checked_out_to IS DISTINCT FROM cs.desired_checked_out_to
        OR g.current_request_id IS DISTINCT FROM cs.desired_request_id
        OR g.due_date IS DISTINCT FROM cs.desired_due_date
      )
    RETURNING g.id
  )
  SELECT COUNT(*)::integer INTO v_updated_count FROM updated;

  RETURN v_updated_count;
END;
$$;

COMMIT;
