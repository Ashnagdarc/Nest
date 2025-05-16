-- Create a function to handle the gear_ids relationship
CREATE OR REPLACE FUNCTION public.get_popular_gears(start_date timestamp with time zone, end_date timestamp with time zone)
RETURNS TABLE (
    gear_id uuid,
    name text,
    full_name text,
    request_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF start_date IS NULL OR end_date IS NULL THEN
        RAISE EXCEPTION 'start_date and end_date must not be null';
    END IF;

    RETURN QUERY
    WITH unnested_gear_ids AS (
        SELECT 
            unnest(gear_ids) as gear_id,
            created_at
        FROM gear_requests gr
        WHERE gr.created_at >= start_date 
        AND gr.created_at <= end_date
        AND gr.gear_ids IS NOT NULL
        AND array_length(gr.gear_ids, 1) > 0
    )
    SELECT 
        g.id as gear_id,
        COALESCE(g.name, 'Unknown Gear') as name,
        COALESCE(g.full_name, g.name, 'Unknown Gear') as full_name,
        COUNT(*) as request_count
    FROM unnested_gear_ids u
    JOIN gears g ON g.id = u.gear_id
    GROUP BY g.id, g.name, g.full_name
    ORDER BY request_count DESC
    LIMIT 5;

    RETURN;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error getting popular gears: %', SQLERRM;
        RETURN;
END;
$$;
