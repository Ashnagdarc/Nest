import { NextRequest, NextResponse } from 'next/server';
import webPush from 'web-push';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Configure VAPID for Edge Runtime
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
        console.error('[Push Worker] VAPID configuration failed:', error);
    }
} else {
    console.error('[Push Worker] Missing VAPID keys:', {
        publicKey: !!VAPID_PUBLIC_KEY,
        privateKey: !!VAPID_PRIVATE_KEY
    });
}

export async function GET(req: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient(true);

        console.log('[Push Worker] Starting queue processing...');

        // Get pending notifications (limit to prevent timeouts)
        const { data: pendingNotifications, error: fetchError } = await supabase
            .from('push_notification_queue')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(10); // Process in batches

        if (fetchError) {
            console.error('[Push Worker] Error fetching pending notifications:', fetchError);
            return NextResponse.json({ error: 'Failed to fetch pending notifications' }, { status: 500 });
        }

        if (!pendingNotifications || pendingNotifications.length === 0) {
            console.log('[Push Worker] No pending notifications to process');
            return NextResponse.json({ processed: 0, message: 'No pending notifications' });
        }

        console.log(`[Push Worker] Processing ${pendingNotifications.length} notifications`);

        let processed = 0;
        let sent = 0;
        let failed = 0;

        for (const notification of pendingNotifications) {
            try {
                console.log(`[Push Worker] Processing notification ${notification.id} for user ${notification.user_id}`);

                // Mark as processing
                await supabase
                    .from('push_notification_queue')
                    .update({
                        status: 'processing',
                        retry_count: notification.retry_count + 1
                    })
                    .eq('id', notification.id);

                // Get user's push subscriptions
                const { data: tokenRows, error: tokenError } = await supabase
                    .from('user_push_tokens')
                    .select('token')
                    .eq('user_id', notification.user_id);

                if (tokenError) {
                    console.error('[Push Worker] Error fetching tokens:', tokenError);
                    await markFailed(supabase, notification.id, `Token fetch error: ${tokenError.message}`);
                    failed++;
                    continue;
                }

                if (!tokenRows || tokenRows.length === 0) {
                    console.log(`[Push Worker] No tokens found for user ${notification.user_id}`);
                    await markFailed(supabase, notification.id, 'No push tokens found for user');
                    failed++;
                    continue;
                }

                // Send to all user's subscriptions
                let tokenSent = 0;
                let tokenFailed = 0;

                for (const row of tokenRows) {
                    try {
                        const subscription = JSON.parse(row.token);

                        if (subscription && subscription.endpoint) {
                            console.log('[Push Worker] Sending to:', subscription.endpoint?.split('/').pop());

                            const payload = {
                                title: notification.title,
                                body: notification.body,
                                data: notification.data || {}
                            };

                            // Send using web-push library
                            await webPush.sendNotification(
                                subscription,
                                JSON.stringify(payload)
                            );

                            tokenSent++;
                            console.log('[Push Worker] Sent successfully to endpoint');
                        }
                    } catch (error: any) {
                        console.error('[Push Worker] Send failed:', {
                            statusCode: error.statusCode,
                            message: error.message,
                            endpoint: JSON.parse(row.token).endpoint?.split('/').pop()
                        });

                        // Clean up invalid tokens (410 Gone, 404 Not Found)
                        if (error.statusCode === 410 || error.statusCode === 404) {
                            await supabase
                                .from('user_push_tokens')
                                .delete()
                                .eq('token', row.token);
                            console.log('[Push Worker] Cleaned invalid token');
                        }

                        tokenFailed++;
                    }
                }

                // Mark notification as sent if at least one token succeeded
                if (tokenSent > 0) {
                    await supabase
                        .from('push_notification_queue')
                        .update({
                            status: 'sent',
                            sent_at: new Date().toISOString()
                        })
                        .eq('id', notification.id);

                    sent++;
                    console.log(`[Push Worker] Notification ${notification.id} marked as sent (${tokenSent} tokens)`);
                } else {
                    // All tokens failed
                    const errorMsg = `All ${tokenRows.length} tokens failed`;
                    if (notification.retry_count < notification.max_retries) {
                        // Reset to pending for retry
                        await supabase
                            .from('push_notification_queue')
                            .update({
                                status: 'pending',
                                error_message: errorMsg
                            })
                            .eq('id', notification.id);
                        console.log(`[Push Worker] Notification ${notification.id} reset for retry (${notification.retry_count + 1}/${notification.max_retries})`);
                    } else {
                        await markFailed(supabase, notification.id, errorMsg);
                        failed++;
                    }
                }

                processed++;

            } catch (error: any) {
                console.error(`[Push Worker] Error processing notification ${notification.id}:`, error);
                await markFailed(supabase, notification.id, error.message);
                failed++;
                processed++;
            }
        }

        console.log(`[Push Worker] Completed: ${processed} processed, ${sent} sent, ${failed} failed`);

        return NextResponse.json({
            processed,
            sent,
            failed,
            message: `Processed ${processed} notifications (${sent} sent, ${failed} failed)`
        });

    } catch (error: any) {
        console.error('[Push Worker] Function error:', error);
        return NextResponse.json({
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}

async function markFailed(supabase: any, notificationId: string, errorMessage: string) {
    await supabase
        .from('push_notification_queue')
        .update({
            status: 'failed',
            error_message: errorMessage
        })
        .eq('id', notificationId);
}