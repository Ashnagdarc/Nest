import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

type OrphanedCheckin = { id: string; gear_id: string };

function formatSupabaseError(error: unknown): string {
    if (!error || typeof error !== 'object') return String(error);
    const row = error as { message?: string; details?: string; hint?: string; code?: string };
    return row.message || row.details || row.hint || row.code || JSON.stringify(error);
}

function isMissingGearJoin(gear: unknown): boolean {
    if (!gear) return true;
    if (Array.isArray(gear)) return gear.length === 0;
    return false;
}

async function findOrphanedCheckins(supabase: SupabaseClient) {
    const { data, error } = await supabase
        .from('checkins')
        .select('id, gear_id, gears(id)');

    if (error) {
        return { orphaned: [] as OrphanedCheckin[], error };
    }

    const orphaned = (data || [])
        .filter((row) => isMissingGearJoin(row.gears))
        .map((row) => ({ id: String(row.id), gear_id: String(row.gear_id) }));

    return { orphaned, error: null };
}

/**
 * Utility function to fix check-in data inconsistencies
 * This can be run manually to clean up any data issues
 */
export async function fixCheckinDataInconsistencies() {
    const supabase = createClient();

    try {
        console.log('Starting check-in data cleanup...');

        const { data: inconsistentGears, error: gearsError } = await supabase
            .from('gears')
            .select('id, name, status, checked_out_to')
            .in('status', ['Available', 'Needs Repair', 'Under Repair'])
            .not('checked_out_to', 'is', null);

        if (gearsError) {
            console.error('Error fetching inconsistent gears:', formatSupabaseError(gearsError));
            return;
        }

        if (inconsistentGears && inconsistentGears.length > 0) {
            console.log(`Found ${inconsistentGears.length} gears with inconsistent status/checked_out_to`);

            const { error: updateError } = await supabase
                .from('gears')
                .update({
                    checked_out_to: null,
                    current_request_id: null,
                    updated_at: new Date().toISOString(),
                })
                .in('id', inconsistentGears.map((gear) => gear.id));

            if (updateError) {
                console.error('Error updating inconsistent gears:', formatSupabaseError(updateError));
            } else {
                console.log('Successfully cleaned up inconsistent gear data');
            }
        }

        const { orphaned, error: checkinsError } = await findOrphanedCheckins(supabase);

        if (checkinsError) {
            console.error('Error fetching orphaned checkins:', formatSupabaseError(checkinsError));
            return;
        }

        if (orphaned.length > 0) {
            console.log(`Found ${orphaned.length} orphaned check-ins`);

            const { error: deleteError } = await supabase
                .from('checkins')
                .delete()
                .in('id', orphaned.map((row) => row.id));

            if (deleteError) {
                console.error('Error deleting orphaned checkins:', formatSupabaseError(deleteError));
            } else {
                console.log('Successfully cleaned up orphaned check-ins');
            }
        }

        console.log('Check-in data cleanup completed');
    } catch (error) {
        console.error('Error during check-in data cleanup:', formatSupabaseError(error));
    }
}

/**
 * Utility function to validate check-in data integrity
 */
export async function validateCheckinDataIntegrity(): Promise<string[]> {
    const supabase = createClient();
    const messages: string[] = [];

    try {
        console.log('Validating check-in data integrity...');
        messages.push('Validating check-in data integrity...');

        const { data: inconsistentGears, error: gearsError } = await supabase
            .from('gears')
            .select('id, name, status, checked_out_to')
            .in('status', ['Available', 'Needs Repair', 'Under Repair'])
            .not('checked_out_to', 'is', null);

        if (gearsError) {
            const message = `Error checking gear consistency: ${formatSupabaseError(gearsError)}`;
            console.error(message);
            messages.push(`❌ ${message}`);
            return messages;
        }

        const { orphaned, error: checkinsError } = await findOrphanedCheckins(supabase);

        if (checkinsError) {
            const message = `Error checking orphaned checkins: ${formatSupabaseError(checkinsError)}`;
            console.error(message);
            messages.push(`❌ ${message}`);
            return messages;
        }

        const issues: string[] = [];

        if (inconsistentGears && inconsistentGears.length > 0) {
            issues.push(`${inconsistentGears.length} gears have inconsistent status/checked_out_to`);
        }

        if (orphaned.length > 0) {
            issues.push(`${orphaned.length} check-ins reference non-existent gears`);
        }

        if (issues.length === 0) {
            const ok = '✅ All check-in data is consistent';
            console.log(ok);
            messages.push(ok);
        } else {
            const header = '❌ Found data integrity issues:';
            console.log(header);
            messages.push(header);
            issues.forEach((issue) => {
                const line = `  - ${issue}`;
                console.log(line);
                messages.push(line);
            });
        }

        return messages;
    } catch (error) {
        const message = `Error during data integrity validation: ${formatSupabaseError(error)}`;
        console.error(message);
        messages.push(`❌ ${message}`);
        return messages;
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

        const { data: problematicGears, error: fetchError } = await supabase
            .from('gears')
            .select('id, name, status, checked_out_to, due_date')
            .in('status', ['Available', 'Needs Repair', 'Under Repair'])
            .not('checked_out_to', 'is', null);

        if (fetchError) {
            console.error('Error fetching problematic gears:', formatSupabaseError(fetchError));
            return;
        }

        if (problematicGears && problematicGears.length > 0) {
            console.log(`Found ${problematicGears.length} problematic gears:`, problematicGears);

            const { error: updateError } = await supabase
                .from('gears')
                .update({
                    checked_out_to: null,
                    current_request_id: null,
                    updated_at: new Date().toISOString(),
                })
                .in('id', problematicGears.map((gear) => gear.id));

            if (updateError) {
                console.error('Error updating problematic gears:', formatSupabaseError(updateError));
            } else {
                console.log('Successfully cleaned up problematic gear data');
            }
        } else {
            console.log('No problematic gears found');
        }

        const { data: futureGears, error: futureError } = await supabase
            .from('gears')
            .select('id, name, status, checked_out_to, due_date')
            .gte('due_date', '2025-01-01')
            .not('checked_out_to', 'is', null);

        if (futureError) {
            console.error('Error fetching future gears:', formatSupabaseError(futureError));
        } else if (futureGears && futureGears.length > 0) {
            console.log(`Found ${futureGears.length} gears with future due dates:`, futureGears);
        }
    } catch (error) {
        console.error('Error during specific gear cleanup:', formatSupabaseError(error));
    }
}
