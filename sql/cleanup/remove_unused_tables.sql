-- First, let's create a view to replace gear_calendar_bookings_with_profiles
CREATE OR REPLACE VIEW gear_calendar_bookings_with_profiles AS
SELECT 
    b.*,
    g.name as gear_name,
    p.full_name as user_full_name,
    p.email as user_email
FROM gear_calendar_bookings b
JOIN gears g ON b.gear_id = g.id
JOIN profiles p ON b.user_id = p.id;

-- Drop unused tables
-- First drop the backup table which has no dependencies
DROP TABLE IF EXISTS announcements_backup;

-- Drop admin_reports_data if it exists
DROP TABLE IF EXISTS admin_reports_data;

-- Drop the original table after we've created the view
DROP TABLE IF EXISTS gear_calendar_bookings_with_profiles;
