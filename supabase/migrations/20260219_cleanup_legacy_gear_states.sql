-- Cleanup legacy gear_states artifacts after migrating to gears.available_quantity/status as source of truth.
-- This migration is intentionally idempotent.

-- 1) Keep a one-time archive copy before removing the legacy public table.
CREATE SCHEMA IF NOT EXISTS archive;

DO $$
BEGIN
  IF to_regclass('public.gear_states') IS NOT NULL
     AND to_regclass('archive.gear_states_backup_20260219') IS NULL THEN
    EXECUTE 'CREATE TABLE archive.gear_states_backup_20260219 AS TABLE public.gear_states';
  END IF;
END $$;

-- 2) Keep compatibility view name, but make it derive from gears only.
CREATE OR REPLACE VIEW public.v_gears_with_state AS
SELECT
  g.id,
  g.name,
  g.category,
  g.description,
  g.serial_number,
  g.purchase_date,
  g.image_url,
  g.initial_condition,
  g.status AS gear_status,
  g.owner_id,
  g.created_at AS gear_created_at,
  g.updated_at AS gear_updated_at,
  g.quantity,
  g.available_quantity AS gear_available_quantity,
  g.checked_out_to AS gear_checked_out_to,
  g.current_request_id AS gear_current_request_id,
  g.due_date AS gear_due_date,
  g.condition AS gear_condition,
  NULL::bigint AS state_id,
  COALESCE(g.status, 'Available'::text) AS state_status,
  COALESCE(g.available_quantity, g.quantity, 0) AS state_available_quantity,
  g.checked_out_to AS state_checked_out_to,
  g.current_request_id AS state_current_request_id,
  g.due_date AS state_due_date,
  NULL::text AS state_notes,
  NULL::timestamptz AS state_created_at,
  NULL::timestamptz AS state_updated_at
FROM public.gears g;

-- 3) Remove legacy functions tied to gear_states history model.
DROP FUNCTION IF EXISTS public.cleanup_gear_states_on_request_completion() CASCADE;
DROP FUNCTION IF EXISTS public.sync_gear_states_with_gears() CASCADE;
DROP FUNCTION IF EXISTS public.update_gear_states_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_gear_on_checkin_approval() CASCADE;
DROP FUNCTION IF EXISTS public.update_gear_checkout_status(
  uuid,
  text,
  uuid,
  uuid,
  timestamptz,
  timestamptz,
  integer
) CASCADE;

-- 4) Drop legacy table + sequence in public schema.
DROP TABLE IF EXISTS public.gear_states;
DROP SEQUENCE IF EXISTS public.gear_states_id_seq;
