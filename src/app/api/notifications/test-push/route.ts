import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendWebPush } from '@/lib/webPush';

export async function POST() {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.warn('[Test Push] Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[Test Push] Triggered for user:', user.id);

        // Fetch user's push subscriptions
        const { data: tokenRows } = await supabase
            .from('user_push_tokens')
            .select('token')
            .eq('user_id', user.id);

        console.log(`[Test Push] Found ${tokenRows?.length || 0} subscriptions for user`);

        if (!tokenRows || tokenRows.length === 0) {
            return NextResponse.json({ error: 'No active subscriptions found for this user.' }, { status: 404 });
        }

        const payload = {
            title: 'Nest Test Notification 🚀',
            body: 'If you are seeing this, your self-hosted push notifications are working perfectly!',
            data: { url: '/user/notifications' }
        };

        let sentCount = 0;
        const errors = [];

        for (const row of tokenRows) {
            try {
                const sub = JSON.parse(row.token);
                if (sub && sub.endpoint) {
                    console.log('[Test Push] Sending to endpoint:', sub.endpoint.split('/').pop());
                    await sendWebPush(sub, payload);
                    sentCount++;
                }
            } catch (err: any) {
                console.error('[Test Push] individual send error:', err.message);
                errors.push(err.message);
            }
        }

        console.log(`[Test Push] Finished. Successfully sent: ${sentCount}, Errors: ${errors.length}`);

        return NextResponse.json({
            success: true,
            sentCount,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (err: any) {
        console.error('[Test Push] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
