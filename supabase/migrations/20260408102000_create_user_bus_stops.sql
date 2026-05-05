-- Per-user preferred bus stops (home/work) for live commute widget
CREATE TABLE IF NOT EXISTS public.user_bus_stops (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stop_key TEXT NOT NULL CHECK (stop_key IN ('home', 'work')),
    stop_name TEXT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    radius_m DOUBLE PRECISION NOT NULL DEFAULT 120,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_bus_stops
    ADD COLUMN IF NOT EXISTS stop_key TEXT;
ALTER TABLE public.user_bus_stops
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.user_bus_stops
SET stop_key = 'home'
WHERE stop_key IS NULL;

ALTER TABLE public.user_bus_stops
    ALTER COLUMN stop_key SET NOT NULL;

ALTER TABLE public.user_bus_stops
    DROP CONSTRAINT IF EXISTS user_bus_stops_stop_key_check;
ALTER TABLE public.user_bus_stops
    ADD CONSTRAINT user_bus_stops_stop_key_check CHECK (stop_key IN ('home', 'work'));

ALTER TABLE public.user_bus_stops
    DROP CONSTRAINT IF EXISTS user_bus_stops_pkey;
ALTER TABLE public.user_bus_stops
    ADD CONSTRAINT user_bus_stops_pkey PRIMARY KEY (user_id, stop_key);

CREATE INDEX IF NOT EXISTS idx_user_bus_stops_updated_at ON public.user_bus_stops(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_bus_stops_user_id ON public.user_bus_stops(user_id);

ALTER TABLE public.user_bus_stops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_bus_stops_select_own ON public.user_bus_stops;
CREATE POLICY user_bus_stops_select_own ON public.user_bus_stops
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_bus_stops_insert_own ON public.user_bus_stops;
CREATE POLICY user_bus_stops_insert_own ON public.user_bus_stops
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_bus_stops_update_own ON public.user_bus_stops;
CREATE POLICY user_bus_stops_update_own ON public.user_bus_stops
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_bus_stops_delete_own ON public.user_bus_stops;
CREATE POLICY user_bus_stops_delete_own ON public.user_bus_stops
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_bus_stops_admin_all ON public.user_bus_stops;
CREATE POLICY user_bus_stops_admin_all ON public.user_bus_stops
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'));
