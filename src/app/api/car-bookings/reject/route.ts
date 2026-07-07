import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';
import { minimalEmailLayout, sendGearRequestEmail, sendCarBookingRejectionEmail } from '@/lib/email';
import { transitionBooking } from '@/lib/bookings-v2/service';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
    const correlationId = randomUUID();
    const ok = (booking: unknown = null, userMessage = 'Car booking rejected.', warnings: string[] = []) =>
        NextResponse.json({ success: true, booking, items: [], warnings, user_message: userMessage, error_code: null, correlation_id: correlationId });
    const fail = (status: number, error: string, userMessage: string, errorCode: string) =>
        NextResponse.json({ success: false, booking: null, items: [], warnings: [], user_message: userMessage, error_code: errorCode, correlation_id: correlationId, error }, { status });
    try {
        const authClient = await createSupabaseServerClient();
        const { data: userData } = await authClient.auth.getUser();
        if (!userData.user) {
            return fail(401, 'Unauthorized', 'Authentication required.', 'CAR_BOOKING_UNAUTHORIZED');
        }

        const { data: profile } = await authClient
            .from('profiles')
            .select('role,status')
            .eq('id', userData.user.id)
            .maybeSingle();
        const isAdmin = profile?.role === 'Admin' && profile?.status === 'Active';
        if (!isAdmin) {
            return fail(403, 'Admin access required', 'Only active admins can reject car bookings.', 'CAR_BOOKING_ADMIN_REQUIRED');
        }

        const admin = await createSupabaseServerClient(true);
        const { bookingId, reason } = await request.json();
        if (!bookingId) return fail(400, 'bookingId is required', 'Missing booking reference.', 'BOOKING_ID_REQUIRED');

        const { data: booking, error: selErr } = await admin.from('car_bookings').select('*').eq('id', bookingId).maybeSingle();
        if (selErr || !booking) return fail(404, selErr?.message || 'Not found', 'Booking not found.', 'CAR_BOOKING_NOT_FOUND');
        if (booking.status === 'Rejected') return ok(booking, 'Booking is already rejected.');

        const actorId = userData.user.id;

        const { error } = await admin.from('car_bookings').update({
            status: 'Rejected',
            rejected_by: actorId,
            rejection_reason: reason || null
        }).eq('id', bookingId);
        if (error) return fail(400, error.message, 'Could not reject booking right now.', 'CAR_BOOKING_REJECT_FAILED');

        try {
            const { data: aggregate } = await admin
                .from('bookings')
                .select('id')
                .eq('source_type', 'car_booking')
                .eq('source_id', bookingId)
                .maybeSingle();
            if (aggregate?.id) {
                await transitionBooking({
                    bookingId: aggregate.id,
                    nextStatus: 'failed',
                    changedBy: actorId,
                    reason: reason || 'Booking rejected via legacy route',
                    metadata: { legacy_route: '/api/car-bookings/reject' },
                    idempotencyKey: `legacy-car-reject:${bookingId}`,
                });
            }
        } catch (syncError) {
            console.error('[Car Booking Reject] Failed syncing status to v2 booking lifecycle:', syncError);
        }

        if (booking.requester_id) {
            await admin.from('notifications').insert({
                user_id: booking.requester_id,
                type: 'Rejection',
                title: 'Car booking rejected',
                message: `Your car booking for ${booking.date_of_use} (${booking.time_slot}) has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
                link: '/user/car-booking'
            });

            // Queue push notification for the user
            const pushTitle = 'Car booking not approved';
            const pushMessage = `Your car booking for ${booking.date_of_use} (${booking.time_slot}) was not approved.${reason ? ` Reason: ${reason}` : ''}`;

            const { error: queueError } = await admin.from('push_notification_queue').insert({
                user_id: booking.requester_id,
                title: pushTitle,
                body: pushMessage,
                data: { booking_id: bookingId, type: 'car_booking_rejected' }
            });

            if (queueError) {
                console.error('[Car Booking Reject] Failed to queue push notification for user:', queueError);
            } else {
                console.log('[Car Booking Reject] Push notification queued for user');
            }
        }

        // Get user email for notification
        let userEmail = '';
        if (booking.requester_id) {
            const { data: profile } = await admin
                .from('profiles')
                .select('email')
                .eq('id', booking.requester_id)
                .single();
            userEmail = profile?.email || '';
        }

        // Send rejection email to user
        try {
            if (userEmail) {
                await sendCarBookingRejectionEmail({
                    to: userEmail,
                    userName: booking.employee_name,
                    dateOfUse: booking.date_of_use,
                    timeSlot: booking.time_slot,
                    reason: reason || undefined,
                });
            }
        } catch (e) {
            console.warn('sendCarBookingRejectionEmail to user failed', e);
        }

        try {
            await notifyGoogleChat(NotificationEventType.ADMIN_REJECT_REQUEST, {
                adminName: userData.user.email,
                adminEmail: userData.user.email,
                userName: booking.employee_name,
                userEmail: '',
                gearNames: [`Car booking: ${booking.date_of_use} ${booking.time_slot}`],
                dueDate: booking.date_of_use
            });
        } catch (chatError) {
            console.warn('[Car Booking Reject] Failed to notify Google Chat:', chatError);
        }

        // Send notification email to all admins
        try {
            const { data: admins } = await admin
                .from('profiles')
                .select('email, full_name')
                .eq('role', 'Admin')
                .eq('status', 'Active');
            
            if (admins && Array.isArray(admins)) {
                for (const adminProfile of admins) {
                    if (adminProfile.email) {
                        try {
                            const adminHtml = minimalEmailLayout({
                                title: 'Car booking rejected',
                                preheader: 'A booking request was rejected',
                                greeting: `Hello ${adminProfile.full_name || 'Admin'},`,
                                message: 'A car booking request has been rejected.',
                                sections: [{
                                    heading: 'Booking details',
                                    rows: [
                                        { label: 'Employee', value: booking.employee_name || 'Not provided' },
                                        { label: 'Date of use', value: booking.date_of_use || 'Not provided' },
                                        { label: 'Time slot', value: booking.time_slot || 'Not provided' },
                                        { label: 'Reason', value: reason || 'Not provided' },
                                    ]
                                }],
                                ctaLabel: 'View bookings',
                                ctaHref: 'https://nestbyeden.app/admin/manage-car-bookings',
                                footerNote: 'Nest by Eden Oasis · Vehicle management',
                            });
                            await sendGearRequestEmail({
                                to: adminProfile.email,
                                subject: `Car booking rejected - ${booking.employee_name}`,
                                html: adminHtml,
                            });
                        } catch (emailError) {
                            console.warn(`Failed to send email to admin ${adminProfile.email}:`, emailError);
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to notify admins by email:', e);
        }

        return ok(null, 'Car booking rejected.');
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return fail(500, msg, 'We could not complete rejection right now. Please try again.', 'CAR_BOOKING_REJECT_UNEXPECTED_ERROR');
    }
}
