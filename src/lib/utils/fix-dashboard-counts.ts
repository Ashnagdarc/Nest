/**
 * Dashboard Count Fixes
 * 
 * Fixes discrepancies between admin and user dashboard gear counts
 * by properly handling items that are checked in but not yet approved.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface DashboardCounts {
    totalEquipment: number;
    availableEquipment: number;
    checkedOutEquipment: number;
    underRepairEquipment: number;
    pendingCheckinEquipment: number;
}

/**
 * Calculate accurate dashboard counts considering pending check-ins
 * This fixes the discrepancy between admin and user dashboards
 */
export async function calculateAccurateDashboardCounts(): Promise<DashboardCounts> {
    const supabase = await createSupabaseServerClient();

    try {
        // Get all gears with their current status
        const { data: gears, error: gearsError } = await supabase
            .from('gears')
            .select('id, name, status, quantity, available_quantity, checked_out_to');

        if (gearsError) {
            console.error('Error fetching gears for count calculation:', gearsError);
            throw gearsError;
        }

        // Get pending check-ins to identify gears that are checked in but not approved
        const { data: pendingCheckins, error: checkinsError } = await supabase
            .from('checkins')
            .select('gear_id, status')
            .eq('status', 'Pending Admin Approval');

        if (checkinsError) {
            console.error('Error fetching pending check-ins:', checkinsError);
            throw checkinsError;
        }

        // Create a set of gear IDs that have pending check-ins
        const pendingCheckinGearIds = new Set(
            pendingCheckins?.map(checkin => checkin.gear_id) || []
        );

        let totalEquipment = 0;
        let availableEquipment = 0;
        let checkedOutEquipment = 0;
        let underRepairEquipment = 0;
        let pendingCheckinEquipment = 0;

        gears?.forEach(gear => {
            const quantity = gear.quantity || 1;
            totalEquipment += quantity;

            // Check if this gear has a pending check-in
            const hasPendingCheckin = pendingCheckinGearIds.has(gear.id);

            switch (gear.status) {
                case 'Available':
                    if (hasPendingCheckin) {
                        // Gear is checked in but not approved - should not count as available
                        pendingCheckinEquipment += quantity;
                    } else {
                        // Gear is truly available
                        availableEquipment += gear.available_quantity || quantity;
                    }
                    break;

                case 'Checked Out':
                    checkedOutEquipment += quantity;
                    break;

                case 'Under Repair':
                case 'Needs Repair':
                    underRepairEquipment += quantity;
                    break;

                case 'Pending Check-in':
                    // Gear is checked in but not approved
                    pendingCheckinEquipment += quantity;
                    break;

                case 'Retired':
                case 'Lost':
                    // These don't count towards available equipment
                    break;

                default:
                    // For any other status, treat as available unless it has a pending check-in
                    if (hasPendingCheckin) {
                        pendingCheckinEquipment += quantity;
                    } else {
                        availableEquipment += gear.available_quantity || quantity;
                    }
            }
        });

        return {
            totalEquipment,
            availableEquipment,
            checkedOutEquipment,
            underRepairEquipment,
            pendingCheckinEquipment
        };

    } catch (error) {
        console.error('Error calculating dashboard counts:', error);
        throw error;
    }
}

/**
 * Update gear available_quantity to reflect accurate counts
 * This ensures consistency between admin and user dashboards
 */
