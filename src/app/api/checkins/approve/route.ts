import { NextRequest, NextResponse } from 'next/server';
import { buildGroupedCheckinEmail, sendCheckinApprovalEmail, sendGearRequestEmail } from '@/lib/email';
import { enqueuePushNotification } from '@/lib/push-queue';
import { transitionBooking } from '@/lib/bookings-v2/service';
import { randomUUID } from 'crypto';
import { requireActiveAdmin } from '@/app/api/_utils/route-auth';
import { sitePath } from '@/lib/site-url';

type NotificationPreferences = {
    email?: Record<string, boolean | undefined>;
};

/**
 * POST /api/checkins/approve
 * 
 * Sends email notifications when admin approves a check-in
 * 
 * Request body: {
 *   checkinId: string,
 *   userId: string,
 *   gearName: string
 * }
 * 
 * Returns: { success: boolean, error?: string }
 * 
 * Emails sent:
 * - User: Check-in approved notification
 * - Admins: Admin action notification
 */
export async function POST(request: NextRequest) {
    const correlationId = randomUUID();
    const ok = (userMessage = 'Check-in approval notifications sent.', warnings: string[] = []) =>
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
        const { checkinId, userId, gearName, gearNames } = body;

        const normalizedGearNames: string[] = Array.isArray(gearNames)
            ? gearNames.filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0)
            : (typeof gearName === 'string' && gearName.trim().length > 0 ? [gearName] : []);

        if (!checkinId || !userId || normalizedGearNames.length === 0) {
            return fail(400, 'Missing required fields', 'Missing required check-in fields.', 'CHECKIN_APPROVE_VALIDATION_FAILED');
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
            console.warn('[Check-in Approve] User not found or no email:', userId);
            return fail(404, 'User not found', 'User not found.', 'USER_NOT_FOUND');
        }

        // Check if user wants email notifications
        const userPrefs = (user.notification_preferences as NotificationPreferences | null) || {};
        const shouldSendUserEmail = userPrefs.email?.gear_checkins !== false;

        const gearLabel = normalizedGearNames.join(', ');

        // Send approval email to user
        if (shouldSendUserEmail) {
            try {
                await sendCheckinApprovalEmail({
                    to: user.email,
                    userName: user.full_name || 'there',
                    gearList: normalizedGearNames.map((name) => ({ name, condition: 'Good' })),
                    checkinDate: new Date().toISOString(),
                    condition: 'Good'
                });
                console.log('[Check-in Approve] ✅ User approval email sent to:', user.email);
            } catch (userEmailError) {
                console.error('[Check-in Approve] ❌ Failed to send user email:', userEmailError);
            }
        }

        // Queue push notification for the user
        const pushTitle = 'Your Check-in Was Approved!';
        const pushMessage = `Your check-in for ${gearLabel} has been approved. Thank you for returning the equipment.`;

        const queueResult = await enqueuePushNotification(
            {
                userId,
                title: pushTitle,
                body: pushMessage,
                data: { checkin_id: checkinId, type: 'checkin_approval' }
            },
            {
                requestUrl: request.url,
                context: 'Check-in Approve'
            }
        );

        if (!queueResult.success) {
            console.error('[Check-in Approve] Failed to queue push notification:', queueResult.error);
        } else {
            console.log('[Check-in Approve] Push notification queued for user');
        }

        try {
            const { data: checkinRow } = await supabase
                .from('checkins')
                .select('request_id')
                .eq('id', checkinId)
                .maybeSingle();
            const legacyRequestId = checkinRow?.request_id;
            if (legacyRequestId) {
                const { count: pendingCount } = await supabase
                    .from('checkins')
                    .select('*', { count: 'exact', head: true })
                    .eq('request_id', legacyRequestId)
                    .eq('status', 'Pending Admin Approval');

                const nextStatus = (pendingCount || 0) > 0 ? 'active' : 'completed';
                const { data: aggregate } = await supabase
                    .from('bookings')
                    .select('id')
                    .eq('source_type', 'gear_request')
                    .eq('source_id', legacyRequestId)
                    .maybeSingle();

                if (aggregate?.id) {
                    await transitionBooking({
                        bookingId: aggregate.id,
                        nextStatus,
                        changedBy: null,
                        reason: 'Legacy check-in approval sync',
                        metadata: { checkin_id: checkinId, legacy_route: '/api/checkins/approve' },
                        idempotencyKey: `legacy-checkin-approve:${checkinId}:${nextStatus}`,
                    });
                }
            }
        } catch (syncError) {
            console.error('[Check-in Approve] Failed syncing status to v2 booking lifecycle:', syncError);
        }

        // Notify all admins of the approval action
        try {
            const { data: admins } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('role', 'Admin')
                .eq('status', 'Active');

            console.log(`[Check-in Approve] Found ${admins?.length || 0} admins to notify`);

            if (admins && admins.length) {
                const userName = user.full_name || 'User';
                for (const admin of admins) {
                    if (!admin.email) continue;
                    try {
                        const groupedHtml = buildGroupedCheckinEmail({
                            title: 'Check-in approved',
                            preheader: 'A grouped return has been approved',
                            greeting: `Hello ${admin.full_name || 'Admin'},`,
                            message: 'A grouped check-in has been approved.',
                            items: normalizedGearNames.map((name) => ({ name, value: 'Approved' })),
                            details: [
                                { label: 'User', value: userName },
                                { label: 'Status', value: 'Approved' },
                            ],
                            ctaLabel: 'Review check-ins',
                            ctaHref: sitePath('/admin/manage-checkins'),
                            footerNote: 'Nest by Eden Oasis · Equipment and vehicle operations',
                        });
                        await sendGearRequestEmail({
                            to: admin.email,
                            subject: `Check-in approved - ${userName}`,
                            html: groupedHtml,
                        });
                        console.log(`[Check-in Approve] ✅ Admin email sent to: ${admin.email}`);
                    } catch (adminEmailError) {
                        console.error(`[Check-in Approve] ❌ Failed to send admin email to ${admin.email}:`, adminEmailError);
                    }
                }
            }
        } catch (adminError) {
            console.error('[Check-in Approve] Error sending admin notifications:', adminError);
        }

        return ok('Check-in approved and notifications sent.');
    } catch (err) {
        console.error('[Check-in Approve] Error:', err);
        return fail(500, (err as Error).message, 'We could not complete check-in approval notifications.', 'CHECKIN_APPROVE_UNEXPECTED_ERROR');
    }
}
