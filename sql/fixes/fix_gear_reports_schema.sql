-- Reset and create proper relationships between gear_requests and gears

-- First, let's make sure the gears table exists
CREATE TABLE IF NOT EXISTS public.gears (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    full_name TEXT,
    status TEXT DEFAULT 'Available',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create or recreate the gear_requests table with proper schema
CREATE TABLE IF NOT EXISTS public.gear_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gear_ids UUID[] NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT gear_ids_not_empty CHECK (array_length(gear_ids, 1) > 0)
);

-- Create an index on gear_ids to improve performance
CREATE INDEX IF NOT EXISTS idx_gear_requests_gear_ids ON public.gear_requests USING GIN (gear_ids);

-- Create function to link gear_requests with gears
CREATE OR REPLACE FUNCTION public.get_request_gears(request_gear_ids UUID[])
RETURNS SETOF public.gears
LANGUAGE sql
STABLE
AS $$
    SELECT g.* FROM public.gears g
    WHERE g.id = ANY(request_gear_ids);
$$;

-- Create function to get popular gears in a date range
CREATE OR REPLACE FUNCTION public.get_popular_gears(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS TABLE (
    gear_id UUID,
    name TEXT,
    full_name TEXT,
    request_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH unnested_gear_ids AS (
        SELECT 
            unnest(gear_ids) as gear_id
        FROM gear_requests
        WHERE created_at >= start_date 
        AND created_at <= end_date
    )
    SELECT 
        g.id as gear_id,
        g.name,
        g.full_name,
        COUNT(*) as request_count
    FROM unnested_gear_ids u
    JOIN gears g ON g.id = u.gear_id
    GROUP BY g.id, g.name, g.full_name
    ORDER BY request_count DESC
    LIMIT 5;
END;
$$;

-- Update schema cache for realtime subscriptions
BEGIN;
    -- Add computed field to gear_requests for the gears relationship
    ALTER TABLE public.gear_requests DROP COLUMN IF EXISTS gears;
    ALTER TABLE public.gear_requests 
    ADD COLUMN gears public.gears[] 
    GENERATED ALWAYS AS (
        ARRAY(
            SELECT row(g.*)::public.gears 
            FROM public.gears g 
            WHERE g.id = ANY(gear_ids)
        )
    ) STORED;
COMMIT;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_popular_gears TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_request_gears TO postgres, anon, authenticated, service_role;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
