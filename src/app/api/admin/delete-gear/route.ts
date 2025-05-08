import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const { gearId, userId } = await request.json();

        // Validation
        if (!gearId) {
            return NextResponse.json({ error: 'Missing gearId parameter' }, { status: 400 });
        }

        console.log("API - Delete request received for gear ID:", gearId);

        // Get supabase client
        const supabase = createRouteHandlerClient({ cookies });

        // Verify user is authenticated and is an admin
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error("API - Authentication error:", authError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || profile.role !== 'Admin') {
            console.error("API - Authorization error:", profileError);
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        console.log("API - Admin verification successful, proceeding with deletion");

        // Method 1: Try direct SQL deletion first (most reliable)
        try {
            const { error: sqlError } = await supabase.rpc('admin_delete_gear', { gear_id: gearId });

            if (!sqlError) {
                console.log("API - Deletion via RPC successful");
                return NextResponse.json({ success: true, method: 'rpc' });
            }

            console.log("API - RPC deletion failed:", sqlError);
            // Continue to next method if this fails
        } catch (rpcError) {
            console.error("API - RPC error:", rpcError);
            // Continue to fallback methods
        }

        // Method 2: Try direct database operation with service role access (if RPC fails)
        try {
            // Direct database delete
            const { error: deleteError } = await supabase
                .from('gears')
                .delete()
                .eq('id', gearId);

            if (deleteError) {
                console.error("API - Standard deletion error:", deleteError);
                return NextResponse.json({
                    error: `Deletion failed: ${deleteError.message}`,
                    details: deleteError
                }, { status: 500 });
            }

            console.log("API - Standard deletion successful");
            return NextResponse.json({ success: true, method: 'standard' });
        } catch (deleteError: any) {
            console.error("API - Unhandled deletion error:", deleteError);
            return NextResponse.json({
                error: `Unhandled deletion error: ${deleteError.message}`,
                details: deleteError
            }, { status: 500 });
        }
    } catch (error: any) {
        console.error("API - General error:", error);
        return NextResponse.json({
            error: `Server error: ${error.message}`
        }, { status: 500 });
    }
} 