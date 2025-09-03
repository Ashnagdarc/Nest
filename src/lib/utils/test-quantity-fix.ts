import { createSupabaseServerClient } from '@/lib/supabase/server';
import { emergencyFixGearQuantities, validateGearQuantities } from './fix-gear-quantities';

/**
 * Test script to verify the quantity fix functionality
 * This can be run from the admin panel or as a standalone script
 */
export async function testQuantityFix(): Promise<{
    beforeValidation: any;
    afterFix: any;
    afterValidation: any;
    success: boolean;
}> {
    try {
        console.log('🧪 Starting quantity fix test...');

        // Step 1: Validate before fix
        console.log('📊 Validating quantities before fix...');
        const beforeValidation = await validateGearQuantities();
        console.log('Before fix:', beforeValidation);

        // Step 2: Run the fix if there are issues
        let afterFix = null;
        if (beforeValidation.invalid > 0) {
            console.log('🔧 Running emergency fix...');
            afterFix = await emergencyFixGearQuantities();
            console.log('Fix result:', afterFix);
        } else {
            console.log('✅ No issues found, skipping fix');
            afterFix = { success: true, fixed: 0, errors: [] };
        }

        // Step 3: Validate after fix
        console.log('📊 Validating quantities after fix...');
        const afterValidation = await validateGearQuantities();
        console.log('After fix:', afterValidation);

        // Step 4: Check if fix was successful
        const success = afterValidation.invalid === 0;

        console.log(`🧪 Test completed. Success: ${success}`);
        if (success) {
            console.log('✅ All gear quantities are now consistent!');
        } else {
            console.log('❌ Some issues remain after fix');
        }

        return {
            beforeValidation,
            afterFix,
            afterValidation,
            success
        };

    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
}

/**
 * Quick validation check for a specific gear
 */
export async function validateSpecificGear(gearName: string): Promise<any> {
    try {
        const supabase = await createSupabaseServerClient();

        const { data: gear, error } = await supabase
            .from('gears')
            .select('id, name, status, quantity, available_quantity, checked_out_to, current_request_id')
            .eq('name', gearName)
            .single();

        if (error) {
            throw error;
        }

        if (!gear) {
            return { error: 'Gear not found' };
        }

        // Analyze the gear's state
        const quantity = gear.quantity || 1;
        const availableQty = gear.available_quantity || 0;
        let hasIssue = false;
        let issueDescription = '';

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

        return {
            gear,
            hasIssue,
            issueDescription,
            expectedAvailableQuantity: hasIssue ?
                (gear.status === 'Available' && !gear.checked_out_to ? quantity : 0) :
                availableQty
        };

    } catch (error) {
        console.error('Error validating specific gear:', error);
        throw error;
    }
}

/**
 * Simulate a gear request to test the allocation logic
 */
export async function testGearAllocation(gearName: string, requestedQuantity: number): Promise<{
    success: boolean;
    message: string;
    availableUnits: number;
    requestedQuantity: number;
}> {
    try {
        const supabase = await createSupabaseServerClient();

        // Get available units for the gear
        const { data: availableUnits, error } = await supabase
            .from('gears')
            .select('id, name, status, quantity, available_quantity')
            .eq('name', gearName)
            .eq('status', 'Available');

        if (error) {
            throw error;
        }

        const availableCount = availableUnits?.length || 0;
        const success = availableCount >= requestedQuantity;

        return {
            success,
            message: success ?
                `✅ ${requestedQuantity} units available for ${gearName}` :
                `❌ Only ${availableCount} units available, need ${requestedQuantity}`,
            availableUnits: availableCount,
            requestedQuantity
        };

    } catch (error) {
        console.error('Error testing gear allocation:', error);
        throw error;
    }
}
