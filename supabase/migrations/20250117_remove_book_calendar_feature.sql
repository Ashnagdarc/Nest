-- Migration to completely remove the book calendar feature
-- This removes all tables, functions, views, and triggers related to calendar bookings

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_update_gear_on_calendar_booking_approval ON gear_calendar_bookings;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_gear_reservation(UUID[], UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT);
DROP FUNCTION IF EXISTS public.check_gear_availability(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS public.check_gear_availability_simple(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS public.get_calendar_bookings_with_profiles(TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID);
DROP FUNCTION IF EXISTS public.complete_expired_calendar_bookings();
DROP FUNCTION IF EXISTS public.update_gear_on_calendar_booking_approval();

-- Drop views
DROP VIEW IF EXISTS public.gear_calendar_bookings_with_profiles;

-- Drop the main table (this will also drop all associated policies)
DROP TABLE IF EXISTS public.gear_calendar_bookings CASCADE;

-- Clean up any remaining references in other tables
-- Remove calendar booking related columns from gears table if they exist
DO $$
BEGIN
    -- Check if current_request_id column exists and remove it if it's only used for calendar bookings
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gears' 
        AND column_name = 'current_request_id'
    ) THEN
        -- Only drop if it's not used by regular gear requests
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'gear_requests' 
            AND column_name = 'id'
        ) THEN
            ALTER TABLE public.gears DROP COLUMN IF EXISTS current_request_id;
        END IF;
    END IF;
END $$;

-- Add comment for audit trail
COMMENT ON SCHEMA public IS 'Book calendar feature completely removed - all related tables, functions, and views deleted (2025-01-17)';

-- Verify cleanup
SELECT 'Book calendar feature removal completed successfully' as status;

