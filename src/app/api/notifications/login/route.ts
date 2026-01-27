import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { sendWebPush } from '@/lib/webPush';

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

        // 2. Send Push Notification
        // Fetch tokens using User Client (RLS allows select own tokens)
        const { data: tokenRows, error: tokenError } = await supabase
            .from('user_push_tokens')
            .select('token')
            .eq('user_id', user.id);

        if (tokenError) {
            console.error('[Login Push] Error fetching tokens:', tokenError);
        }

        console.log(`[Login Push] Found ${tokenRows?.length || 0} tokens`);

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
                        console.log('[Login Push] Sending to endpoint:', sub.endpoint.split('/').pop());
                        await sendWebPush(sub, payload);
                    }
                } catch (unknownErr) {
                    const err = unknownErr as any;
                    console.error('[Login Push] Failed to send login push:', err?.message || err);
                    // For cleanup, we need a client. User client allows delete own? 
                    // Usually yes. If not, we just log and skip delete for now to avoid breaking flow.
                    if (err?.statusCode === 410 || err?.statusCode === 404) {
                        console.log('[Login Push] Attempting to remove expired token');
                        const { error: delError } = await supabase.from('user_push_tokens').delete().eq('token', row.token);
                        if (delError) console.error('[Login Push] Failed to cleanup token:', delError);
                    }
                }
            }
        } else {
            console.warn('[Login Push] No tokens found for user');
        }

        return NextResponse.json({ success: true, message: 'Login notification sent' });
    } catch (err: any) {
        console.error('[Login Push] Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
