import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(_req: NextRequest) {
    try {
        console.log('[Login Push] Request received');

        let supabase;
        let user = null;
        let authError = null;

        // Check for Authorization header first (more reliable for immediate post-login)
        const authHeader = _req.headers.get('authorization');
        if (authHeader) {
            console.log('[Login Push] Using Authorization header');
            // Create a client compliant with RLS using the user's token
            supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                { global: { headers: { Authorization: authHeader } } }
            );
            const { data, error } = await supabase.auth.getUser();
            user = data.user;
            authError = error;
        } else {
            // Fallback to cookies
            console.log('[Login Push] Using Cookies');
            supabase = await createSupabaseServerClient();
            const { data, error } = await supabase.auth.getUser();
            user = data.user;
            authError = error;
        }

        if (authError || !user) {
            console.error('[Login Push] Auth error:', authError);
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[Login Push] User authenticated:', user.id);

        const now = new Date();
        const title = 'New Login Detected';
        const message = `A new login to your account was detected on ${now.toLocaleString()}. If this wasn't you, please contact support.`;

        // 1. Insert In-App Notification using User Client (RLS should allow inserting own notifications)
        const { error: insertError } = await supabase.from('notifications').insert({
            user_id: user.id,
            type: 'Login Alert',
            title,
            message,
            is_read: false,
            category: 'Security',
        });

        if (insertError) {
            console.error('[Login Push] Failed to insert in-app notification:', insertError);
        } else {
            console.log('[Login Push] In-app notification inserted');
        }

        // 2. Queue Push Notification
        const { error: queueError } = await supabase.from('push_notification_queue').insert({
            user_id: user.id,
            title,
            message,
            data: { url: '/user/settings' }
        });

        if (queueError) {
            console.error('[Login Push] Failed to queue push notification:', queueError);
        } else {
            console.log('[Login Push] Push notification queued');
        }

        return NextResponse.json({ success: true, message: 'Login notification sent' });
    } catch (err: any) {
        console.error('[Login Push] Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
