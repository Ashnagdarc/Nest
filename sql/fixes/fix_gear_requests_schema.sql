-- First, ensure the gears table exists and has the correct structure
CREATE TABLE IF NOT EXISTS public.gears (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    full_name text,
    created_at timestamp with time zone DEFAULT now()
);

-- Ensure gear_requests table exists with correct structure
CREATE TABLE IF NOT EXISTS public.gear_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    gear_ids uuid[] NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT gear_requests_gear_ids_check CHECK (array_length(gear_ids, 1) > 0)
);

-- Create the function to get popular gears
CREATE OR REPLACE FUNCTION public.get_popular_gears(start_date timestamp with time zone, end_date timestamp with time zone)
RETURNS TABLE (
    gear_id uuid,
    name text,
    full_name text,
    request_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Create a temporary table to store unnested gear IDs
    CREATE TEMP TABLE IF NOT EXISTS temp_gear_counts AS
    SELECT 
        unnest(gear_ids) as gear_id,
        COUNT(*) as request_count
    FROM gear_requests
    WHERE created_at >= start_date 
    AND created_at <= end_date
    GROUP BY gear_id;

    RETURN QUERY
    SELECT 
        g.id as gear_id,
        g.name,
        g.full_name,
        COALESCE(t.request_count, 0) as request_count
    FROM gears g
    LEFT JOIN temp_gear_counts t ON t.gear_id = g.id
    WHERE t.request_count > 0
    ORDER BY t.request_count DESC
    LIMIT 5;

    -- Clean up
    DROP TABLE IF EXISTS temp_gear_counts;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_popular_gears(timestamp with time zone, timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_popular_gears(timestamp with time zone, timestamp with time zone) TO service_role;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
