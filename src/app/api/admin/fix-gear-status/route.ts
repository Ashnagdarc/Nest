import { NextResponse } from 'next/server';
import { emergencyFixGearQuantities, fixGearStatusAvailabilitySync, validateGearQuantities } from '@/lib/utils/fix-gear-quantities';
import { requireActiveAdminRouteUser } from '@/lib/api-auth';

/**
 * POST /api/admin/fix-gear-status
 *
 * Fixes gear status/availability sync issues where:
 * - Status is 'Partially Available' but available_quantity = quantity
 * - Status is 'Checked Out' but all items are returned
 * - Status is 'Pending Check-in' but no pending check-ins exist
 *
 * Requires Active admin role.
 */
export async function POST() {
    try {
        const authContext = await requireActiveAdminRouteUser();
        if ('errorResponse' in authContext) {
            return NextResponse.json(
                { success: false, error: (await authContext.errorResponse.json()).error },
                { status: authContext.errorResponse.status }
            );
        }

        console.log('[Fix Gear Status] Starting fix by admin:', authContext.user.id);

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
 * Requires Active admin role.
 */
export async function GET() {
    try {
        const authContext = await requireActiveAdminRouteUser();
        if ('errorResponse' in authContext) {
            return NextResponse.json(
                { success: false, error: (await authContext.errorResponse.json()).error },
                { status: authContext.errorResponse.status }
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
