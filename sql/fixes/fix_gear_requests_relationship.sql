-- Add a computed column to gear_requests for related gears
DO $$
BEGIN
    -- Only add if it doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'gear_requests' AND column_name = 'gears'
    ) THEN
        ALTER TABLE public.gear_requests 
        ADD COLUMN gears public.gears[] 
        GENERATED ALWAYS AS (
            ARRAY(
                SELECT row(g.*)::public.gears 
                FROM public.gears g 
                WHERE g.id = ANY(gear_requests.gear_ids)
            )
        ) STORED;
    END IF;
END $$;

-- Refresh the schema cache for PostgREST/Supabase
NOTIFY pgrst, 'reload schema'; 