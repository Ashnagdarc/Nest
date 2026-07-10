import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAdminRouteUser } from '@/lib/api-auth';

export async function DELETE(request: NextRequest) {
    try {
        const authContext = await requireActiveAdminRouteUser();
        if ('errorResponse' in authContext) {
            return NextResponse.json(
                { error: (await authContext.errorResponse.json()).error },
                { status: authContext.errorResponse.status }
            );
        }

        const supabase = authContext.adminSupabase;
        const { gearId } = await request.json();

        if (!gearId) {
            return NextResponse.json(
                { error: 'Gear ID is required' },
                { status: 400 }
            );
        }

        // Delete the gear
        const { error: deleteError } = await supabase
            .from('gears')
            .delete()
            .eq('id', gearId);

        if (deleteError) {
            throw deleteError;
        }

        return NextResponse.json(
            { message: 'Gear deleted successfully' },
            { status: 200 }
        );

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to delete gear';
        console.error('Error deleting gear:', error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
} 
