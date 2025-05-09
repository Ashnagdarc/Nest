-- Ensure checkins table has all required columns
CREATE TABLE IF NOT EXISTS public.checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    gear_id UUID NOT NULL REFERENCES public.gears(id),
    checkin_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL,
    notes TEXT,
    condition TEXT,
    damage_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON public.checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_gear_id ON public.checkins(gear_id);
CREATE INDEX IF NOT EXISTS idx_checkins_status ON public.checkins(status);
CREATE INDEX IF NOT EXISTS idx_checkins_checkin_date ON public.checkins(checkin_date);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_checkins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'set_checkins_timestamp' 
        AND tgrelid = 'public.checkins'::regclass
    ) THEN
        CREATE TRIGGER set_checkins_timestamp
        BEFORE UPDATE ON public.checkins
        FOR EACH ROW
        EXECUTE FUNCTION update_checkins_updated_at();
    END IF;
END
$$;

-- Add RLS policies
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- Allow admins to do anything
CREATE POLICY admin_all ON public.checkins
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'));

-- Allow users to view their own check-ins
CREATE POLICY users_select_own ON public.checkins
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Create a function to handle check-ins
CREATE OR REPLACE FUNCTION process_gear_checkin(
    p_gear_id UUID,
    p_user_id UUID,
    p_condition TEXT,
    p_damage_notes TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_checkin_id UUID;
BEGIN
    -- Create the check-in record
    INSERT INTO public.checkins (
        id,
        user_id,
        gear_id,
        checkin_date,
        status,
        condition,
        damage_notes,
        notes
    ) VALUES (
        gen_random_uuid(),
        p_user_id,
        p_gear_id,
        NOW(),
        'Completed',
        p_condition,
        p_damage_notes,
        p_notes
    )
    RETURNING id INTO v_checkin_id;

    -- Update the gear status based on condition
    UPDATE public.gears
    SET 
        status = CASE
            WHEN p_damage_notes IS NOT NULL THEN 'Damaged'
            ELSE 'Available'
        END,
        condition = p_condition,
        checked_out_to = NULL,
        current_request_id = NULL,
        updated_at = NOW()
    WHERE id = p_gear_id;

    -- Add a maintenance record if damage is reported
    IF p_damage_notes IS NOT NULL THEN
        INSERT INTO public.gear_maintenance (
            gear_id,
            maintenance_type,
            description,
            performed_by,
            performed_at
        ) VALUES (
            p_gear_id,
            'Damage Report',
            'Damage reported during check-in: ' || p_damage_notes,
            p_user_id,
            NOW()
        );
    END IF;

    RETURN v_checkin_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION process_gear_checkin TO authenticated; 