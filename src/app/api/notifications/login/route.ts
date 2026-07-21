import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { enqueuePushNotification } from '@/lib/push-queue';
import { getSettingsPathForProfile } from '@/lib/auth/role-routing';
import { normalizeNotificationInsert, normalizeNotificationType } from '@/lib/notification-type';
import type { Database } from '@/types/supabase';

const LOGIN_ALERT_TYPE = 'Login Alert';
const LOGIN_ALERT_SUBTYPE = 'login_alert';

type AuthUser = {
    id: string;
    last_sign_in_at?: string | null;
};

async function hasLoginAlertForSession(
    supabase: SupabaseClient<Database>,
    userId: string,
    loginSignInAt: string | null | undefined,
): Promise<boolean> {
    if (loginSignInAt) {
        const { data: sessionAlerts, error: sessionAlertError } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userId)
            .contains('metadata', { subtype: LOGIN_ALERT_SUBTYPE, login_sign_in_at: loginSignInAt })
            .limit(1);

        if (sessionAlertError) {
            console.error('[Login Push] Failed to check session login alerts:', sessionAlertError);
        } else if (sessionAlerts && sessionAlerts.length > 0) {
            return true;
        }
    }

    const { data: recentLoginNotifications, error: recentLoginError } = await supabase
        .from('notifications')
        .select('id, created_at')
        .eq('user_id', userId)
        .eq('type', normalizeNotificationType(LOGIN_ALERT_TYPE))
        .contains('metadata', { subtype: LOGIN_ALERT_SUBTYPE })
        .order('created_at', { ascending: false })
        .limit(1);

    if (recentLoginError) {
        console.error('[Login Push] Failed to check recent notifications:', recentLoginError);
        return false;
    }

    const lastCreatedAt = recentLoginNotifications?.[0]?.created_at;
    if (!lastCreatedAt) return false;

    const lastLoginAt = new Date(lastCreatedAt).getTime();
    return !Number.isNaN(lastLoginAt) && Date.now() - lastLoginAt < 60 * 60 * 1000;
}

export async function POST(req: NextRequest) {
    try {
        let supabase: SupabaseClient<Database>;
        let user: AuthUser | null = null;
        let authError: { message?: string } | null = null;

        const authHeader = req.headers.get('authorization');
        if (authHeader) {
            supabase = createClient<Database>(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                { global: { headers: { Authorization: authHeader } } },
            );
            const { data, error } = await supabase.auth.getUser();
            user = data.user;
            authError = error;
        } else {
            supabase = await createSupabaseServerClient();
            const { data, error } = await supabase.auth.getUser();
            user = data.user;
            authError = error;
        }

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const loginSignInAt = user.last_sign_in_at ?? null;
        const alreadyNotified = await hasLoginAlertForSession(supabase, user.id, loginSignInAt);
        if (alreadyNotified) {
            return NextResponse.json({
                success: true,
                message: 'Login notification already sent for this session',
                deduped: true,
            });
        }

        const { data: userTokens, error: tokenLookupError } = await supabase
            .from('user_push_tokens')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);

        if (tokenLookupError) {
            console.error('[Login Push] Failed to check push subscriptions:', tokenLookupError);
        }

        const now = new Date();
        const title = 'New Login Detected';
        const message = `A new login to your account was detected on ${now.toLocaleString()}. If this wasn't you, please contact support.`;

        const { error: insertError } = await supabase.from('notifications').insert(normalizeNotificationInsert({
            user_id: user.id,
            type: LOGIN_ALERT_TYPE,
            title,
            message,
            is_read: false,
            category: 'Security',
            metadata: {
                subtype: LOGIN_ALERT_SUBTYPE,
                ...(loginSignInAt ? { login_sign_in_at: loginSignInAt } : {}),
            },
        }));

        if (insertError) {
            console.error('[Login Push] Failed to insert in-app notification:', insertError);
            return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
        }

        if (userTokens && userTokens.length > 0) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, status')
                .eq('id', user.id)
                .maybeSingle();

            const queueResult = await enqueuePushNotification(
                {
                    userId: user.id,
                    title,
                    body: message,
                    data: { url: getSettingsPathForProfile(profile) },
                },
                {
                    requestUrl: req.url,
                    context: 'Login Push',
                },
            );

            if (!queueResult.success) {
                console.error('[Login Push] Failed to queue push notification:', queueResult.error);
            }
        }

        return NextResponse.json({ success: true, message: 'Login notification sent' });
    } catch (err: unknown) {
        console.error('[Login Push] Error:', err);
        const message = err instanceof Error ? err.message : 'Unexpected error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
