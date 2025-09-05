-- Create gear_states table for tracking equipment availability and status
-- This table tracks the current and historical states of gear items

CREATE TABLE IF NOT EXISTS public.gear_states (
    id BIGSERIAL PRIMARY KEY,
    gear_id UUID NOT NULL REFERENCES public.gears(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('Available', 'Checked Out', 'Maintenance', 'Retired', 'Partially Available')),
    available_quantity INTEGER NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
    checked_out_to UUID REFERENCES public.profiles(id),
    current_request_id UUID REFERENCES public.gear_requests(id),
    due_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_gear_states_gear_id ON public.gear_states(gear_id);
CREATE INDEX IF NOT EXISTS idx_gear_states_status ON public.gear_states(status);
CREATE INDEX IF NOT EXISTS idx_gear_states_checked_out_to ON public.gear_states(checked_out_to);
CREATE INDEX IF NOT EXISTS idx_gear_states_created_at ON public.gear_states(created_at);
CREATE INDEX IF NOT EXISTS idx_gear_states_due_date ON public.gear_states(due_date);

-- Create a unique index to ensure only one active state per gear
CREATE UNIQUE INDEX IF NOT EXISTS idx_gear_states_gear_id_latest 
ON public.gear_states(gear_id) 
WHERE created_at = (
    SELECT MAX(created_at) 
    FROM public.gear_states gs2 
    WHERE gs2.gear_id = gear_states.gear_id
);

-- Enable Row Level Security
ALTER TABLE public.gear_states ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Everyone can view gear states (needed for availability checking)
CREATE POLICY "gear_states_select_all" ON public.gear_states
    FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can insert gear states
CREATE POLICY "gear_states_insert_admin" ON public.gear_states
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Only admins can update gear states
CREATE POLICY "gear_states_update_admin" ON public.gear_states
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Only admins can delete gear states
CREATE POLICY "gear_states_delete_admin" ON public.gear_states
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Service role can manage all gear states
CREATE POLICY "gear_states_service_role_all" ON public.gear_states
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create trigger function to update updated_at timestamp
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

-- Create function to get current gear state
CREATE OR REPLACE FUNCTION public.get_current_gear_state(p_gear_id UUID)
RETURNS TABLE(
    id BIGINT,
    gear_id UUID,
    status TEXT,
    available_quantity INTEGER,
    checked_out_to UUID,
    current_request_id UUID,
    due_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT gs.*
    FROM public.gear_states gs
    WHERE gs.gear_id = p_gear_id
    ORDER BY gs.created_at DESC
    LIMIT 1;
$$;

-- Create function to initialize gear state for existing gears
CREATE OR REPLACE FUNCTION public.initialize_gear_states()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    gear_record RECORD;
    initialized_count INTEGER := 0;
BEGIN
    -- Loop through all gears that don't have a state record
    FOR gear_record IN 
        SELECT g.id, g.quantity
        FROM public.gears g
        WHERE NOT EXISTS (
            SELECT 1 FROM public.gear_states gs 
            WHERE gs.gear_id = g.id
        )
    LOOP
        -- Create initial state for each gear
        INSERT INTO public.gear_states (
            gear_id,
            status,
            available_quantity,
            created_at,
            updated_at
        ) VALUES (
            gear_record.id,
            'Available',
            COALESCE(gear_record.quantity, 1),
            NOW(),
            NOW()
        );
        
        initialized_count := initialized_count + 1;
    END LOOP;
    
    RETURN initialized_count;
END;
$$;

-- Initialize states for existing gears
SELECT public.initialize_gear_states();

-- Add comments
COMMENT ON TABLE public.gear_states IS 'Tracks the current and historical states of gear items';
COMMENT ON COLUMN public.gear_states.status IS 'Current status: Available, Checked Out, Maintenance, Retired, Partially Available';
COMMENT ON COLUMN public.gear_states.available_quantity IS 'Number of units currently available for checkout';
COMMENT ON COLUMN public.gear_states.checked_out_to IS 'User who currently has the gear checked out';
COMMENT ON COLUMN public.gear_states.current_request_id IS 'Current request associated with this state';
COMMENT ON COLUMN public.gear_states.due_date IS 'When the gear is due to be returned';

