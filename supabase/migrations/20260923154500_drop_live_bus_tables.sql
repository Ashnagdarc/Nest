-- Remove live bus tracking: shared locations and saved home/work stops.

DO $$
DECLARE
    pub RECORD;
BEGIN
    FOR pub IN
        SELECT p.pubname
        FROM pg_publication p
        JOIN pg_publication_rel pr ON pr.prpubid = p.oid
        JOIN pg_class c ON c.oid = pr.prrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'live_locations'
    LOOP
        EXECUTE format('ALTER PUBLICATION %I DROP TABLE public.live_locations', pub.pubname);
    END LOOP;
END $$;

DROP TABLE IF EXISTS public.live_locations;
DROP TABLE IF EXISTS public.user_bus_stops;
