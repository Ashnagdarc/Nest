-- Fix the relationship between gear_requests and gears tables
DO $$
BEGIN
    -- First, check if the gear_requests table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gear_requests') THEN
        -- Add the foreign key constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'gear_requests_gear_ids_fkey'
        ) THEN
            -- Add foreign key array constraint
            ALTER TABLE public.gear_requests
            ADD CONSTRAINT gear_requests_gear_ids_fkey
            FOREIGN KEY (gear_ids)
            REFERENCES public.gears(id);
            
            -- Refresh the schema cache
            NOTIFY pgrst, 'reload schema';
        END IF;
    END IF;
END
$$;
