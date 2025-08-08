import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        const supabase = await createSupabaseServerClient(true);

        console.log('Starting immediate check-in data fix...');

        // Step 1: Find and fix problematic gears
        const { data: problematicGears, error: fetchError } = await supabase
            .from('gears')
            .select('id, name, status, checked_out_to, due_date')
            .in('status', ['Available', 'Needs Repair'])
            .not('checked_out_to', 'is', null);

        if (fetchError) {
            console.error('Error fetching problematic gears:', fetchError);
            return NextResponse.json({
                error: 'Failed to fetch problematic gears',
                details: fetchError
            }, { status: 500 });
        }

        console.log(`Found ${problematicGears?.length || 0} problematic gears:`, problematicGears);

        // Step 2: Fix the problematic gears
        if (problematicGears && problematicGears.length > 0) {
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
                return NextResponse.json({
                    error: 'Failed to update problematic gears',
                    details: updateError
                }, { status: 500 });
            }

            console.log('Successfully cleaned up problematic gear data');
        }

        // Step 3: Clean up orphaned check-ins
        const { data: orphanedCheckins, error: checkinsError } = await supabase
            .from('checkins')
            .select('id, gear_id')
            .not('gear_id', 'in', `(SELECT id FROM gears)`);

        if (checkinsError) {
            console.error('Error fetching orphaned checkins:', checkinsError);
        } else if (orphanedCheckins && orphanedCheckins.length > 0) {
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

        // Step 4: Verify the fix
        const { data: remainingProblematicGears, error: verifyError } = await supabase
            .from('gears')
            .select('id, name, status, checked_out_to')
            .in('status', ['Available', 'Needs Repair'])
            .not('checked_out_to', 'is', null);

        if (verifyError) {
            console.error('Error verifying fix:', verifyError);
        }

        return NextResponse.json({
            success: true,
            message: 'Check-in data fix completed',
            results: {
                problematic_gears_fixed: problematicGears?.length || 0,
                orphaned_checkins_fixed: orphanedCheckins?.length || 0,
                remaining_problematic_gears: remainingProblematicGears?.length || 0
            },
            details: {
                fixed_gears: problematicGears,
                orphaned_checkins: orphanedCheckins,
                remaining_issues: remainingProblematicGears
            }
        });

    } catch (error) {
        console.error('Error in fix-checkin-data-now:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
