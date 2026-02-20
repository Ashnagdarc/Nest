-- Migration: Canonicalize gear availability + check-in/request status flow
-- Date: 2026-02-19
--
-- Goals:
-- 1) Remove conflicting trigger chains that mutate gears in incompatible ways.
-- 2) Make check-in approval quantity-aware (checkins.quantity).
-- 3) Stop live coupling to gear_states history table.
-- 4) Make pending check-in uniqueness scoped by request + gear + user.
-- 5) Clean orphan pending requests that have no line items.

BEGIN;

-- -----------------------------------------------------------------------------
-- Data hygiene
-- -----------------------------------------------------------------------------
UPDATE checkins
SET quantity = 1
WHERE quantity IS NULL OR quantity < 1;

UPDATE gears
SET quantity = GREATEST(COALESCE(quantity, 1), 1),
    available_quantity = GREATEST(LEAST(COALESCE(available_quantity, COALESCE(quantity, 1)), COALESCE(quantity, 1)), 0),
    updated_at = NOW()
WHERE quantity IS NULL
   OR quantity < 1
   OR available_quantity IS NULL
   OR available_quantity < 0
   OR available_quantity > COALESCE(quantity, 1);

-- Remove orphan pending requests with no lines (user confirmed hard-delete).
DELETE FROM gear_requests gr
WHERE gr.status = 'Pending'
  AND NOT EXISTS (
    SELECT 1
    FROM gear_request_gears grg
    WHERE grg.gear_request_id = gr.id
  );

-- -----------------------------------------------------------------------------
-- Index correction for pending check-ins
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_unique_pending_checkin_per_gear;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_checkin_per_request_gear_user
ON checkins (
  COALESCE(request_id, '00000000-0000-0000-0000-000000000000'::uuid),
  gear_id,
  user_id
)
WHERE status = 'Pending Admin Approval';

-- -----------------------------------------------------------------------------
-- Remove conflicting triggers
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_update_gear_status_on_checkin_approval ON checkins;
DROP TRIGGER IF EXISTS trigger_update_gear_available_quantity ON gears;
DROP TRIGGER IF EXISTS trigger_update_gear_available_quantity_insert ON gears;
DROP TRIGGER IF EXISTS trigger_sync_gear_states ON gears;
DROP TRIGGER IF EXISTS trigger_cleanup_gear_states_on_completion ON gear_requests;

-- Keep trigger_update_gear_on_checkin_status_change and
-- trigger_update_gear_request_status_on_checkin_completion, but replace their
-- function bodies with quantity-aware logic.

-- -----------------------------------------------------------------------------
-- Canonical gear reconciliation helper
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_gear_inventory_state(
  p_gear_id uuid,
  p_force_needs_repair boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_quantity integer;
  v_available_quantity integer;
  v_pending_quantity integer;
  v_new_status text;
BEGIN
  SELECT
    GREATEST(COALESCE(quantity, 1), 1),
    GREATEST(
      LEAST(COALESCE(available_quantity, COALESCE(quantity, 1)), GREATEST(COALESCE(quantity, 1), 1)),
      0
    )
  INTO v_total_quantity, v_available_quantity
  FROM gears
  WHERE id = p_gear_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(GREATEST(COALESCE(quantity, 1), 1)), 0)
  INTO v_pending_quantity
  FROM checkins
  WHERE gear_id = p_gear_id
    AND status = 'Pending Admin Approval';

  IF p_force_needs_repair THEN
    v_new_status := 'Needs Repair';
  ELSIF v_pending_quantity > 0 THEN
    v_new_status := CASE
      WHEN v_available_quantity = 0 THEN 'Pending Check-in'
      WHEN v_available_quantity < v_total_quantity THEN 'Partially Available'
      ELSE 'Available'
    END;
  ELSIF v_available_quantity >= v_total_quantity THEN
    v_new_status := 'Available';
  ELSIF v_available_quantity = 0 THEN
    v_new_status := 'Checked Out';
  ELSE
    v_new_status := 'Partially Available';
  END IF;

  UPDATE gears
  SET
    status = v_new_status,
    checked_out_to = CASE WHEN v_new_status IN ('Available', 'Needs Repair') THEN NULL ELSE checked_out_to END,
    current_request_id = CASE WHEN v_new_status IN ('Available', 'Needs Repair') THEN NULL ELSE current_request_id END,
    due_date = CASE WHEN v_new_status IN ('Available', 'Needs Repair') THEN NULL ELSE due_date END,
    updated_at = NOW()
  WHERE id = p_gear_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- Quantity-aware check-in trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_gear_on_checkin_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_quantity integer;
  v_current_available integer;
  v_delta integer;
  v_from_pending boolean;
