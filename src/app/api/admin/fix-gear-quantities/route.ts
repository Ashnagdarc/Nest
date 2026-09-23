import { NextRequest, NextResponse } from 'next/server';
import { emergencyFixGearQuantities, validateGearQuantities } from '@/lib/utils/fix-gear-quantities';
import { requireActiveAdminRouteUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
    try {
        const authContext = await requireActiveAdminRouteUser();
        if ('errorResponse' in authContext) {
            return NextResponse.json(
                { success: false, error: (await authContext.errorResponse.json()).error },
                { status: authContext.errorResponse.status }
            );
        }

        // Get the action from request body
        const { action = 'fix' } = await request.json();

        if (action === 'validate') {
            // Just validate the current state
            const validation = await validateGearQuantities();
            return NextResponse.json({
                success: true,
                action: 'validation',
                ...validation
            });
        } else if (action === 'fix') {
            // Run the emergency fix
            const result = await emergencyFixGearQuantities();
            return NextResponse.json({
                action: 'fix',
                ...result
            });
        } else {
            return NextResponse.json({
                success: false,
                error: 'Invalid action. Use "fix" or "validate"'
            }, { status: 400 });
        }

    } catch (error) {
        console.error('Error in fix-gear-quantities API:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json({
            success: false,
            error: errorMessage
        }, { status: 500 });
    }
}

export async function GET() {
    try {
        const authContext = await requireActiveAdminRouteUser();
        if ('errorResponse' in authContext) {
            return NextResponse.json(
                { success: false, error: (await authContext.errorResponse.json()).error },
                { status: authContext.errorResponse.status }
            );
        }

        // Return validation results
        const validation = await validateGearQuantities();
        return NextResponse.json({
            success: true,
            action: 'validation',
            ...validation
        });

    } catch (error) {
        console.error('Error in fix-gear-quantities API:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json({
            success: false,
            error: errorMessage
        }, { status: 500 });
    }
}
