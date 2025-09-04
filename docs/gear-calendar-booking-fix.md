# Gear Calendar Booking Fix

## Issue Description

There was an issue with gear calendar bookings not properly updating the gear status when approved by an admin. This caused two problems:

1. The gear was still showing as "Available" in the browse page, allowing double-booking
2. The gear was not appearing in the Check-in Gear page, making it impossible to check it back in

## Root Cause Analysis

After examining the database schema, API endpoints, and database triggers, we identified the following issues:

1. When a calendar booking was approved, it correctly created a gear request but didn't properly update the gear's status to "Checked Out" or "Partially Checked Out"
2. The `update_gear_available_quantity` trigger was interfering with the status update by resetting the available quantity based on the status
3. The gear status wasn't being properly synchronized with the `gear_states` table

## Solution

We implemented a solution that bypasses the problematic triggers by using a custom RPC function:

1. Created a new RPC function `update_gear_checkout_status` that:
   - Updates the gear status, checked_out_to, current_request_id, and available_quantity
   - Adds a record to the gear_states table to maintain history
   - Logs the status change in the gear_maintenance table

2. Modified the calendar booking approval endpoint to use this RPC function instead of directly updating the gear record

## Testing

The solution was tested by:

1. Creating a calendar booking for a Toyota Camry
2. Approving the booking
3. Verifying that the gear status was updated to "Partially Checked Out"
4. Verifying that the gear appeared in the Check-in Gear page
5. Verifying that the available quantity was correctly updated

## Implementation Details

### RPC Function

```sql
CREATE OR REPLACE FUNCTION update_gear_checkout_status(
    p_gear_id UUID,
    p_status TEXT,
    p_checked_out_to UUID,
    p_current_request_id UUID,
    p_last_checkout_date TIMESTAMPTZ,
    p_due_date TIMESTAMPTZ,
    p_available_quantity INTEGER
) RETURNS VOID AS $$
BEGIN
    -- Directly update the gear record without triggering the problematic triggers
    UPDATE gears
    SET 
        status = p_status,
        checked_out_to = p_checked_out_to,
        current_request_id = p_current_request_id,
        last_checkout_date = p_last_checkout_date,
        due_date = p_due_date,
        available_quantity = p_available_quantity,
        updated_at = NOW()
    WHERE id = p_gear_id;
    
    -- Also update the gear_states table to ensure consistency
    INSERT INTO gear_states (
        gear_id,
        status,
        available_quantity,
        checked_out_to,
        due_date,
        current_request_id,
        created_at,
        updated_at
    ) VALUES (
        p_gear_id,
        p_status,
        p_available_quantity,
        p_checked_out_to,
        p_due_date,
        p_current_request_id,
        NOW(),
        NOW()
    );
    
    -- Log the status change in the gear_maintenance table
    INSERT INTO gear_maintenance(
        gear_id,
        status,
        maintenance_type,
        description,
        performed_by,
        performed_at
    ) VALUES (
        p_gear_id,
        'Completed',
        'Status Change',
        'Status changed to ' || p_status || ' via calendar booking approval',
        p_checked_out_to,
        NOW()
    );
    
END;
$$ LANGUAGE plpgsql;
```

### API Endpoint Modification

```typescript
// In src/app/api/calendar/bookings/approve/route.ts

// Old code:
const { error: gearUpdateError } = await supabase
    .from('gears')
    .update({
        status: newStatus,
        checked_out_to: booking.user_id,
        current_request_id: gearRequest.id,
        last_checkout_date: new Date().toISOString(),
        due_date: booking.end_date,
        available_quantity: newAvailableQuantity,
        updated_at: new Date().toISOString()
    })
    .eq('id', booking.gear_id);

// New code:
const { error: gearUpdateError } = await supabase.rpc('update_gear_checkout_status', {
    p_gear_id: booking.gear_id,
    p_status: newStatus,
    p_checked_out_to: booking.user_id,
    p_current_request_id: gearRequest.id,
    p_last_checkout_date: new Date().toISOString(),
    p_due_date: booking.end_date,
    p_available_quantity: newAvailableQuantity
});
```
