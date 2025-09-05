import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        // Use proper server client with user authentication
        const supabase = await createSupabaseServerClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user profile to determine role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError) {
            return NextResponse.json({ error: 'Failed to get user profile' }, { status: 500 });
        }

        const isAdmin = profile?.role === 'Admin';

        // Call durable RPC that returns the full dashboard JSON
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_dashboard', { p_user_id: user.id });
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
