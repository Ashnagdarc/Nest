import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendWebPush } from '@/lib/webPush';

export async function POST(_req: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient(true);
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();

        // Check if we already notified the user about this login session recently
        const { data: existing } = await supabase.from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', 'Login Alert')
            .gte('created_at', tenMinutesAgo)
            .limit(1);

        if (existing && existing.length > 0) {
            return NextResponse.json({ success: true, message: 'Login notification already sent recently' });
        }

        const title = 'New Login Detected';
        const message = `A new login to your account was detected on ${now.toLocaleString()}. If this wasn't you, please contact support.`;

        // 1. Insert In-App Notification
        await supabase.from('notifications').insert({
            user_id: user.id,
            type: 'Login Alert',
            title,
            message,
            is_read: false,
            category: 'Security',
        });

        // 2. Send Push Notification
        // Fetch tokens
        const { data: tokenRows } = await supabase
            .from('user_push_tokens')
            .select('token')
            .eq('user_id', user.id);

        if (tokenRows && tokenRows.length > 0) {
            const payload = {
                title,
                body: message,
                data: { url: '/user/settings' } // Redirect to settings or security page
            };

            for (const row of tokenRows) {
                try {
                    const sub = typeof row.token === 'string' ? JSON.parse(row.token) : row.token;
                    if (sub && sub.endpoint) {
                        await sendWebPush(sub, payload);
                    }
                } catch (err) {
                    console.error('Failed to send login push:', err);
                }
            }
        }

        return NextResponse.json({ success: true, message: 'Login notification sent' });
    } catch (err: any) {
        console.error('[Login Notification Error]', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
