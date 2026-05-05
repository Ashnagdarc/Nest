-- Realtime live location sharing for Live Bus tracking
CREATE TABLE IF NOT EXISTS public.live_locations (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    accuracy_m DOUBLE PRECISION NULL,
    is_sharing BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_locations_updated_at ON public.live_locations(updated_at DESC);

ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS live_locations_select_authenticated ON public.live_locations;
CREATE POLICY live_locations_select_authenticated ON public.live_locations
    FOR SELECT TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS live_locations_insert_own ON public.live_locations;
CREATE POLICY live_locations_insert_own ON public.live_locations
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS live_locations_update_own ON public.live_locations;
CREATE POLICY live_locations_update_own ON public.live_locations
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS live_locations_delete_own ON public.live_locations;
CREATE POLICY live_locations_delete_own ON public.live_locations
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS live_locations_admin_all ON public.live_locations;
CREATE POLICY live_locations_admin_all ON public.live_locations
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'));

DO $$
DECLARE
    pub RECORD;
BEGIN
    FOR pub IN
        SELECT pubname FROM pg_publication WHERE pubname = 'supabase_realtime' OR pubname LIKE '%supabase_realtime%'
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION %I ADD TABLE public.live_locations', pub.pubname);
        EXCEPTION
            WHEN duplicate_object THEN
                NULL;
            WHEN invalid_object_definition THEN
                NULL;
        END;
    END LOOP;
END $$;
