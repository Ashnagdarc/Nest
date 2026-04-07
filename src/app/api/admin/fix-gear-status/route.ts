import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { emergencyFixGearQuantities, fixGearStatusAvailabilitySync, validateGearQuantities } from '@/lib/utils/fix-gear-quantities';

/**
 * POST /api/admin/fix-gear-status
 * 
 * Fixes gear status/availability sync issues where:
 * - Status is 'Partially Available' but available_quantity = quantity
 * - Status is 'Checked Out' but all items are returned
 * - Status is 'Pending Check-in' but no pending check-ins exist
 * 
 * Requires admin role.
 */
export async function POST() {
    try {
        const supabase = await createSupabaseServerClient();
        
        // Check authentication and admin role
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        
        if (profile?.role !== 'Admin') {
            return NextResponse.json(
                { success: false, error: 'Admin access required' },
                { status: 403 }
            );
        }

        console.log('[Fix Gear Status] Starting fix by admin:', user.id);

        // Run both fix functions
        const quantitiesResult = await emergencyFixGearQuantities();
        const statusResult = await fixGearStatusAvailabilitySync();
        
        // Validate after fixes
        const validationResult = await validateGearQuantities();

        const totalFixed = quantitiesResult.fixed + statusResult.fixed;
        const allErrors = [...quantitiesResult.errors, ...statusResult.errors];

        console.log(`[Fix Gear Status] Completed. Fixed ${totalFixed} gears. Remaining issues: ${validationResult.invalid}`);

        return NextResponse.json({
            success: true,
            results: {
                quantitiesFix: {
                    fixed: quantitiesResult.fixed,
                    errors: quantitiesResult.errors
                },
                statusSyncFix: {
                    fixed: statusResult.fixed,
                    errors: statusResult.errors
                },
                validation: {
                    valid: validationResult.valid,
                    invalid: validationResult.invalid,
                    issues: validationResult.issues
                }
            },
            summary: {
                totalFixed,
                totalErrors: allErrors.length,
                remainingIssues: validationResult.invalid
            }
        });

    } catch (error) {
        console.error('[Fix Gear Status] Error:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/fix-gear-status
 * 
 * Returns validation report of gear status/availability issues without fixing.
 * Requires admin role.
 */
export async function GET() {
    try {
        const supabase = await createSupabaseServerClient();
        
        // Check authentication and admin role
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        
        if (profile?.role !== 'Admin') {
            return NextResponse.json(
                { success: false, error: 'Admin access required' },
                { status: 403 }
            );
        }

        // Run validation only
        const validationResult = await validateGearQuantities();

        return NextResponse.json({
            success: true,
            validation: {
                valid: validationResult.valid,
                invalid: validationResult.invalid,
                issues: validationResult.issues
            }
        });

    } catch (error) {
        console.error('[Fix Gear Status] Validation error:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            },
            { status: 500 }
        );
    }
}
