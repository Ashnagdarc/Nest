-- Create a function to generate weekly gear activity report
CREATE OR REPLACE FUNCTION public.get_weekly_activity_report(start_date timestamp with time zone, end_date timestamp with time zone)
RETURNS TABLE (
    gear_id uuid,
    gear_name text,
    request_count bigint,
    checkout_count bigint,
    checkin_count bigint,
    booking_count bigint,
    damage_count bigint
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
    WITH 
    gear_requests_summary AS (
        -- Count individual gear requests during the period
        SELECT 
            unnest(gear_ids) as gear_id,
            COUNT(*) as request_count
        FROM gear_requests gr
        WHERE gr.created_at >= start_date 
        AND gr.created_at <= end_date
        AND gr.gear_ids IS NOT NULL
        GROUP BY unnest(gear_ids)
    ),
    gear_checkouts_summary AS (
        -- Count gear checkouts during the period
        SELECT 
            gear_id,
            COUNT(*) as checkout_count
        FROM gear_checkouts
        WHERE checkout_date >= start_date
        AND checkout_date <= end_date
        GROUP BY gear_id
    ),
    gear_checkins_summary AS (
        -- Count gear checkins during the period
        SELECT 
            gear_id,
            COUNT(*) as checkin_count
        FROM checkins
        WHERE checkin_date >= start_date
        AND checkin_date <= end_date
        GROUP BY gear_id
    ),
    gear_bookings_summary AS (
        -- Count gear bookings during the period
        SELECT 
            gear_id,
            COUNT(*) as booking_count
        FROM gear_calendar_bookings
        WHERE created_at >= start_date
        AND created_at <= end_date
        GROUP BY gear_id
    ),
    gear_damages_summary AS (
        -- Count gear damage reports during the period
        SELECT 
            gear_id,
            COUNT(*) as damage_count
        FROM checkins
        WHERE checkin_date >= start_date
        AND checkin_date <= end_date
        AND condition = 'Damaged'
        GROUP BY gear_id
    ),
    -- Alternative damage count from activity log if needed
    gear_damage_logs AS (
        SELECT 
            gear_id,
            COUNT(*) as damage_log_count
        FROM gear_activity_log
        WHERE created_at >= start_date
        AND created_at <= end_date
        AND activity_type = 'Damage Report'
        GROUP BY gear_id
    )
    SELECT 
        g.id as gear_id,
        COALESCE(g.name, 'Unknown Gear') as gear_name,
        COALESCE(grs.request_count, 0) as request_count,
        COALESCE(gcs.checkout_count, 0) as checkout_count,
        COALESCE(gcis.checkin_count, 0) as checkin_count,
        COALESCE(gbs.booking_count, 0) as booking_count,
        GREATEST(COALESCE(gds.damage_count, 0), COALESCE(gdl.damage_log_count, 0)) as damage_count
    FROM gears g
    LEFT JOIN gear_requests_summary grs ON g.id = grs.gear_id
    LEFT JOIN gear_checkouts_summary gcs ON g.id = gcs.gear_id
    LEFT JOIN gear_checkins_summary gcis ON g.id = gcis.gear_id
    LEFT JOIN gear_bookings_summary gbs ON g.id = gbs.gear_id
    LEFT JOIN gear_damages_summary gds ON g.id = gds.gear_id
    LEFT JOIN gear_damage_logs gdl ON g.id = gdl.gear_id
    WHERE 
        COALESCE(grs.request_count, 0) > 0 OR
        COALESCE(gcs.checkout_count, 0) > 0 OR
        COALESCE(gcis.checkin_count, 0) > 0 OR
        COALESCE(gbs.booking_count, 0) > 0 OR
        COALESCE(gds.damage_count, 0) > 0 OR
        COALESCE(gdl.damage_log_count, 0) > 0
    ORDER BY
        (COALESCE(grs.request_count, 0) + 
         COALESCE(gcs.checkout_count, 0) + 
         COALESCE(gcis.checkin_count, 0) + 
         COALESCE(gbs.booking_count, 0)) DESC;

    RETURN;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error generating weekly activity report: %', SQLERRM;
        RETURN;
END;
$$;

-- Grant execute permissions on the function
GRANT EXECUTE ON FUNCTION public.get_weekly_activity_report(timestamp with time zone, timestamp with time zone) TO authenticated;