BEGIN
  IF NEW.gear_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    GREATEST(COALESCE(quantity, 1), 1),
    GREATEST(
      LEAST(COALESCE(available_quantity, COALESCE(quantity, 1)), GREATEST(COALESCE(quantity, 1), 1)),
      0
    )
  INTO v_total_quantity, v_current_available
  FROM gears
  WHERE id = NEW.gear_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_delta := GREATEST(COALESCE(NEW.quantity, 1), 1);
  v_from_pending := false;
  IF TG_OP = 'UPDATE' THEN
    v_from_pending := (OLD.status = 'Pending Admin Approval');
  END IF;

  -- Pending check-ins should not increase availability. They only affect status.
  IF TG_OP = 'INSERT' AND NEW.status = 'Pending Admin Approval' THEN
    PERFORM public.recompute_gear_inventory_state(NEW.gear_id, false);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Approved return: increase available stock by returned quantity.
    IF v_from_pending AND NEW.status = 'Completed' THEN
      IF COALESCE(NEW.condition, 'Good') = 'Damaged' THEN
        PERFORM public.recompute_gear_inventory_state(NEW.gear_id, true);
      ELSE
        UPDATE gears
        SET
          available_quantity = LEAST(v_total_quantity, GREATEST(0, v_current_available + v_delta)),
          updated_at = NOW()
        WHERE id = NEW.gear_id;

        PERFORM public.recompute_gear_inventory_state(NEW.gear_id, false);
      END IF;
      RETURN NEW;
    END IF;

    -- Rejected/cancelled pending return: just recompute status.
    IF v_from_pending AND NEW.status = 'Rejected' THEN
      PERFORM public.recompute_gear_inventory_state(NEW.gear_id, false);
      RETURN NEW;
    END IF;

    -- Any other status transition: reconcile safely.
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM public.recompute_gear_inventory_state(NEW.gear_id, false);
      RETURN NEW;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_gear_on_checkin_status_change ON checkins;
CREATE TRIGGER trigger_update_gear_on_checkin_status_change
AFTER INSERT OR UPDATE ON checkins
FOR EACH ROW
EXECUTE FUNCTION public.update_gear_on_checkin_status_change();

-- -----------------------------------------------------------------------------
-- Request completion should follow request_id + quantity sums
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_gear_request_status_on_checkin_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_request_id uuid;
  v_total_requested_quantity integer;
  v_completed_quantity integer;
  v_pending_quantity integer;
  v_current_status text;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.request_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.quantity IS NOT DISTINCT FROM OLD.quantity THEN
    RETURN NEW;
  END IF;

  v_request_id := NEW.request_id;

  SELECT COALESCE(SUM(GREATEST(COALESCE(quantity, 1), 1)), 0)
  INTO v_total_requested_quantity
  FROM gear_request_gears
  WHERE gear_request_id = v_request_id;

  IF v_total_requested_quantity = 0 THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(GREATEST(COALESCE(quantity, 1), 1)), 0)
  INTO v_completed_quantity
  FROM checkins
  WHERE request_id = v_request_id
    AND status = 'Completed';

  SELECT COALESCE(SUM(GREATEST(COALESCE(quantity, 1), 1)), 0)
  INTO v_pending_quantity
  FROM checkins
  WHERE request_id = v_request_id
    AND status = 'Pending Admin Approval';

  SELECT status
  INTO v_current_status
  FROM gear_requests
  WHERE id = v_request_id;

  IF v_completed_quantity >= v_total_requested_quantity AND v_pending_quantity = 0 THEN
    UPDATE gear_requests
    SET status = 'Completed',
        updated_at = NOW()
    WHERE id = v_request_id
      AND status <> 'Completed';
  ELSIF v_current_status = 'Completed' AND (v_completed_quantity < v_total_requested_quantity OR v_pending_quantity > 0) THEN
    UPDATE gear_requests
    SET status = 'Approved',
        updated_at = NOW()
    WHERE id = v_request_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_gear_request_status_on_checkin_completion ON checkins;
CREATE TRIGGER trigger_update_gear_request_status_on_checkin_completion
AFTER UPDATE ON checkins
FOR EACH ROW
EXECUTE FUNCTION public.update_gear_request_status_on_checkin_completion();

-- -----------------------------------------------------------------------------
-- One-time status reconciliation for existing rows
-- -----------------------------------------------------------------------------
WITH pending AS (
  SELECT gear_id, COALESCE(SUM(GREATEST(COALESCE(quantity, 1), 1)), 0) AS pending_qty
  FROM checkins
  WHERE status = 'Pending Admin Approval'
  GROUP BY gear_id
),
bounded AS (
  SELECT
    g.id,
    GREATEST(COALESCE(g.quantity, 1), 1) AS total_qty,
    GREATEST(
      LEAST(COALESCE(g.available_quantity, COALESCE(g.quantity, 1)), GREATEST(COALESCE(g.quantity, 1), 1)),
      0
    ) AS avail_qty,
    COALESCE(p.pending_qty, 0) AS pending_qty
  FROM gears g
  LEFT JOIN pending p ON p.gear_id = g.id
)
UPDATE gears g
SET
  available_quantity = b.avail_qty,
  status = CASE
    WHEN b.pending_qty > 0 AND b.avail_qty = 0 THEN 'Pending Check-in'
    WHEN b.pending_qty > 0 AND b.avail_qty < b.total_qty THEN 'Partially Available'
    WHEN b.avail_qty >= b.total_qty THEN 'Available'
    WHEN b.avail_qty = 0 THEN 'Checked Out'
    ELSE 'Partially Available'
  END,
  checked_out_to = CASE
    WHEN b.avail_qty >= b.total_qty THEN NULL
    ELSE g.checked_out_to
  END,
  current_request_id = CASE
    WHEN b.avail_qty >= b.total_qty THEN NULL
    ELSE g.current_request_id
  END,
  due_date = CASE
    WHEN b.avail_qty >= b.total_qty THEN NULL
    ELSE g.due_date
  END,
  updated_at = NOW()
FROM bounded b
WHERE g.id = b.id;

COMMIT;
