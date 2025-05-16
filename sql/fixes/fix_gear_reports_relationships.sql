-- Comprehensive fix for gear_requests and gears relationship
DO $$
BEGIN
    -- Ensure gears table exists with proper schema
    CREATE TABLE IF NOT EXISTS public.gears (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        full_name TEXT,
        status TEXT DEFAULT 'Available',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Ensure gear_requests table exists with proper schema
    CREATE TABLE IF NOT EXISTS public.gear_requests (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        gear_ids UUID[] NOT NULL,
        user_id UUID REFERENCES auth.users(id),
        status TEXT DEFAULT 'Pending',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT gear_ids_not_empty CHECK (array_length(gear_ids, 1) > 0)
    );

    -- Create index on gear_ids for better performance
    CREATE INDEX IF NOT EXISTS idx_gear_requests_gear_ids ON public.gear_requests USING GIN (gear_ids);

    -- Create a computed column to get the associated gears
    CREATE OR REPLACE FUNCTION public.get_request_gears(gear_request public.gear_requests)
    RETURNS SETOF public.gears
    LANGUAGE sql
    STABLE
    AS $$
        SELECT g.* FROM public.gears g
        WHERE g.id = ANY(gear_request.gear_ids);
    $$;

    -- Enable the computed column in the API
    COMMENT ON FUNCTION public.get_request_gears(public.gear_requests) IS
    '@name gears
    Retrieves the gears associated with this request';

    -- Create function for getting popular gears
    CREATE OR REPLACE FUNCTION public.get_popular_gears(
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ
    )
    RETURNS TABLE (
        gear_id UUID,
        name TEXT,
        full_name TEXT,
        request_count BIGINT
    )
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    AS $$
        WITH unnested_gear_ids AS (
            SELECT unnest(gear_ids) as gear_id
            FROM public.gear_requests
            WHERE created_at >= start_date
            AND created_at <= end_date
        )
        SELECT 
            g.id as gear_id,
            g.name,
            g.full_name,
            COUNT(*) as request_count
        FROM unnested_gear_ids u
        JOIN public.gears g ON g.id = u.gear_id
        GROUP BY g.id, g.name, g.full_name
        ORDER BY request_count DESC;
    $$;

    -- Notify PostgREST to reload schema
    NOTIFY pgrst, 'reload schema';
END
$$;
