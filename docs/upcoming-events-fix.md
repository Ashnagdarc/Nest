# Upcoming Events Fix

## Issue Description

The dashboard was showing status change events as "overdue" in the Upcoming Events section. Specifically, when a gear item like the Toyota Camry had its status changed (e.g., during a calendar booking approval), this status change was being incorrectly displayed as an overdue maintenance event.

## Root Cause

1. When a calendar booking is approved, it creates a record in the `gear_maintenance` table with:
   - `maintenance_type = 'Status Change'`
   - `performed_at = now()` (the time when the booking was approved)

2. The `useUpcomingEvents` hook was fetching all maintenance events for the user, including status change events.

3. Since status change events have a `performed_at` date in the past (when the booking was approved), they were being marked as "overdue" by this logic:

   ```typescript
   if (eventDate < now) {
       status = "overdue";
   }
   ```

4. This caused status change events to appear as "overdue" maintenance events in the Upcoming Events section.

## Solution

The solution was to exclude status change events from the maintenance events list:

1. Modified the database query to exclude status change events:

   ```typescript
   const { data, error } = await supabase
       .from('gear_maintenance')
       .select('id, gear_id, performed_at, maintenance_type, performed_by, status')
       .eq('performed_by', session.user.id)
       .not('maintenance_type', 'eq', 'Status Change'); // Exclude status change events
   ```

2. Added an additional safeguard in the event processing logic:

   ```typescript
   const maintenanceEventsFormatted = maintenanceEvents
       .filter((event: MaintenanceEvent) => event.maintenance_type !== 'Status Change')
       .map((event: MaintenanceEvent) => {
           // Process event...
       });
   ```

3. Added comments to explain why status change events should be excluded.

## Benefits

1. **Cleaner Dashboard**: Users will only see actual maintenance events in the Upcoming Events section.
2. **Reduced Confusion**: Status changes won't appear as overdue maintenance tasks.
3. **Maintained Functionality**: All other features of the Upcoming Events section continue to work as expected.

## Implementation Details

The fix was implemented in the `useUpcomingEvents` hook (`src/hooks/user-dashboard/use-upcoming-events.ts`), which is used by both the `UpcomingEvents` and `OptimizedUpcomingEvents` components.

No changes were required to the database schema or other parts of the application, as this was purely a filtering issue in the data retrieval and processing logic.
