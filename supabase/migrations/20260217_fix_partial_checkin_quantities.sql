-- Migration: Fix partial check-in quantities
-- Issue: When user books 4 items but only checks in 1-2, available_quantity
-- should be (total - pending), not 0.
-- Also fixes cases where gear stays checked out even after all check-ins are approved.

-- Recreate the trigger function with proper quantity accounting
CREATE OR REPLACE FUNCTION update_gear_on_checkin_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_total_quantity INTEGER;
  v_pending_quantity INTEGER;
  v_new_available INTEGER;
BEGIN
  -- Get the total quantity for this gear
  SELECT COALESCE(quantity, 1) INTO v_total_quantity
  FROM gears
  WHERE id = NEW.gear_id;
  
  -- When a check-in is created with 'Pending Admin Approval' status
  IF NEW.status = 'Pending Admin Approval' AND (OLD.status IS NULL OR OLD.status != 'Pending Admin Approval') THEN
    -- Calculate total pending check-in quantity for this gear (including the new one)
    SELECT COALESCE(SUM(COALESCE(quantity, 1)), 0) INTO v_pending_quantity
    FROM checkins
    WHERE gear_id = NEW.gear_id
    AND status = 'Pending Admin Approval';
    
    -- Calculate new available_quantity: total - pending
    v_new_available = GREATEST(0, v_total_quantity - v_pending_quantity);
    
    -- Update gear status and available_quantity
    UPDATE gears 
    SET available_quantity = v_new_available,
        status = CASE 
                  WHEN v_new_available = 0 THEN 'Pending Check-in'
                  WHEN v_new_available < v_total_quantity THEN 'Partially Available'
                  ELSE status
                END,
        updated_at = NOW()
    WHERE id = NEW.gear_id;
  END IF;
  
  -- When a check-in is approved (status = 'Completed')
  IF NEW.status = 'Completed' AND OLD.status = 'Pending Admin Approval' THEN
    -- Count remaining pending check-ins for this gear (after this one is completed)
    SELECT COALESCE(SUM(COALESCE(quantity, 1)), 0) INTO v_pending_quantity
    FROM checkins
    WHERE gear_id = NEW.gear_id
    AND status = 'Pending Admin Approval'
    AND id != NEW.id;  -- Exclude the current check-in since it's being approved
    
    -- For damaged gears, mark as needing repair
    IF NEW.condition = 'Damaged' THEN
      UPDATE gears 
      SET status = 'Needs Repair',
          available_quantity = v_total_quantity - v_pending_quantity,
          checked_out_to = NULL,
          current_request_id = NULL,
          updated_at = NOW()
      WHERE id = NEW.gear_id;
    ELSE
      -- Good condition - calculate new available_quantity
      v_new_available = GREATEST(0, v_total_quantity - v_pending_quantity);
      
      -- Determine new status based on availability
      UPDATE gears 
      SET status = CASE 
                    WHEN v_new_available = 0 THEN 'Checked Out'
                    WHEN v_new_available < v_total_quantity THEN 'Partially Available'
                    ELSE 'Available'
                  END,
          available_quantity = v_new_available,
          checked_out_to = NULL,
          current_request_id = NULL,
          updated_at = NOW()
      WHERE id = NEW.gear_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix any gears that are stuck in 'Checked Out' status but have no pending check-ins
UPDATE gears g
SET status = 'Available',
    available_quantity = COALESCE(quantity, 1),
    updated_at = NOW()
WHERE status = 'Checked Out'
AND id NOT IN (
  SELECT DISTINCT gear_id 
  FROM checkins 
  WHERE status = 'Pending Admin Approval'
);

-- Fix partial availability calculation
UPDATE gears g
SET available_quantity = (
  SELECT COALESCE(quantity, 1) - COALESCE(SUM(COALESCE(c.quantity, 1)), 0)
  FROM gears g2
  LEFT JOIN checkins c ON g2.id = c.gear_id AND c.status = 'Pending Admin Approval'
  WHERE g2.id = g.id
  GROUP BY g2.id, g2.quantity
),
status = CASE
  WHEN (
    SELECT COALESCE(quantity, 1) - COALESCE(SUM(COALESCE(c.quantity, 1)), 0)
    FROM gears g2
    LEFT JOIN checkins c ON g2.id = c.gear_id AND c.status = 'Pending Admin Approval'
    WHERE g2.id = g.id
    GROUP BY g2.id, g2.quantity
  ) = 0 THEN 'Checked Out'
  WHEN (
    SELECT COALESCE(quantity, 1) - COALESCE(SUM(COALESCE(c.quantity, 1)), 0)
    FROM gears g2
    LEFT JOIN checkins c ON g2.id = c.gear_id AND c.status = 'Pending Admin Approval'
    WHERE g2.id = g.id
    GROUP BY g2.id, g2.quantity
  ) < COALESCE(quantity, 1) THEN 'Partially Available'
  ELSE 'Available'
END,
updated_at = NOW()
WHERE status IN ('Checked Out', 'Pending Check-in', 'Partially Available', 'Available')
AND EXISTS (
  SELECT 1 FROM checkins WHERE gear_id = g.id AND status = 'Completed'
);
