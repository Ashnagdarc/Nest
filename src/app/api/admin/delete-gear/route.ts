import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
    try {
        const { gearId } = await request.json();

        if (!gearId) {
            return NextResponse.json(
                { error: 'Gear ID is required' },
                { status: 400 }
            );
        }

        // Create Supabase client with admin privileges
        const supabase = await createSupabaseServerClient(true);

        // Get the user's session
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
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

    } catch (error: any) {
        console.error('Error deleting gear:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete gear' },
            { status: 500 }
        );
    }
} 