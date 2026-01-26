import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { subscription, client_info } = body || {};

        if (!subscription || !subscription.endpoint) {
            return NextResponse.json({ success: false, error: 'Missing subscription' }, { status: 400 });
        }

        // Convert subscription to string for storage in 'token' field
        const token = JSON.stringify(subscription);

        const record = {
            user_id: user.id,
            token,
            client_info: client_info || null,
            updated_at: new Date().toISOString(),
        };

        console.log('[notifications/subscribe] saving subscription for user:', user.id);

        // Filter to existing tokens (we use 'token' as unique key for upsert)
        const { error } = await supabase
            .from('user_push_tokens')
            .upsert(record, { onConflict: 'token' });

        if (error) {
            console.error('[notifications/subscribe] DB error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[notifications/subscribe] Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
