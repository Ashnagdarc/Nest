import { NextRequest, NextResponse } from 'next/server';
import webPush from 'web-push';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { getRouteAuthContext } from '@/lib/api-auth';

export const runtime = 'nodejs';

// Configure VAPID for the Node.js route runtime
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_MAILTO = process.env.VAPID_MAILTO || 'mailto:noreply@nestbyeden.app';

// Configure Web Push - works in both Edge and Node.js
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    try {
        webPush.setVapidDetails(
            VAPID_MAILTO,
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY
        );
    } catch (error) {
        console.error('[WebPush Edge] VAPID configuration failed:', error);
    }
} else {
    console.error('[WebPush Edge] Missing VAPID keys:', {
        publicKey: !!VAPID_PUBLIC_KEY,
        privateKey: !!VAPID_PRIVATE_KEY
    });
}

export async function POST(req: NextRequest) {
    try {
        const authContext = await getRouteAuthContext();
        if ('errorResponse' in authContext) {
            return authContext.errorResponse;
        }

        const { userId, title, body, data } = await req.json() as {
            userId?: string;
            title?: string;
            body?: string;
            data?: Record<string, unknown>;
        };

        const targetUserId = authContext.isActiveAdmin
            ? (userId || authContext.user.id)
            : authContext.user.id;

        if (authContext.isActiveAdmin && !targetUserId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        if (!authContext.isActiveAdmin && userId && userId !== authContext.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const supabase = await createSupabaseAdminClient();
        
        // Fetch user's push subscriptions
        const { data: tokenRows } = await supabase
            .from('user_push_tokens')
            .select('token')
            .eq('user_id', targetUserId);

        if (!tokenRows || tokenRows.length === 0) {
            return NextResponse.json({ error: 'No active subscriptions found' }, { status: 404 });
        }

        const payload = {
            title: title || 'Nest Notification',
            body: body || 'You have a new notification',
            data: data || {}
        };

        let sentCount = 0;
        const errors = [];

        console.log(`[Push Edge] Sending to ${tokenRows.length} subscriptions for user ${targetUserId}`);

        for (const row of tokenRows) {
            try {
                const subscription = JSON.parse(row.token);
                
                if (subscription && subscription.endpoint) {
                    console.log('[Push Edge] Sending to:', subscription.endpoint?.split('/').pop());
                    
                    // Send using web-push library (works in Edge Runtime)
                    await webPush.sendNotification(
                        subscription,
                        JSON.stringify(payload)
                    );
                    
                    sentCount++;
                }
            } catch (error: unknown) {
                const parsedToken = JSON.parse(row.token) as { endpoint?: string };
                const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
                const message = error instanceof Error ? error.message : 'Unknown push error';
                console.error('[Push Edge] Send failed:', {
                    statusCode,
                    message,
                    endpoint: parsedToken.endpoint?.split('/').pop()
                });

                // Clean up invalid tokens (410 Gone, 404 Not Found)
                if (statusCode === 410 || statusCode === 404) {
                    await supabase
                        .from('user_push_tokens')
                        .delete()
                        .eq('token', row.token);
                    console.log('[Push Edge] Cleaned invalid token');
                }

                errors.push({
                    endpoint: parsedToken.endpoint?.split('/').pop(),
                    error: message
                });
            }
        }

        return NextResponse.json({
            success: true,
            sentCount,
            totalTokens: tokenRows.length,
            errors: errors.length > 0 ? errors : undefined,
            runtime: 'nodejs'
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const stack = error instanceof Error ? error.stack : undefined;
        console.error('[Push Edge] Function error:', error);
        return NextResponse.json({
            success: false,
            error: message,
            stack: process.env.NODE_ENV === 'development' ? stack : undefined
        }, { status: 500 });
    }
}
