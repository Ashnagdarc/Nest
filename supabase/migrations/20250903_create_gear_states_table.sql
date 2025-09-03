-- Create gear_states table
CREATE TABLE IF NOT EXISTS public.gear_states (
    id BIGSERIAL PRIMARY KEY,
    gear_id UUID NOT NULL REFERENCES public.gears(id),
    status TEXT NOT NULL,
    available_quantity INTEGER NOT NULL,
    checked_out_to UUID REFERENCES auth.users(id),
    current_request_id UUID REFERENCES public.gear_requests(id),
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_gear_states_gear_id ON public.gear_states(gear_id);
CREATE INDEX IF NOT EXISTS idx_gear_states_status ON public.gear_states(status);
CREATE INDEX IF NOT EXISTS idx_gear_states_checked_out_to ON public.gear_states(checked_out_to);

-- Enable RLS
ALTER TABLE public.gear_states ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "view_gear_states_all" ON public.gear_states
    FOR SELECT USING (true);

CREATE POLICY "insert_gear_states_admin" ON public.gear_states
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'Admin'
        )
    );

CREATE POLICY "update_gear_states_admin" ON public.gear_states
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'Admin'
        )
    );

-- Migrate existing gear states
INSERT INTO public.gear_states (
    gear_id,
    status,
    available_quantity,
    checked_out_to,
    current_request_id,
    due_date,
    created_at,
    updated_at
)
SELECT 
    id as gear_id,
    status,
    COALESCE(available_quantity, quantity) as available_quantity,
    checked_out_to,
    current_request_id,
    due_date,
    NOW() as created_at,
    NOW() as updated_at
FROM public.gears
WHERE status IS NOT NULL;

-- Create trigger function to update timestamps
CREATE OR REPLACE FUNCTION public.update_gear_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_gear_states_updated_at
    BEFORE UPDATE ON public.gear_states
    FOR EACH ROW
    EXECUTE FUNCTION public.update_gear_states_updated_at();

-- Add comment
COMMENT ON TABLE public.gear_states IS 'Tracks the current and historical states of gear items';
