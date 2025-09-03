import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Emergency fix for gear quantity issues
 * This script corrects available_quantity values that are incorrectly set to 0
 * when gears should actually be available
 */
export async function emergencyFixGearQuantities(): Promise<{
    success: boolean;
    fixed: number;
    errors: string[];
}> {
    const supabase = await createSupabaseServerClient();
    const errors: string[] = [];
    let fixed = 0;

    try {
        console.log('Starting emergency gear quantity fix...');

        // Get all gears with their current status and quantities
        const { data: gears, error: gearsError } = await supabase
            .from('gears')
            .select('id, name, status, quantity, available_quantity, checked_out_to, current_request_id');

        if (gearsError) {
            throw new Error(`Failed to fetch gears: ${gearsError.message}`);
        }

        if (!gears || gears.length === 0) {
            return { success: true, fixed: 0, errors: [] };
        }

        console.log(`Found ${gears.length} gears to check...`);

        // Get all pending check-ins to understand which gears are truly unavailable
        const { data: pendingCheckins, error: checkinsError } = await supabase
            .from('checkins')
            .select('gear_id, status')
            .eq('status', 'Pending Admin Approval');

        if (checkinsError) {
            console.warn('Warning: Could not fetch pending check-ins:', checkinsError.message);
        }

        const pendingCheckinGearIds = new Set(
            pendingCheckins?.map(checkin => checkin.gear_id) || []
        );

        // Process each gear
        for (const gear of gears) {
            try {
                const quantity = gear.quantity || 1;
                const hasPendingCheckin = pendingCheckinGearIds.has(gear.id);
                const isCurrentlyCheckedOut = gear.checked_out_to && gear.current_request_id;

                let correctAvailableQuantity = 0;

                // Determine the correct available quantity based on current state
                switch (gear.status) {
                    case 'Available':
                        if (!hasPendingCheckin && !isCurrentlyCheckedOut) {
                            correctAvailableQuantity = quantity;
                        }
                        break;

                    case 'Checked Out':
                        correctAvailableQuantity = 0;
                        break;

                    case 'Under Repair':
                    case 'Needs Repair':
                    case 'Retired':
                    case 'Lost':
                        correctAvailableQuantity = 0;
                        break;

                    case 'Pending Check-in':
                        correctAvailableQuantity = 0;
                        break;

                    default:
                        // For any other status, treat as available unless it has a pending check-in or is checked out
                        if (!hasPendingCheckin && !isCurrentlyCheckedOut) {
                            correctAvailableQuantity = quantity;
                        }
                }

                // Update if the available_quantity is incorrect
                if (gear.available_quantity !== correctAvailableQuantity) {
                    const { error: updateError } = await supabase
                        .from('gears')
                        .update({
                            available_quantity: correctAvailableQuantity,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', gear.id);

                    if (updateError) {
                        errors.push(`Failed to update gear ${gear.id} (${gear.name}): ${updateError.message}`);
                    } else {
                        fixed++;
                        console.log(`Fixed gear ${gear.name}: available_quantity ${gear.available_quantity} → ${correctAvailableQuantity}`);
                    }
                }
            } catch (gearError) {
                const errorMsg = `Error processing gear ${gear.id}: ${gearError instanceof Error ? gearError.message : 'Unknown error'}`;
                errors.push(errorMsg);
                console.error(errorMsg);
            }
        }

        console.log(`Emergency fix completed. Fixed ${fixed} gears.`);
        return { success: true, fixed, errors };

    } catch (error) {
        const errorMsg = `Emergency fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
        return { success: false, fixed, errors };
    }
}

/**
 * Validate gear quantity consistency
 * This function checks if the database state is consistent
 */
export async function validateGearQuantities(): Promise<{
    valid: number;
    invalid: number;
    issues: Array<{
        gearId: string;
        name: string;
        issue: string;
        currentState: any;
    }>;
}> {
    const supabase = await createSupabaseServerClient();
    const issues: Array<{
        gearId: string;
        name: string;
        issue: string;
        currentState: any;
    }> = [];
    let valid = 0;
    let invalid = 0;

    try {
        const { data: gears, error: gearsError } = await supabase
            .from('gears')
            .select('id, name, status, quantity, available_quantity, checked_out_to, current_request_id');

        if (gearsError) {
            throw gearsError;
        }

        for (const gear of gears || []) {
            const quantity = gear.quantity || 1;
            const availableQty = gear.available_quantity || 0;
            let hasIssue = false;
            let issueDescription = '';

            // Check for common issues
            if (gear.status === 'Available' && availableQty === 0 && !gear.checked_out_to) {
                hasIssue = true;
                issueDescription = 'Available gear has 0 available_quantity but is not checked out';
            } else if (gear.status === 'Checked Out' && availableQty > 0) {
                hasIssue = true;
                issueDescription = 'Checked out gear has available_quantity > 0';
            } else if (availableQty > quantity) {
                hasIssue = true;
                issueDescription = 'available_quantity exceeds total quantity';
            } else if (gear.status === 'Available' && availableQty !== quantity && !gear.checked_out_to) {
                hasIssue = true;
                issueDescription = 'Available gear available_quantity does not match total quantity';
            }

            if (hasIssue) {
                invalid++;
                issues.push({
                    gearId: gear.id,
                    name: gear.name,
                    issue: issueDescription,
                    currentState: gear
                });
            } else {
                valid++;
            }
        }

        return { valid, invalid, issues };
    } catch (error) {
        console.error('Validation failed:', error);
        throw error;
    }
}

/**
 * Create a comprehensive database migration to fix quantity issues
 */
export const createQuantityFixMigration = `
-- Emergency fix for gear quantity issues
-- This migration corrects available_quantity values and ensures consistency

-- First, let's identify and log problematic gears
CREATE TEMP TABLE problematic_gears AS
SELECT 
  id,
  name,
  status,
  quantity,
  available_quantity,
  checked_out_to,
  current_request_id
FROM gears 
WHERE 
  (status = 'Available' AND available_quantity = 0 AND checked_out_to IS NULL)
  OR (status = 'Checked Out' AND available_quantity > 0)
  OR (available_quantity > COALESCE(quantity, 1))
  OR (status = 'Available' AND available_quantity != COALESCE(quantity, 1) AND checked_out_to IS NULL);

-- Log problematic gears for review
INSERT INTO request_status_history (request_id, status, changed_at, note)
SELECT 
  gen_random_uuid()::text,
  'SYSTEM_LOG',
  NOW(),
  'Problematic gear detected: ' || name || ' - ' || 
  CASE 
    WHEN status = 'Available' AND available_quantity = 0 AND checked_out_to IS NULL 
    THEN 'Available gear has 0 available_quantity'
    WHEN status = 'Checked Out' AND available_quantity > 0 
    THEN 'Checked out gear has available_quantity > 0'
    WHEN available_quantity > COALESCE(quantity, 1) 
    THEN 'available_quantity exceeds total quantity'
    ELSE 'Unknown issue'
  END
FROM problematic_gears;

-- Fix available_quantity for Available gears that should have correct values
UPDATE gears 
SET 
  available_quantity = CASE 
    WHEN status = 'Available' AND checked_out_to IS NULL THEN COALESCE(quantity, 1)
    WHEN status = 'Checked Out' THEN 0
    WHEN status IN ('Under Repair', 'Needs Repair', 'Retired', 'Lost') THEN 0
    ELSE available_quantity
  END,
  updated_at = NOW()
WHERE 
  (status = 'Available' AND available_quantity = 0 AND checked_out_to IS NULL)
  OR (status = 'Checked Out' AND available_quantity > 0)
  OR (status IN ('Under Repair', 'Needs Repair', 'Retired', 'Lost') AND available_quantity > 0);

-- Clean up temporary table
DROP TABLE problematic_gears;
`;
