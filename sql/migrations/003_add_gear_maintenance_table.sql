-- Create the gear_maintenance table for tracking status changes
CREATE TABLE IF NOT EXISTS public.gear_maintenance (
    id SERIAL PRIMARY KEY,
    gear_id UUID NOT NULL REFERENCES public.gears(id) ON DELETE CASCADE,
    maintenance_type TEXT NOT NULL,
    description TEXT NOT NULL,
    performed_by UUID REFERENCES auth.users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add permissions
ALTER TABLE public.gear_maintenance ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can do anything" ON public.gear_maintenance
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'));

-- Make sure the trigger function exists and is correct
CREATE OR REPLACE FUNCTION update_gear_status_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- When a gear is updated, update the updated_at timestamp
    NEW.updated_at := NOW();
    
    -- Log the status change for auditing
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.gear_maintenance(
            gear_id,
            maintenance_type,
            description,
            performed_by,
            performed_at
        ) VALUES (
            NEW.id,
            'Status Change',
            'Status changed from ' || OLD.status || ' to ' || NEW.status,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'),
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists and recreate it to ensure it's properly connected
DROP TRIGGER IF EXISTS gear_status_update_trigger ON public.gears;

-- Create the trigger
CREATE TRIGGER gear_status_update_trigger
BEFORE UPDATE ON public.gears
FOR EACH ROW
EXECUTE FUNCTION update_gear_status_trigger(); 