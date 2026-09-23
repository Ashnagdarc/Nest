import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedRouteUser } from '@/lib/api-auth';

export async function GET(_request: NextRequest) {
    try {
        const authContext = await requireAuthenticatedRouteUser();
        if ('errorResponse' in authContext) {
            return authContext.errorResponse;
        }

        const admin = await createSupabaseServerClient(true);

        // Call durable RPC that returns the full dashboard JSON for the caller
        const { data: rpcData, error: rpcError } = await admin.rpc('get_user_dashboard', {
            p_user_id: authContext.user.id,
        });
        if (rpcError) {
            throw rpcError;
        }

        return NextResponse.json({ data: rpcData, error: null });

    } catch (error) {
        console.error('Rebuild dashboard API error:', error);
        return NextResponse.json({
            error: 'Failed to fetch dashboard data',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
