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
        SELECT pubname FROM pg_publication WHERE pubname LIKE '%supabase_realtime%'
    );
    
    -- Return empty array if no tables found
    IF published_tables IS NULL THEN
        RETURN '{}';
    END IF;
    
    RETURN published_tables;
END;
$$; 