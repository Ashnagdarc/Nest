# Dashboard Count Discrepancy Fix

## Problem Description

The admin dashboard and user dashboard were showing different gear counts because items that were checked in but not yet approved by an admin were not being properly accounted for in the `available_quantity` field.

### Root Cause

1. **Admin Dashboard**: Uses `available_quantity` field directly from the gears table
2. **User Dashboard**: Filters gears by `status=Available` and sums their `available_quantity`
3. **Issue**: When items are checked in but not approved, they have status "Pending Check-in" but their `available_quantity` is not updated until admin approval

### Impact

- Users see incorrect available gear counts
- Admin and user dashboards show inconsistent data
- Items that are checked in but pending approval still appear as available

## Solution

### 1. Database Schema Updates

Added missing fields to the `gears` table:

- `quantity`: Total quantity of this gear (default: 1)
- `available_quantity`: Number of available units (calculated automatically)

### 2. Database Triggers

Created automatic triggers to maintain accurate `available_quantity`:

#### Gear Status Changes

```sql
-- Trigger: update_gear_available_quantity
-- Updates available_quantity when gear status changes
```

#### Check-in Status Changes

```sql
-- Trigger: update_gear_on_checkin_status_change
-- Updates gear when check-in is created or approved
```

#### Request Approval

```sql
-- Trigger: update_gear_available_quantity_on_request_approval
-- Updates available_quantity when request is approved
```

### 3. Utility Functions

Created utility functions to calculate and fix counts:

- `calculateAccurateDashboardCounts()`: Calculates accurate counts considering pending check-ins
- `updateGearAvailableQuantities()`: Updates all gear available_quantity values
- `createAvailableQuantityTrigger`: SQL for creating database triggers

### 4. API Endpoints

Created debug endpoints to diagnose and fix issues:

- `GET /api/debug/fix-dashboard-counts`: Get current counts and issues
- `POST /api/debug/fix-dashboard-counts`: Fix all gear available_quantity values

### 5. Debug Interface

Created a debug page at `/debug/dashboard-counts` to:

- View current dashboard counts
- See pending check-ins
- Identify gears with incorrect available_quantity
- Fix counts with one click

## Implementation Steps

### Step 1: Apply Database Migration

Run the migration to add the missing fields and triggers:

```bash
# Apply the migration
supabase db push
```

Or manually run the SQL from:

```
supabase/migrations/20241204_add_quantity_fields_to_gears.sql
```

### Step 2: Fix Current Data

Visit the debug page to fix existing data:

```
/debug/dashboard-counts
```

Click "Fix Counts" to update all gear `available_quantity` values.

### Step 3: Verify Fix

Check both admin and user dashboards to ensure counts match.

## Files Created/Modified

### New Files

- `src/lib/utils/fix-dashboard-counts.ts` - Utility functions
- `supabase/migrations/20241204_add_quantity_fields_to_gears.sql` - Database migration
- `src/app/api/debug/fix-dashboard-counts/route.ts` - API endpoints
- `src/app/debug/dashboard-counts/page.tsx` - Debug interface
- `DASHBOARD_COUNT_FIX.md` - This documentation

### Modified Files

- `src/components/admin/DashboardProvider.tsx` - Updated to use accurate counts

## Testing

### Before Fix

1. Check in some gear (don't approve)
2. Compare admin vs user dashboard counts
3. Note the discrepancy

### After Fix

1. Apply migration
2. Run fix from debug page
3. Verify counts match between dashboards
4. Check in more gear and verify counts update correctly

## Maintenance

The database triggers will automatically maintain accurate counts going forward. No manual intervention should be needed unless:

- New gear statuses are added
- Check-in workflow changes
- Database schema modifications

## Troubleshooting

### Counts Still Don't Match

1. Check for pending check-ins: `/debug/dashboard-counts`
2. Verify triggers are installed: Check database functions
3. Run manual fix: Click "Fix Counts" on debug page

### Triggers Not Working

1. Check database logs for errors
2. Verify function permissions
3. Re-run migration if needed

### Performance Issues

1. Monitor trigger execution time
2. Consider adding indexes on frequently queried columns
3. Optimize queries if needed

## Future Improvements

1. **Real-time Updates**: Use Supabase real-time subscriptions for live count updates
2. **Caching**: Implement Redis caching for frequently accessed counts
3. **Audit Trail**: Add logging for count changes
4. **Notifications**: Alert admins when counts are significantly off
