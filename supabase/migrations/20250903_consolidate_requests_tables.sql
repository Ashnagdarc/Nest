-- First, migrate any missing data from requests to gear_requests
INSERT INTO public.gear_requests (
    user_id,
    gear_ids,
    reason,
    status,
    created_at,
    updated_at,
    due_date
)
SELECT 
    user_id,
    ARRAY[gear_id],
    reason,
    status,
    created_at,
    updated_at,
    due_date
FROM public.requests r
WHERE NOT EXISTS (
    SELECT 1 FROM public.gear_requests gr
    WHERE gr.created_at = r.created_at
    AND gr.user_id = r.user_id
);

-- Create gear_request_gears entries for migrated requests
INSERT INTO public.gear_request_gears (
    gear_request_id,
    gear_id,
    quantity,
    created_at,
    updated_at
)
SELECT 
    gr.id,
    r.gear_id,
    1, -- Default quantity
    r.created_at,
    r.updated_at
FROM public.requests r
JOIN public.gear_requests gr ON 
    gr.created_at = r.created_at AND 
    gr.user_id = r.user_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.gear_request_gears grg
    WHERE grg.gear_request_id = gr.id
    AND grg.gear_id = r.gear_id
);

-- Drop the old requests table and its policies
DROP POLICY IF EXISTS "select_own_requests" ON public.requests;
DROP POLICY IF EXISTS "insert_own_requests" ON public.requests;
DROP POLICY IF EXISTS "update_own_requests" ON public.requests;
DROP POLICY IF EXISTS "delete_own_requests" ON public.requests;
DROP TABLE IF EXISTS public.requests;
