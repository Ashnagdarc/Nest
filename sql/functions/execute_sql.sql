-- Function to safely execute SQL for admin users
CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    is_admin boolean;
BEGIN
    -- Check if the current user is an admin
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'Admin'
    ) INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- Prevent destructive operations
    IF sql_query ~* '\s*(DROP|TRUNCATE|DELETE|ALTER|UPDATE|INSERT)\s+' THEN
        RAISE EXCEPTION 'Destructive SQL operations are not allowed';
    END IF;

    -- Execute the query and capture the result
    EXECUTE format('
        WITH query_result AS (%s)
        SELECT jsonb_agg(to_jsonb(query_result.*))
        FROM query_result;
    ', sql_query) INTO result;

    RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'error', SQLERRM,
            'detail', SQLSTATE,
            'context', 'execute_sql function'
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_sql TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION execute_sql IS 'Safely executes SELECT queries for admin users with proper error handling and result formatting.'; 