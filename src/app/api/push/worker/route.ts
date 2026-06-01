import { NextRequest, NextResponse } from 'next/server';
import webPush from 'web-push';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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
        console.error('[Push Worker] VAPID configuration failed:', error);
    }
} else {
    console.error('[Push Worker] Missing VAPID keys:', {
        publicKey: !!VAPID_PUBLIC_KEY,
        privateKey: !!VAPID_PRIVATE_KEY
    });
}

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    const isBearerAuthorized = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const isVercelCron = req.headers.has('x-vercel-cron');
    // Allow either explicit bearer auth or Vercel cron invocations.
    if (!isBearerAuthorized && !isVercelCron) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const supabase = await createSupabaseServerClient(true);

        console.log('[Push Worker] Starting queue processing...');

        const batchSize = Math.max(1, Math.min(100, Number(process.env.PUSH_WORKER_BATCH_SIZE || 50)));

        // Get pending notifications (limit to prevent timeouts)
        const nowIso = new Date().toISOString();
        const { data: pendingNotifications, error: fetchError } = await supabase
            .from('push_notification_queue')
            .select('*')
            .eq('status', 'pending')
            .lte('next_attempt_at', nowIso)
            .order('created_at', { ascending: true })
            .limit(batchSize); // Process in batches

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
                const dedupeKey = notification.data?.dedupe_key;

                if (dedupeKey) {
                    const { data: duplicate } = await supabase
                        .from('push_notification_queue')
                        .select('id')
                        .eq('user_id', notification.user_id)
                        .eq('status', 'sent')
                        .contains('data', { dedupe_key: dedupeKey })
                        .limit(1);
                    if (duplicate && duplicate.length > 0) {
                        await supabase
                            .from('push_notification_queue')
                            .update({
                                status: 'failed',
                                error_message: 'Deduped duplicate notification'
                            })
                            .eq('id', notification.id);
                        processed++;
                        continue;
                    }
                }

                // Claim this notification row for processing.
                // If another worker already claimed it, skip.
                const { data: claimedRows, error: claimError } = await supabase
                    .from('push_notification_queue')
                    .update({
                        status: 'processing',
                        retry_count: notification.retry_count + 1,
                        last_attempt_at: new Date().toISOString(),
                        processing_started_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', notification.id)
                    .eq('status', 'pending')
                    .select('id');

                if (claimError) {
                    console.error('[Push Worker] Claim failed:', claimError);
                    failed++;
                    processed++;
                    continue;
                }

                if (!claimedRows || claimedRows.length === 0) {
                    console.log(`[Push Worker] Notification ${notification.id} already claimed by another worker`);
                    continue;
                }

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
                            sent_at: new Date().toISOString(),
                            processed_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            error_message: null,
                        })
                        .eq('id', notification.id);

                    sent++;
                    console.log(`[Push Worker] Notification ${notification.id} marked as sent (${tokenSent} tokens)`);
                } else {
                    // All tokens failed
                    const errorMsg = `All ${tokenRows.length} tokens failed`;
                    const attemptsUsed = (notification.retry_count ?? 0) + 1;
                    if (attemptsUsed < notification.max_retries) {
                        const backoffMinutes = Math.min(60, Math.max(1, Math.pow(2, attemptsUsed - 1)));
                        const nextAttemptAt = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();
                        await supabase
                            .from('push_notification_queue')
                            .update({
                                status: 'pending',
                                error_message: errorMsg,
                                next_attempt_at: nextAttemptAt,
                                updated_at: new Date().toISOString(),
                            })
                            .eq('id', notification.id);
                        console.log(`[Push Worker] Notification ${notification.id} reset for retry (${attemptsUsed}/${notification.max_retries}), next in ${backoffMinutes}m`);
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
    const { data: row } = await supabase
        .from('push_notification_queue')
        .select('retry_count,max_retries')
        .eq('id', notificationId)
        .maybeSingle();

    const retryCount = Number(row?.retry_count || 0);
    const maxRetries = Number(row?.max_retries || 3);
    const shouldRetry = retryCount < maxRetries;

    if (shouldRetry) {
        const backoffMinutes = Math.min(60, Math.max(1, Math.pow(2, Math.max(0, retryCount - 1))));
        const nextAttemptAt = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();
        await supabase
            .from('push_notification_queue')
            .update({
                status: 'pending',
                error_message: errorMessage,
                next_attempt_at: nextAttemptAt,
                updated_at: new Date().toISOString(),
            })
            .eq('id', notificationId);
        return;
    }

    await supabase
        .from('push_notification_queue')
        .update({
            status: 'dead_letter',
            processed_at: new Date().toISOString(),
            error_message: errorMessage,
            updated_at: new Date().toISOString(),
        })
        .eq('id', notificationId);
}
