-- Migration to clean up all gear requests and bookings
-- This script will safely remove all gear requests, bookings, and related data
-- while resetting gear status to Available

-- Start a transaction to ensure all operations succeed or fail together
BEGIN;

-- 1. First, log the cleanup operation
INSERT INTO request_status_history (request_id, status, changed_at, note)
VALUES (
  'system_cleanup_' || now()::text,
  'SYSTEM_CLEANUP',
  NOW(),
  'Database cleanup: Removing all gear requests and bookings'
);

-- 2. Reset all gears to Available status
-- Store the number of updated gears for logging
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE gears
    SET 
      status = 'Available',
      available_quantity = quantity,
      checked_out_to = NULL,
      current_request_id = NULL,
      last_checkout_date = NULL,
      due_date = NULL,
      updated_at = NOW()
    WHERE status IN ('Checked Out', 'Partially Checked Out', 'Pending Check-in')
    RETURNING id
  )
  SELECT COUNT(*) INTO updated_count FROM updated;
  
  -- Log the number of gears reset
  INSERT INTO request_status_history (request_id, status, changed_at, note)
  VALUES (
    'system_cleanup_gears_' || now()::text,
    'SYSTEM_CLEANUP',
    NOW(),
    'Reset ' || updated_count || ' gears to Available status'
  );
END $$;

-- 3. Delete check-ins (deleting first to maintain referential integrity)
DELETE FROM checkins;

-- 4. Delete gear request gears (junction table)
DELETE FROM gear_request_gears;

-- 5. Delete gear requests
DELETE FROM gear_requests;

-- 6. Delete calendar bookings
DELETE FROM gear_calendar_bookings;

-- 7. Delete notifications related to gear requests and bookings
DELETE FROM notifications
WHERE type IN ('booking_approved', 'booking_rejected', 'reservation_reminder', 'reservation_due_reminder', 'overdue');

-- 8. Log completion of cleanup
INSERT INTO request_status_history (request_id, status, changed_at, note)
VALUES (
  'system_cleanup_complete_' || now()::text,
  'SYSTEM_CLEANUP',
  NOW(),
  'Database cleanup completed successfully'
);

-- Commit the transaction
COMMIT;
