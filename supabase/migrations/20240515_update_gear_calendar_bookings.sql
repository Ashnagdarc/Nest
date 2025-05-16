-- Add request_id to gear_calendar_bookings table to link with gear_requests
ALTER TABLE gear_calendar_bookings
ADD COLUMN request_id UUID REFERENCES gear_requests(id);

-- Add index for request_id
CREATE INDEX IF NOT EXISTS idx_gear_calendar_bookings_request_id ON gear_calendar_bookings(request_id);

-- Create a trigger to update gear_requests status when booking is approved/rejected
CREATE OR REPLACE FUNCTION update_gear_request_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Approved' THEN
        UPDATE gear_requests
        SET status = 'Pending Checkout',
            updated_at = NOW()
        WHERE id = NEW.request_id;
    ELSIF NEW.status = 'Rejected' THEN
        UPDATE gear_requests
        SET status = 'Rejected',
            updated_at = NOW()
        WHERE id = NEW.request_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gear_calendar_bookings_status_update
    AFTER UPDATE OF status ON gear_calendar_bookings
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_gear_request_status();

-- Create view to show all relevant booking information
CREATE OR REPLACE VIEW gear_calendar_bookings_with_profiles AS
SELECT 
    b.*,
    g.name as gear_name,
    g.category as gear_category,
    u.email as user_email,
    p.full_name as user_full_name,
    p.role as user_role,
    ap.full_name as approver_full_name
FROM 
    gear_calendar_bookings b
    LEFT JOIN gears g ON b.gear_id = g.id
    LEFT JOIN auth.users u ON b.user_id = u.id
    LEFT JOIN profiles p ON b.user_id = p.id
    LEFT JOIN profiles ap ON b.approved_by = ap.id;
