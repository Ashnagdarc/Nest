-- Create or replace the get_popular_gears function with limit_count parameter
CREATE OR REPLACE FUNCTION public.get_popular_gears(
    start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
    end_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
    limit_count integer DEFAULT 10
)
RETURNS TABLE(
    gear_id text,
    name text,
    full_name text,
    request_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    _start_date timestamp with time zone;
    _end_date timestamp with time zone;
BEGIN
    -- Set default dates if not provided
    _start_date := COALESCE(start_date, (current_date - interval '30 days')::timestamp with time zone);
    _end_date := COALESCE(end_date, current_timestamp);
    
    RETURN QUERY
    WITH request_counts AS (
        -- Count requests per gear
        SELECT 
            unnest(gr.gear_ids) AS gear_id,
            COUNT(*) AS request_count
        FROM 
            gear_requests gr
        WHERE 
            gr.created_at >= _start_date
            AND gr.created_at <= _end_date
        GROUP BY 
            gear_id
    )
    SELECT 
        rc.gear_id::text,
        g.name::text,
        COALESCE(g.full_name, g.name)::text AS full_name,
        rc.request_count
    FROM 
        request_counts rc
    JOIN 
        gears g ON rc.gear_id = g.id
    ORDER BY 
        rc.request_count DESC
    LIMIT limit_count;
END;
$function$; 