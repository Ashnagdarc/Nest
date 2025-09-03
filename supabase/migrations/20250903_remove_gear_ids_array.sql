-- First, ensure all gear_ids are properly represented in gear_request_gears
INSERT INTO public.gear_request_gears (
    gear_request_id,
    gear_id,
    quantity,
    created_at,
    updated_at
)
SELECT DISTINCT
    gr.id,
    gear_id,
    1, -- Default quantity
    gr.created_at,
    gr.updated_at
FROM public.gear_requests gr
CROSS JOIN UNNEST(gr.gear_ids) AS gear_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.gear_request_gears grg
    WHERE grg.gear_request_id = gr.id
    AND grg.gear_id = gear_id::uuid
);

-- Remove the gear_ids column
ALTER TABLE public.gear_requests DROP COLUMN IF EXISTS gear_ids;

-- Add NOT NULL constraints to important columns if not already present
ALTER TABLE public.gear_requests 
    ALTER COLUMN user_id SET NOT NULL,
    ALTER COLUMN reason SET NOT NULL,
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;

-- Add default values to timestamps
ALTER TABLE public.gear_requests 
    ALTER COLUMN created_at SET DEFAULT NOW(),
    ALTER COLUMN updated_at SET DEFAULT NOW();
