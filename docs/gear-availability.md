# Gear Availability Management

## Overview

This document explains how gear availability is managed in the Nest application, specifically focusing on the relationship between calendar bookings, gear status, and available quantities.

## Key Components

### Database Schema

Gear items have several key fields that track their availability:

- `status`: The current status of the gear (e.g., "Available", "Checked Out", "Partially Checked Out")
- `quantity`: The total quantity of this gear item
- `available_quantity`: The number of units currently available for checkout
- `checked_out_to`: The user ID of the person who has checked out the gear
- `current_request_id`: The ID of the current active request for this gear
- `due_date`: When the gear is due to be returned

### Database Triggers

Several database triggers ensure that gear availability is properly updated:

1. `trigger_update_gear_available_quantity`: Updates the `available_quantity` field when the gear status changes
2. `trigger_update_gear_on_checkin_status_change`: Updates gear status when a check-in is processed
3. `trigger_update_gear_available_quantity_on_request_approval`: Updates gear status when a request is approved
4. `trigger_update_gear_on_calendar_booking_approval`: Updates gear status when a calendar booking is approved

### UI Components

The `GearAvailabilityBadge` component displays the current availability of a gear item:

```tsx
import { GearAvailabilityBadge } from '@/components/ui/gear-availability-badge';

// Usage
<GearAvailabilityBadge 
  quantity={gear.quantity} 
  availableQuantity={gear.available_quantity} 
  status={gear.status} 
/>
```

This component will display "X of Y available" where:

- X is the available quantity
- Y is the total quantity

The badge color will change based on availability:

- Green: All units available
- Yellow/Orange: Some units available
- Red: No units available

## Workflow

### Calendar Booking Approval

When an admin approves a calendar booking:

1. The booking status is updated to "Approved"
2. A gear request is created with status "Approved"
3. The gear's status is updated to "Checked Out" or "Partially Checked Out"
4. The gear's `available_quantity` is decreased by 1
5. The gear's `checked_out_to` is set to the user who made the booking
6. The gear's `current_request_id` is set to the request ID
7. The gear's `due_date` is set to the booking end date

### Check-in Process

When a user checks in gear:

1. The gear's status is updated to "Available" (or "Needs Repair" if damaged)
2. The gear's `available_quantity` is increased by 1
3. The gear's `checked_out_to` is set to NULL
4. The gear's `current_request_id` is set to NULL

## Troubleshooting

If gear availability is not displaying correctly:

1. Check the gear's `status` and `available_quantity` in the database
2. Verify that the database triggers are working correctly
3. Run the fix script in `supabase/migrations/20240608_fix_calendar_booking_quantity.sql` to correct any inconsistencies

## Implementation Notes

The "X of Y available" display is implemented using a combination of database fields and UI components. The database ensures that the `available_quantity` field is always up-to-date, and the UI components display this information in a user-friendly way.

When a calendar booking is approved, the gear's `available_quantity` is decreased by 1, and the gear's status is updated to "Checked Out" if there are no more available units, or "Partially Checked Out" if there are still some units available.
