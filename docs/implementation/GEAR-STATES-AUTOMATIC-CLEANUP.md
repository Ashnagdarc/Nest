# Automatic Gear States Cleanup Solution

## Problem

The database was accumulating stale `gear_states` records from completed requests. When a `gear_request` was marked as "Completed", the associated `gear_states` entries were not being cleaned up automatically. This caused:

- Incorrect availability counts (showing items as checked out when they were returned)
- Multiple active `gear_states` for the same gear
- UI showing wrong availability status (e.g., "Checked Out" instead of "Partially Available")

## Root Cause

The application had no automatic cleanup mechanism. When requests were completed:

- `gear_states` records remained in the database pointing to completed requests
- Gear availability calculations included these stale states
- Manual database cleanup was required to fix inconsistencies

## Solution Implemented

Created a database trigger that automatically runs when a `gear_request` status changes to "Completed".

### Migration Details

**File**: `add_automatic_gear_states_cleanup`
**Date**: 2025-11-27

### Components

#### 1. Trigger Function: `cleanup_gear_states_on_request_completion()`

This function executes automatically when a request is marked as Completed:

**Actions Performed:**

1. **Deletes stale gear_states**: Removes all `gear_states` records associated with the completed request
2. **Updates gear status intelligently**:
   - Sets to `Partially Available` if the gear has other active checkouts
   - Sets to `Available` if no other active checkouts exist
   - Maintains current status if there are issues
3. **Cleans up gear metadata**:
   - Clears `checked_out_to` if no active checkouts remain
   - Clears `current_request_id` if no active checkouts remain
   - Clears `due_date` if no active checkouts remain

#### 2. Database Trigger: `trigger_cleanup_gear_states_on_completion`

- **Event**: AFTER UPDATE on `gear_requests` table
- **Condition**: Only fires when `NEW.status = 'Completed'`
- **Action**: Executes `cleanup_gear_states_on_request_completion()`

### How It Works

```sql
-- When this happens:
UPDATE gear_requests
SET status = 'Completed'
WHERE id = 'some-request-id';

-- The trigger automatically:
-- 1. Deletes all gear_states with current_request_id = 'some-request-id'
-- 2. Updates affected gears to correct status
-- 3. Clears checkout metadata if appropriate
```

### Example Scenario

**Before trigger:**

- User completes a request for Canon R5C
- `gear_states` table still has "Checked Out" record
- `gears` table shows available_quantity = 0
- UI shows "Checked Out" even though returned

**After trigger (automatic):**

- Request marked as "Completed"
- Trigger deletes the stale `gear_states` record
- Trigger updates gear status to "Available" or "Partially Available"
- UI immediately shows correct availability

### Benefits

1. **Automatic**: No manual intervention needed
2. **Immediate**: Updates happen in the same transaction
3. **Intelligent**: Handles multi-unit gear correctly (Partially Available vs Available)
4. **Safe**: Only runs when status changes TO "Completed"
5. **Logged**: Includes NOTICE messages for debugging

### Testing

To verify the trigger is working:

```sql
-- Check trigger exists
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_cleanup_gear_states_on_completion';

-- Mark a request as completed and check cleanup
UPDATE gear_requests SET status = 'Completed' WHERE id = 'test-id';

-- Verify no gear_states remain for that request
SELECT * FROM gear_states WHERE current_request_id = 'test-id';
-- Should return 0 rows
```

### Maintenance

The trigger is now part of the database schema and will:

- Automatically handle all future request completions
- Work with check-in flows
- Work with manual admin completions
- Work with any code that updates request status to "Completed"

### Related Files

- **Migration**: `supabase/migrations/*_add_automatic_gear_states_cleanup.sql`
- **Trigger Function**: `cleanup_gear_states_on_request_completion()`
- **Previous Issues**: See manual cleanup in conversation history (2025-11-27)

### Historical Context

Before this solution, we manually cleaned up:

- 44 stale gear_states from overdue items (2025-11-27)
- 13 stale gear_states from comprehensive audit (2025-11-27)
- Multiple instances of incorrect availability (Canon R5C, EF 50mm, etc.)

This trigger prevents all future occurrences of this issue.
