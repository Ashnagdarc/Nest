-- Utility functions for Supabase Realtime - Added 2024-05-16

-- Function to get all tables included in realtime publications
CREATE OR REPLACE FUNCTION get_realtime_tables()
RETURNS text[] 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    published_tables text[];
BEGIN
    -- Collect all tables that are part of any publication
    SELECT array_agg(tablename::text)
    INTO published_tables
    FROM pg_publication_tables
    WHERE pubname IN (
        SELECT pubname FROM pg_publication
    );
    
    -- Return empty array if no tables found
    IF published_tables IS NULL THEN
        RETURN '{}'::text[];
    END IF;
    
    RETURN published_tables;
END;
$$;

-- Grant access to the function for authenticated users
GRANT EXECUTE ON FUNCTION get_realtime_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION get_realtime_tables() TO service_role;

-- Add timestamp columns to junction tables if they don't exist
DO $$
BEGIN
    -- Add created_at to gear_request_gears if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gear_request_gears' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE IF EXISTS public.gear_request_gears 
        ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Add updated_at to gear_request_gears if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gear_request_gears' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE IF EXISTS public.gear_request_gears 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END
$$; 