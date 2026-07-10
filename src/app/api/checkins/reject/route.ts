import { NextRequest, NextResponse } from 'next/server';
import { buildGroupedCheckinEmail, sendCheckinRejectionEmail, sendGearRequestEmail } from '@/lib/email';
import { enqueuePushNotification } from '@/lib/push-queue';
import { transitionBooking } from '@/lib/bookings-v2/service';
import { randomUUID } from 'crypto';
import { requireActiveAdmin } from '@/app/api/_utils/route-auth';
import { sitePath } from '@/lib/site-url';

type NotificationPreferences = {
    email?: Record<string, boolean | undefined>;
};

/**
 * POST /api/checkins/reject
 * 
 * Sends email notifications when admin rejects a check-in
 * 
 * Request body: {
 *   checkinId: string,
 *   userId: string,
 *   gearName: string,
 *   reason: string
 * }
 * 
 * Returns: { success: boolean, error?: string }
 * 
 * Emails sent:
 * - User: Check-in rejected notification with reason
 * - Admins: Admin action notification
 */
export async function POST(request: NextRequest) {
    const correlationId = randomUUID();
    const ok = (userMessage = 'Check-in rejection notifications sent.', warnings: string[] = []) =>
        NextResponse.json({
            success: true,
            booking: null,
            items: [],
            warnings,
            user_message: userMessage,
            error_code: null,
            correlation_id: correlationId,
        });
    const fail = (status: number, error: string, userMessage: string, errorCode: string) =>
        NextResponse.json({
            success: false,
            booking: null,
            items: [],
            warnings: [],
            user_message: userMessage,
            error_code: errorCode,
            correlation_id: correlationId,
            error,
        }, { status });
    try {
        const authContext = await requireActiveAdmin();
        if ('errorResponse' in authContext) {
            return authContext.errorResponse;
        }

        const body = await request.json();
        const { checkinId, userId, gearName, reason } = body;

        if (!checkinId || !userId || !gearName || !reason) {
            return fail(400, 'Missing required fields', 'Missing required check-in fields.', 'CHECKIN_REJECT_VALIDATION_FAILED');
        }

        const supabase = authContext.adminSupabase;

        const { data: checkin } = await supabase
            .from('checkins')
            .select('id, user_id')
            .eq('id', checkinId)
            .maybeSingle();

        if (!checkin) {
            return fail(404, 'Check-in not found', 'Check-in not found.', 'CHECKIN_NOT_FOUND');
        }

        if (checkin.user_id !== userId) {
            return fail(400, 'Check-in user mismatch', 'Check-in payload does not match the stored owner.', 'CHECKIN_USER_MISMATCH');
        }

        // Get user details
        const { data: user } = await supabase
            .from('profiles')
            .select('email, full_name, notification_preferences')
            .eq('id', userId)
            .single();

        if (!user?.email) {
            console.warn('[Check-in Reject] User not found or no email:', userId);
            return fail(404, 'User not found', 'User not found.', 'USER_NOT_FOUND');
        }

        // Check if user wants email notifications
        const userPrefs = (user.notification_preferences as NotificationPreferences | null) || {};
        const shouldSendUserEmail = userPrefs.email?.gear_checkins !== false;

        // Send rejection email to user
        if (shouldSendUserEmail) {
            try {
                await sendCheckinRejectionEmail({
                    to: user.email,
                    userName: user.full_name || 'there',
                    gearList: [{ name: gearName }],
                    checkinDate: new Date().toISOString(),
                    reason: reason
                });
                console.log('[Check-in Reject] ✅ User rejection email sent to:', user.email);
            } catch (userEmailError) {
                console.error('[Check-in Reject] ❌ Failed to send user email:', userEmailError);
            }
        }

        // Queue push notification for the user
        const pushTitle = 'Your Check-in Was Rejected';
        const pushMessage = `Your check-in for ${gearName} has been rejected. Reason: ${reason}. Please contact support for assistance.`;

        const queueResult = await enqueuePushNotification(
            supabase,
            {
                userId,
                title: pushTitle,
                body: pushMessage,
                data: { checkin_id: checkinId, type: 'checkin_rejection' }
            },
            {
                requestUrl: request.url,
                context: 'Check-in Reject'
            }
        );

        if (!queueResult.success) {
            console.error('[Check-in Reject] Failed to queue push notification:', queueResult.error);
        } else {
            console.log('[Check-in Reject] Push notification queued for user');
        }

        try {
            const { data: checkinRow } = await supabase
                .from('checkins')
                .select('request_id')
                .eq('id', checkinId)
                .maybeSingle();
            const legacyRequestId = checkinRow?.request_id;
            if (legacyRequestId) {
                const { data: aggregate } = await supabase
                    .from('bookings')
                    .select('id')
                    .eq('source_type', 'gear_request')
                    .eq('source_id', legacyRequestId)
                    .maybeSingle();
                if (aggregate?.id) {
                    await transitionBooking({
                        bookingId: aggregate.id,
                        nextStatus: 'active',
                        changedBy: null,
                        reason: `Check-in rejected: ${reason}`,
                        metadata: { checkin_id: checkinId, legacy_route: '/api/checkins/reject' },
                        idempotencyKey: `legacy-checkin-reject:${checkinId}`,
                    });
                }
            }
        } catch (syncError) {
            console.error('[Check-in Reject] Failed syncing status to v2 booking lifecycle:', syncError);
        }

        // Notify all admins of the rejection action
        try {
            const { data: admins } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('role', 'Admin')
                .eq('status', 'Active');

            console.log(`[Check-in Reject] Found ${admins?.length || 0} admins to notify`);

            if (admins && admins.length) {
                const userName = user.full_name || 'User';
                for (const admin of admins) {
                    if (!admin.email) continue;
                    try {
                        const groupedHtml = buildGroupedCheckinEmail({
                            title: 'Check-in rejected',
                            preheader: 'A grouped return needs attention',
                            greeting: `Hello ${admin.full_name || 'Admin'},`,
                            message: 'A grouped check-in has been rejected.',
                            items: [{ name: gearName, value: 'Rejected' }],
                            details: [
                                { label: 'User', value: userName },
                                { label: 'Reason', value: reason },
                                { label: 'Status', value: 'Rejected' },
                            ],
                            ctaLabel: 'Review check-ins',
                            ctaHref: sitePath('/admin/manage-checkins'),
                            footerNote: 'Nest by Eden Oasis · Equipment and vehicle operations',
                        });
                        await sendGearRequestEmail({
                            to: admin.email,
                            subject: `Check-in rejected - ${userName}`,
                            html: groupedHtml,
                        });
                        console.log(`[Check-in Reject] ✅ Admin email sent to: ${admin.email}`);
                    } catch (adminEmailError) {
                        console.error(`[Check-in Reject] ❌ Failed to send admin email to ${admin.email}:`, adminEmailError);
                    }
                }
            }
        } catch (adminError) {
            console.error('[Check-in Reject] Error sending admin notifications:', adminError);
        }

        return ok('Check-in rejected and notifications sent.');
    } catch (err) {
        console.error('[Check-in Reject] Error:', err);
        return fail(500, (err as Error).message, 'We could not complete check-in rejection notifications.', 'CHECKIN_REJECT_UNEXPECTED_ERROR');
    }
}
