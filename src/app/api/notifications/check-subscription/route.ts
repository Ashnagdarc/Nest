import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ exists: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { subscription } = body;

        if (!subscription) {
            return NextResponse.json({ exists: false, error: 'Missing subscription' }, { status: 400 });
        }

        // The token is stored as a stringified JSON object
        // We can either search for exact string match, or check if the endpoint exists within any token for this user
        // Using endpoint is safer against JSON formatting differences
        const endpoint = subscription.endpoint;

        // Fetch all tokens for this user
        const { data: tokens, error } = await supabase
            .from('user_push_tokens')
            .select('token')
            .eq('user_id', user.id);

        if (error) {
            console.error('[Check Subscription] DB error:', error);
            return NextResponse.json({ exists: false, error: error.message }, { status: 500 });
        }

        if (!tokens || tokens.length === 0) {
            return NextResponse.json({ exists: false });
        }

        // Check if any token contains our endpoint
        const exists = tokens.some(t => {
            try {
                // If token is stored as JSON string
                const parsed = typeof t.token === 'string' ? JSON.parse(t.token) : t.token;
                return parsed.endpoint === endpoint;
            } catch (e) {
                return false;
            }
        });

        return NextResponse.json({ exists });
    } catch (err: any) {
        console.error('[Check Subscription] Error:', err);
        return NextResponse.json({ exists: false, error: err.message }, { status: 500 });
    }
}
