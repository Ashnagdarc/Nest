import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { enqueuePushNotification } from '@/lib/push-queue';
import type { Database } from '@/types/supabase';

export async function POST(_req: NextRequest) {
    try {
        console.log('[Login Push] Request received');

        let supabase: SupabaseClient<Database>;
        let user: { id: string } | null = null;
        let authError: { message?: string } | null = null;

        // Check for Authorization header first (more reliable for immediate post-login)
        const authHeader = _req.headers.get('authorization');
        if (authHeader) {
            console.log('[Login Push] Using Authorization header');
            // Create a client compliant with RLS using the user's token
            supabase = createClient<Database>(
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
        const queueResult = await enqueuePushNotification(
            supabase,
            {
                userId: user.id,
                title,
                body: message,
                data: { url: '/user/settings' }
            },
            {
                requestUrl: _req.url,
                context: 'Login Push'
            }
        );

        if (!queueResult.success) {
            console.error('[Login Push] Failed to queue push notification:', queueResult.error);
        } else {
            console.log('[Login Push] Push notification queued');
        }

        return NextResponse.json({ success: true, message: 'Login notification sent' });
    } catch (err: unknown) {
        console.error('[Login Push] Error:', err);
        const message = err instanceof Error ? err.message : 'Unexpected error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
