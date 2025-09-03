-- Rollback for requests table consolidation

-- Recreate the requests table
CREATE TABLE IF NOT EXISTS public.requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gear_id UUID,
    user_id UUID,
    status TEXT NOT NULL,
    reason TEXT,
    checkout_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    checkin_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    created_by UUID
);

-- Enable RLS
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies
CREATE POLICY "select_own_requests"
    ON public.requests
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "insert_own_requests"
    ON public.requests
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own_requests"
    ON public.requests
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "delete_own_requests"
    ON public.requests
    FOR DELETE
    USING (user_id = auth.uid());

-- Migrate data back from gear_requests
INSERT INTO public.requests (
    user_id,
    gear_id,
    status,
    reason,
    due_date,
    created_at,
    updated_at,
    created_by
)
SELECT 
    gr.user_id,
    grg.gear_id,
    gr.status,
    gr.reason,
    gr.due_date,
    gr.created_at,
    gr.updated_at,
    gr.user_id as created_by
FROM public.gear_requests gr
JOIN public.gear_request_gears grg ON grg.gear_request_id = gr.id
WHERE NOT EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.user_id = gr.user_id
    AND r.gear_id = grg.gear_id
    AND r.created_at = gr.created_at
);
