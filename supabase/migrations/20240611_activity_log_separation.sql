-- Separate audit logging from maintenance: route status changes to gear_activity_log
-- 1) Backfill existing 'Status Change' rows from gear_maintenance to gear_activity_log
BEGIN;

-- Create helper to map maintenance rows to activity log
CREATE OR REPLACE FUNCTION migrate_status_change_maintenance_to_activity()
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  WITH src AS (
    SELECT
      gm.gear_id,
      NULL::uuid AS user_id,
      NULL::uuid AS request_id,
      'Status Change'::gear_activity_type AS activity_type,
      gm.status AS status,
      gm.description AS notes,
      jsonb_build_object(
        'maintenance_id', gm.id,
        'performed_by', gm.performed_by,
        'performed_at', gm.performed_at,
        'maintenance_type', gm.maintenance_type
      ) AS details,
      gm.performed_at AS created_at
    FROM gear_maintenance gm
    WHERE gm.maintenance_type = 'Status Change'
  ), ins AS (
    INSERT INTO gear_activity_log(
      gear_id, user_id, request_id, activity_type, status, notes, details, created_at, updated_at
    )
    SELECT gear_id, user_id, request_id, activity_type, status, notes, details, created_at, created_at
    FROM src
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted_count FROM ins;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Execute backfill
SELECT migrate_status_change_maintenance_to_activity();

-- 2) Update trigger to log status changes into gear_activity_log only
CREATE OR REPLACE FUNCTION update_gear_status_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Always set updated_at
  NEW.updated_at := NOW();

  -- Only log status changes into gear_activity_log (not gear_maintenance)
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    BEGIN
      INSERT INTO public.gear_activity_log(
        gear_id,
        user_id,
        request_id,
        activity_type,
        status,
        notes,
        details,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'),
        COALESCE(NEW.current_request_id, NULL),
        'Status Change',
        NEW.status,
        'Status changed from ' || COALESCE(OLD.status, 'NULL') || ' to ' || COALESCE(NEW.status, 'NULL'),
        jsonb_build_object('from', OLD.status, 'to', NEW.status),
        NOW(),
        NOW()
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to log gear status change into gear_activity_log: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
