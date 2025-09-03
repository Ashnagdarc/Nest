-- Rollback for gear_ids array removal

-- Add back the gear_ids column
ALTER TABLE public.gear_requests ADD COLUMN IF NOT EXISTS gear_ids UUID[];

-- Populate gear_ids array from gear_request_gears
UPDATE public.gear_requests gr
SET gear_ids = array_agg(grg.gear_id)
FROM (
    SELECT gear_request_id, array_agg(gear_id) as gear_ids
    FROM public.gear_request_gears
    GROUP BY gear_request_id
) grg
WHERE gr.id = grg.gear_request_id;

-- Remove NOT NULL constraints if they were added
ALTER TABLE public.gear_requests 
    ALTER COLUMN user_id DROP NOT NULL,
    ALTER COLUMN reason DROP NOT NULL,
    ALTER COLUMN status DROP NOT NULL,
    ALTER COLUMN created_at DROP NOT NULL,
    ALTER COLUMN updated_at DROP NOT NULL;

-- Remove default values from timestamps
ALTER TABLE public.gear_requests 
    ALTER COLUMN created_at DROP DEFAULT,
    ALTER COLUMN updated_at DROP DEFAULT;
