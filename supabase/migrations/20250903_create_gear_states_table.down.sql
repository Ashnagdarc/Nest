-- Rollback for gear_states table creation

-- First, migrate state data back to gears table
UPDATE public.gears g
SET 
    status = gs.status,
    available_quantity = gs.available_quantity,
    checked_out_to = gs.checked_out_to,
    current_request_id = gs.current_request_id,
    due_date = gs.due_date,
    updated_at = gs.updated_at
FROM (
    SELECT DISTINCT ON (gear_id)
        gear_id,
        status,
        available_quantity,
        checked_out_to,
        current_request_id,
        due_date,
        updated_at
    FROM public.gear_states
    ORDER BY gear_id, created_at DESC
) gs
WHERE g.id = gs.gear_id;

-- Drop trigger and function
DROP TRIGGER IF EXISTS update_gear_states_updated_at ON public.gear_states;
DROP FUNCTION IF EXISTS public.update_gear_states_updated_at();

-- Drop RLS policies
DROP POLICY IF EXISTS "view_gear_states_all" ON public.gear_states;
DROP POLICY IF EXISTS "insert_gear_states_admin" ON public.gear_states;
DROP POLICY IF EXISTS "update_gear_states_admin" ON public.gear_states;

-- Drop indexes
DROP INDEX IF EXISTS idx_gear_states_gear_id;
DROP INDEX IF EXISTS idx_gear_states_status;
DROP INDEX IF EXISTS idx_gear_states_checked_out_to;

-- Drop the table
DROP TABLE IF EXISTS public.gear_states;
