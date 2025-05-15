-- Create the gear_calendar_bookings table
CREATE TABLE IF NOT EXISTS public.gear_calendar_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gear_id UUID REFERENCES public.gears(id) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending', -- Pending, Approved, Rejected
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    is_all_day BOOLEAN DEFAULT false,
    recurring_pattern TEXT, -- For future use with recurring bookings
    color TEXT -- Custom color for the booking
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gear_calendar_bookings_gear_id ON gear_calendar_bookings(gear_id);
CREATE INDEX IF NOT EXISTS idx_gear_calendar_bookings_user_id ON gear_calendar_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_gear_calendar_bookings_dates ON gear_calendar_bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_gear_calendar_bookings_status ON gear_calendar_bookings(status);

-- Enable Row Level Security
ALTER TABLE public.gear_calendar_bookings ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can view all bookings
CREATE POLICY "Users can view all bookings"
    ON gear_calendar_bookings
    FOR SELECT
    TO authenticated
    USING (true);

-- Users can create bookings
CREATE POLICY "Users can create bookings"
    ON gear_calendar_bookings
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own pending bookings
CREATE POLICY "Users can update their own pending bookings"
    ON gear_calendar_bookings
    FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid() 
        AND status = 'Pending'
    );

-- Admins have full access
CREATE POLICY "Admins have full access to bookings"
    ON gear_calendar_bookings
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'Admin'
        )
    );

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_gear_calendar_bookings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp updates
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON gear_calendar_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_gear_calendar_bookings_timestamp();

-- Create function to check for booking conflicts
CREATE OR REPLACE FUNCTION check_gear_booking_conflict(
    p_gear_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM gear_calendar_bookings
        WHERE gear_id = p_gear_id
        AND status IN ('Approved', 'Pending')
        AND id != COALESCE(p_booking_id, '00000000-0000-0000-0000-000000000000'::UUID)
        AND (
            (start_date, end_date) OVERLAPS (p_start_date, p_end_date)
        )
    );
END;
$$ LANGUAGE plpgsql; 