export async function updateGearAvailableQuantities(): Promise<void> {
    const supabase = await createSupabaseServerClient();

    try {
        // Get all gears
        const { data: gears, error: gearsError } = await supabase
            .from('gears')
            .select('id, status, quantity, checked_out_to');

        if (gearsError) {
            console.error('Error fetching gears for quantity update:', gearsError);
            throw gearsError;
        }

        // Get pending check-ins
        const { data: pendingCheckins, error: checkinsError } = await supabase
            .from('checkins')
            .select('gear_id, status')
            .eq('status', 'Pending Admin Approval');

        if (checkinsError) {
            console.error('Error fetching pending check-ins:', checkinsError);
            throw checkinsError;
        }

        const pendingCheckinGearIds = new Set(
            pendingCheckins?.map(checkin => checkin.gear_id) || []
        );

        // Update each gear's available_quantity
        for (const gear of gears || []) {
            const quantity = gear.quantity || 1;
            const hasPendingCheckin = pendingCheckinGearIds.has(gear.id);

            let availableQuantity = 0;

            switch (gear.status) {
                case 'Available':
                    if (!hasPendingCheckin) {
                        availableQuantity = quantity;
                    }
                    break;

                case 'Checked Out':
                    availableQuantity = 0;
                    break;

                case 'Under Repair':
                case 'Needs Repair':
                case 'Retired':
                case 'Lost':
                    availableQuantity = 0;
                    break;

                case 'Pending Check-in':
                    availableQuantity = 0;
                    break;

                default:
                    // For any other status, treat as available unless it has a pending check-in
                    if (!hasPendingCheckin) {
                        availableQuantity = quantity;
                    }
            }

            // Update the gear's available_quantity if it's different
            if (gear.available_quantity !== availableQuantity) {
                const { error: updateError } = await supabase
                    .from('gears')
                    .update({ available_quantity: availableQuantity })
                    .eq('id', gear.id);

                if (updateError) {
                    console.error(`Error updating available_quantity for gear ${gear.id}:`, updateError);
                }
            }
        }

    } catch (error) {
        console.error('Error updating gear available quantities:', error);
        throw error;
    }
}

/**
 * Create a database function to automatically maintain accurate available_quantity
 * This should be called as part of a migration
 */
export const createAvailableQuantityTrigger = `
-- Function to automatically update available_quantity when gear status changes
CREATE OR REPLACE FUNCTION update_gear_available_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate available quantity based on status
  CASE NEW.status
    WHEN 'Available' THEN
      -- Check if there's a pending check-in for this gear
      IF EXISTS (
        SELECT 1 FROM checkins 
        WHERE gear_id = NEW.id 
        AND status = 'Pending Admin Approval'
      ) THEN
        NEW.available_quantity = 0;
      ELSE
        NEW.available_quantity = COALESCE(NEW.quantity, 1);
      END IF;
    
    WHEN 'Checked Out', 'Under Repair', 'Needs Repair', 'Retired', 'Lost', 'Pending Check-in' THEN
      NEW.available_quantity = 0;
    
    ELSE
      -- For any other status, check if there's a pending check-in
      IF EXISTS (
        SELECT 1 FROM checkins 
        WHERE gear_id = NEW.id 
        AND status = 'Pending Admin Approval'
      ) THEN
        NEW.available_quantity = 0;
      ELSE
        NEW.available_quantity = COALESCE(NEW.quantity, 1);
      END IF;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_gear_available_quantity ON gears;

-- Create trigger to automatically update available_quantity
CREATE TRIGGER trigger_update_gear_available_quantity
  BEFORE UPDATE ON gears
  FOR EACH ROW
  EXECUTE FUNCTION update_gear_available_quantity();

-- Function to update available_quantity when check-in status changes
CREATE OR REPLACE FUNCTION update_gear_on_checkin_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When a check-in is created with 'Pending Admin Approval' status
  IF NEW.status = 'Pending Admin Approval' AND (OLD.status IS NULL OR OLD.status != 'Pending Admin Approval') THEN
    -- Set gear available_quantity to 0
    UPDATE gears 
    SET available_quantity = 0,
        updated_at = NOW()
    WHERE id = NEW.gear_id;
  END IF;
  
  -- When a check-in is approved (status = 'Completed')
  IF NEW.status = 'Completed' AND OLD.status = 'Pending Admin Approval' THEN
    -- Update gear status and available_quantity
    UPDATE gears 
    SET status = CASE 
                  WHEN NEW.condition = 'Damaged' THEN 'Needs Repair' 
                  ELSE 'Available' 
                END,
        available_quantity = CASE 
                              WHEN NEW.condition = 'Damaged' THEN 0
                              ELSE COALESCE(quantity, 1)
                            END,
        checked_out_to = NULL,
        current_request_id = NULL,
        condition = NEW.condition,
        updated_at = NOW()
    WHERE id = NEW.gear_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_gear_on_checkin_status_change ON checkins;

-- Create trigger to automatically update gear when check-in status changes
CREATE TRIGGER trigger_update_gear_on_checkin_status_change
  AFTER INSERT OR UPDATE ON checkins
  FOR EACH ROW
  EXECUTE FUNCTION update_gear_on_checkin_status_change();
`;
