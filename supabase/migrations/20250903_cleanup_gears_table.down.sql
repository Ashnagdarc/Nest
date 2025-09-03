-- Rollback for gears table cleanup

-- Add back removed columns
ALTER TABLE public.gears
    ADD COLUMN IF NOT EXISTS checked_out_by UUID,
    ADD COLUMN IF NOT EXISTS initial_condition TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT,
    ADD COLUMN IF NOT EXISTS checked_out_to UUID,
    ADD COLUMN IF NOT EXISTS current_request_id UUID,
    ADD COLUMN IF NOT EXISTS last_checkout_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- Restore data from gear_states if available
UPDATE public.gears g
SET 
    status = gs.status,
    checked_out_to = gs.checked_out_to,
    current_request_id = gs.current_request_id,
    due_date = gs.due_date,
    initial_condition = g.condition, -- Best guess for initial_condition
    checked_out_by = gs.checked_out_to, -- Assuming checked_out_by should match checked_out_to
    last_checkout_date = gs.created_at -- Using gear_states creation as last checkout
FROM (
    SELECT DISTINCT ON (gear_id)
        gear_id,
        status,
        checked_out_to,
        current_request_id,
        due_date,
        created_at
    FROM public.gear_states
    ORDER BY gear_id, created_at DESC
) gs
WHERE g.id = gs.gear_id;

-- Remove NOT NULL constraint from quantity if it was added
ALTER TABLE public.gears ALTER COLUMN quantity DROP NOT NULL;

-- Remove default value from quantity if it was added
ALTER TABLE public.gears ALTER COLUMN quantity DROP DEFAULT;
