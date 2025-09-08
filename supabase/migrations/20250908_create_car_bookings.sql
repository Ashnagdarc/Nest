-- Car bookings core table (additive, non-breaking)
CREATE TABLE IF NOT EXISTS public.car_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    employee_name TEXT NOT NULL,
    date_of_use DATE NOT NULL,
    time_slot TEXT NOT NULL,
    destination TEXT,
    purpose TEXT,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected','Cancelled')),
    approved_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ NULL,
    rejected_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    rejection_reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional cars table for asset assignment
CREATE TABLE IF NOT EXISTS public.cars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,
    plate TEXT UNIQUE NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional booking->car assignment (one car per booking)
CREATE TABLE IF NOT EXISTS public.car_assignment (
    booking_id UUID PRIMARY KEY REFERENCES public.car_bookings(id) ON DELETE CASCADE,
    car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_car_bookings_date_status ON public.car_bookings(date_of_use, status);
CREATE INDEX IF NOT EXISTS idx_car_bookings_requester ON public.car_bookings(requester_id);
CREATE INDEX IF NOT EXISTS idx_car_assignment_car ON public.car_assignment(car_id);

-- RLS
ALTER TABLE public.car_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_assignment ENABLE ROW LEVEL SECURITY;

-- Users can insert/select their own bookings (Pending only for updates)
CREATE POLICY car_bookings_select_own ON public.car_bookings
    FOR SELECT TO authenticated
    USING (requester_id = auth.uid());

CREATE POLICY car_bookings_insert_own ON public.car_bookings
    FOR INSERT TO authenticated
    WITH CHECK (requester_id = auth.uid());

CREATE POLICY car_bookings_update_own_pending ON public.car_bookings
    FOR UPDATE TO authenticated
    USING (requester_id = auth.uid() AND status = 'Pending')
    WITH CHECK (requester_id = auth.uid() AND status = 'Pending');

-- Admins full access
CREATE POLICY car_bookings_admin_all ON public.car_bookings
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'));

-- Cars and assignment only visible to admins
CREATE POLICY cars_admin_all ON public.cars
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'));

CREATE POLICY car_assignment_admin_all ON public.car_assignment
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'));

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_car_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_car_bookings_updated_at ON public.car_bookings;
CREATE TRIGGER trg_car_bookings_updated_at
    BEFORE UPDATE ON public.car_bookings
    FOR EACH ROW EXECUTE FUNCTION public.update_car_bookings_updated_at();
