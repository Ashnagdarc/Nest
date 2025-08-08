import { createClient } from '@/lib/supabase/client';

/**
 * Utility function to fix check-in data inconsistencies
 * This can be run manually to clean up any data issues
 */
export async function fixCheckinDataInconsistencies() {
    const supabase = createClient();

    try {
        console.log('Starting check-in data cleanup...');

        // 1. Clean up gears that have checked_out_to set but status is Available/Needs Repair
        const { data: inconsistentGears, error: gearsError } = await supabase
            .from('gears')
            .select('id, name, status, checked_out_to')
            .in('status', ['Available', 'Needs Repair'])
            .not('checked_out_to', 'is', null);

        if (gearsError) {
            console.error('Error fetching inconsistent gears:', gearsError);
            return;
        }

        if (inconsistentGears && inconsistentGears.length > 0) {
            console.log(`Found ${inconsistentGears.length} gears with inconsistent status/checked_out_to`);

            const { error: updateError } = await supabase
                .from('gears')
                .update({
                    checked_out_to: null,
                    current_request_id: null,
                    updated_at: new Date().toISOString()
                })
                .in('status', ['Available', 'Needs Repair'])
                .not('checked_out_to', 'is', null);

            if (updateError) {
                console.error('Error updating inconsistent gears:', updateError);
            } else {
                console.log('Successfully cleaned up inconsistent gear data');
            }
        }

        // 2. Clean up checkins that reference non-existent gears
        const { data: orphanedCheckins, error: checkinsError } = await supabase
            .from('checkins')
            .select('id, gear_id')
            .not('gear_id', 'in', `(SELECT id FROM gears)`);

        if (checkinsError) {
            console.error('Error fetching orphaned checkins:', checkinsError);
            return;
        }

        if (orphanedCheckins && orphanedCheckins.length > 0) {
            console.log(`Found ${orphanedCheckins.length} orphaned check-ins`);

            const { error: deleteError } = await supabase
                .from('checkins')
                .delete()
                .not('gear_id', 'in', `(SELECT id FROM gears)`);

            if (deleteError) {
                console.error('Error deleting orphaned checkins:', deleteError);
            } else {
                console.log('Successfully cleaned up orphaned check-ins');
            }
        }

        console.log('Check-in data cleanup completed');

    } catch (error) {
        console.error('Error during check-in data cleanup:', error);
    }
}

/**
 * Utility function to validate check-in data integrity
 */
export async function validateCheckinDataIntegrity() {
    const supabase = createClient();

    try {
        console.log('Validating check-in data integrity...');

        // Check for gears with inconsistent status/checked_out_to
        const { data: inconsistentGears, error: gearsError } = await supabase
            .from('gears')
            .select('id, name, status, checked_out_to')
            .in('status', ['Available', 'Needs Repair'])
            .not('checked_out_to', 'is', null);

        if (gearsError) {
            console.error('Error checking gear consistency:', gearsError);
            return;
        }

        // Check for orphaned check-ins
        const { data: orphanedCheckins, error: checkinsError } = await supabase
            .from('checkins')
            .select('id, gear_id')
            .not('gear_id', 'in', `(SELECT id FROM gears)`);

        if (checkinsError) {
            console.error('Error checking orphaned checkins:', checkinsError);
            return;
        }

        const issues = [];

        if (inconsistentGears && inconsistentGears.length > 0) {
            issues.push(`${inconsistentGears.length} gears have inconsistent status/checked_out_to`);
        }

        if (orphanedCheckins && orphanedCheckins.length > 0) {
            issues.push(`${orphanedCheckins.length} check-ins reference non-existent gears`);
        }

        if (issues.length === 0) {
            console.log('✅ All check-in data is consistent');
        } else {
            console.log('❌ Found data integrity issues:');
            issues.forEach(issue => console.log(`  - ${issue}`));
        }

    } catch (error) {
        console.error('Error during data integrity validation:', error);
    }
}

/**
 * Utility function to fix specific gear data issues
 * This can be used to manually fix problematic gear records
 */
export async function fixSpecificGearIssues() {
    const supabase = createClient();

    try {
        console.log('Starting specific gear data cleanup...');

        // Find gears that have checked_out_to set but status is Available/Needs Repair
        const { data: problematicGears, error: fetchError } = await supabase
            .from('gears')
            .select('id, name, status, checked_out_to, due_date')
            .in('status', ['Available', 'Needs Repair'])
            .not('checked_out_to', 'is', null);

        if (fetchError) {
            console.error('Error fetching problematic gears:', fetchError);
            return;
        }

        if (problematicGears && problematicGears.length > 0) {
            console.log(`Found ${problematicGears.length} problematic gears:`, problematicGears);

            // Update these gears to clear checked_out_to
            const { error: updateError } = await supabase
                .from('gears')
                .update({
                    checked_out_to: null,
                    current_request_id: null,
                    updated_at: new Date().toISOString()
                })
                .in('status', ['Available', 'Needs Repair'])
                .not('checked_out_to', 'is', null);

            if (updateError) {
                console.error('Error updating problematic gears:', updateError);
            } else {
                console.log('Successfully cleaned up problematic gear data');
            }
        } else {
            console.log('No problematic gears found');
        }

        // Also check for gears with future due dates that might be test data
        const { data: futureGears, error: futureError } = await supabase
            .from('gears')
            .select('id, name, status, checked_out_to, due_date')
            .gte('due_date', '2025-01-01')
            .not('checked_out_to', 'is', null);

        if (futureError) {
            console.error('Error fetching future gears:', futureError);
        } else if (futureGears && futureGears.length > 0) {
            console.log(`Found ${futureGears.length} gears with future due dates:`, futureGears);
        }

    } catch (error) {
        console.error('Error during specific gear cleanup:', error);
    }
}
