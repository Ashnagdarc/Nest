-- Create an enum type for activity types
CREATE TYPE gear_activity_type AS ENUM (
    'Request',
    'Check-in',
    'Check-out',
    'Maintenance',
    'Status Change'
);

-- Create the gear activity log table
CREATE TABLE IF NOT EXISTS public.gear_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    gear_id UUID REFERENCES public.gears(id),
    request_id UUID REFERENCES public.gear_requests(id),
    activity_type gear_activity_type NOT NULL,
    status TEXT,
    notes TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gear_activity_user ON public.gear_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_gear_activity_gear ON public.gear_activity_log(gear_id);
CREATE INDEX IF NOT EXISTS idx_gear_activity_type ON public.gear_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_gear_activity_created ON public.gear_activity_log(created_at);

-- Add RLS policies
ALTER TABLE public.gear_activity_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own activity
CREATE POLICY "Users can view their own activity"
ON public.gear_activity_log
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all activity
CREATE POLICY "Admins can view all activity"
ON public.gear_activity_log
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND position = 'Admin'
    )
);

-- Create a function to log gear activity
CREATE OR REPLACE FUNCTION log_gear_activity(
    p_user_id UUID,
    p_gear_id UUID,
    p_request_id UUID,
    p_activity_type gear_activity_type,
    p_status TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_activity_id UUID;
BEGIN
    INSERT INTO public.gear_activity_log (
        user_id,
        gear_id,
        request_id,
        activity_type,
        status,
        notes,
        details
    ) VALUES (
        p_user_id,
        p_gear_id,
        p_request_id,
        p_activity_type,
        p_status,
        p_notes,
        p_details
    )
    RETURNING id INTO v_activity_id;

    RETURN v_activity_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_gear_activity TO authenticated;

-- Create a trigger function to automatically log gear status changes
CREATE OR REPLACE FUNCTION log_gear_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM log_gear_activity(
            auth.uid(),
            NEW.id,
            NEW.current_request_id,
            'Status Change'::gear_activity_type,
            NEW.status,
            NULL,
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger on gears table
CREATE TRIGGER log_gear_status_changes
    AFTER UPDATE OF status
    ON public.gears
    FOR EACH ROW
    EXECUTE FUNCTION log_gear_status_change();

-- Backfill existing data
INSERT INTO public.gear_activity_log (
    user_id,
    gear_id,
    request_id,
    activity_type,
    status,
    notes,
    created_at
)
SELECT 
    r.user_id,
    g.id as gear_id,
    r.id as request_id,
    'Request'::gear_activity_type,
    r.status,
    r.notes,
    r.created_at
FROM public.gear_requests r
CROSS JOIN UNNEST(r.gear_ids) as gear_id
JOIN public.gears g ON g.id::text = gear_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.gear_activity_log 
    WHERE request_id = r.id 
    AND activity_type = 'Request'
);

-- Add check-ins
INSERT INTO public.gear_activity_log (
    user_id,
    gear_id,
    activity_type,
    status,
    notes,
    created_at
)
SELECT 
    c.user_id,
    c.gear_id,
    'Check-in'::gear_activity_type,
    c.status,
    c.notes,
    c.checkin_date
FROM public.checkins c
WHERE NOT EXISTS (
    SELECT 1 FROM public.gear_activity_log 
    WHERE gear_id = c.gear_id 
    AND created_at = c.checkin_date
    AND activity_type = 'Check-in'
); 