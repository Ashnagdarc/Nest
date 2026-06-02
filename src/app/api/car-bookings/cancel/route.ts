import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { minimalEmailLayout, sendGearRequestEmail, sendCarBookingCancellationEmail } from '@/lib/email';
import { transitionBooking } from '@/lib/bookings-v2/service';
import { getBookedCarId, setCarStatus } from '@/lib/car-bookings/car-status-sync';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
    const correlationId = randomUUID();
    const ok = (booking: unknown = null, userMessage = 'Car booking cancelled.', warnings: string[] = []) =>
        NextResponse.json({ success: true, booking, items: [], warnings, user_message: userMessage, error_code: null, correlation_id: correlationId });
    const fail = (status: number, error: string, userMessage: string, errorCode: string) =>
        NextResponse.json({ success: false, booking: null, items: [], warnings: [], user_message: userMessage, error_code: errorCode, correlation_id: correlationId, error }, { status });
    try {
        const admin = await createSupabaseServerClient(true);
        const { bookingId, reason } = await request.json();
        
        if (!bookingId) {
            return fail(400, 'bookingId is required', 'Missing booking reference.', 'BOOKING_ID_REQUIRED');
        }

        // Get current user
        const { data: me } = await admin.auth.getUser();
        const userId = me.user?.id || null;

        // Fetch the booking
        const { data: booking, error: selErr } = await admin
            .from('car_bookings')
            .select('*')
            .eq('id', bookingId)
            .maybeSingle();

        if (selErr || !booking) {
            return fail(404, selErr?.message || 'Booking not found', 'Booking not found.', 'CAR_BOOKING_NOT_FOUND');
        }

        // Check if user is admin or owns the booking
        const { data: profile } = await admin
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();
        
        const isAdmin = profile?.role === 'Admin';
        const isOwner = booking.requester_id === userId;

        if (!isAdmin && !isOwner) {
            return fail(403, 'Unauthorized', 'You are not allowed to cancel this booking.', 'CAR_BOOKING_UNAUTHORIZED');
        }

        // Idempotency: if already cancelled, return success
        if (booking.status === 'Cancelled') {
            try {
                const carId = await getBookedCarId(admin, bookingId);
                if (carId) {
                    await setCarStatus(admin, carId, 'Available');
                }
            } catch (syncError) {
                console.warn('[Car Booking Cancel] Failed to sync already-cancelled car status:', syncError);
            }
            return ok(booking, 'Booking is already cancelled.');
        }

        // Validate status
        if (!['Pending', 'Approved'].includes(booking.status)) {
            return NextResponse.json(
                { success: false, booking: null, items: [], warnings: [], user_message: `Cannot cancel booking with status: ${booking.status}.`, error_code: 'CAR_BOOKING_CANCEL_INVALID_STATE', correlation_id: correlationId, error: `Cannot cancel booking with status: ${booking.status}` },
                { status: 400 }
            );
        }

        let assignedCarId: string | null = null;
        try {
            assignedCarId = await getBookedCarId(admin, bookingId);
        } catch (syncError) {
            console.warn('[Car Booking Cancel] Failed to read assigned car before cancellation:', syncError);
        }

        // Validate date policy (unless admin)
        if (!isAdmin) {
            const today = new Date().toISOString().split('T')[0];
            const bookingDate = booking.date_of_use;
            
            // Can cancel if:
            // 1. Future or today (date >= today)
            // 2. Past pending (date < today AND status = Pending)
            const isFutureOrToday = bookingDate >= today;
            const isPastPending = bookingDate < today && booking.status === 'Pending';
            
            if (!isFutureOrToday && !isPastPending) {
                return NextResponse.json(
                    { success: false, booking: null, items: [], warnings: [], user_message: 'Past approved bookings cannot be cancelled.', error_code: 'CAR_BOOKING_CANCEL_POLICY', correlation_id: correlationId, error: 'Cannot cancel past approved bookings' },
                    { status: 400 }
                );
            }
        }

        // Update booking status
        const { error: updateErr } = await admin
            .from('car_bookings')
            .update({
                status: 'Cancelled',
                cancelled_at: new Date().toISOString(),
                cancelled_by: userId,
                cancelled_reason: reason || (isAdmin ? 'admin_cancel' : 'user_cancel'),
                updated_at: new Date().toISOString()
            })
            .eq('id', bookingId);

        if (updateErr) {
            return fail(400, updateErr.message, 'Could not cancel booking right now.', 'CAR_BOOKING_CANCEL_FAILED');
        }

        if (assignedCarId) {
            try {
                await setCarStatus(admin, assignedCarId, 'Available');
            } catch (syncError) {
                console.warn('[Car Booking Cancel] Failed to mark assigned car available:', syncError);
            }
        }

        try {
            const { data: aggregate } = await (admin as any)
                .from('bookings')
                .select('id')
                .eq('source_type', 'car_booking')
                .eq('source_id', bookingId)
                .maybeSingle();
            if (aggregate?.id) {
                await transitionBooking({
                    bookingId: aggregate.id,
                    nextStatus: 'cancelled',
                    changedBy: userId,
                    reason: reason || (isAdmin ? 'admin_cancel' : 'user_cancel'),
                    metadata: { legacy_route: '/api/car-bookings/cancel' },
                    idempotencyKey: `legacy-car-cancel:${bookingId}`,
                });
            }
        } catch (syncError) {
            console.error('[Car Booking Cancel] Failed syncing status to v2 booking lifecycle:', syncError);
        }

        // Delete car assignment if exists (frees the car)
        const { error: deleteAssignmentErr } = await admin
            .from('car_assignment')
            .delete()
            .eq('booking_id', bookingId);

        if (deleteAssignmentErr) {
            console.error('Failed to delete car assignment:', deleteAssignmentErr);
            // Don't fail the request, assignment will be orphaned but harmless
        }

        // Create in-app notification for user
        if (booking.requester_id) {
            await admin.from('notifications').insert({
                user_id: booking.requester_id,
                type: 'Cancellation',
                title: 'Car booking cancelled',
                message: `Your car booking for ${booking.date_of_use} (${booking.time_slot}) has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
                link: '/user/car-booking'
            });
        }

        // Queue push notification for the user
        if (booking.requester_id) {
            const pushTitle = 'Car booking cancelled';
            const pushMessage = `Your car booking for ${booking.date_of_use} (${booking.time_slot}) was cancelled.${reason ? ` Reason: ${reason}` : ''}`;

            const { error: queueError } = await admin.from('push_notification_queue').insert({
                user_id: booking.requester_id,
                title: pushTitle,
                body: pushMessage,
                data: { booking_id: bookingId, type: 'car_booking_cancelled' }
            });

            if (queueError) {
                console.error('[Car Booking Cancel] Failed to queue push notification for user:', queueError);
            } else {
                console.log('[Car Booking Cancel] Push notification queued for user');
            }
        }

        // Queue push notification for all admins
        const { data: admins } = await admin
            .from('profiles')
            .select('id')
            .eq('role', 'Admin')
            .eq('status', 'Active');

        if (admins && admins.length > 0) {
            const pushTitle = 'Car booking cancelled';
            const pushMessage = `A car booking was cancelled ${isAdmin ? 'by an administrator' : 'by the user'}.`;

            for (const adminProfile of admins) {
                const { error: queueError } = await admin.from('push_notification_queue').insert({
                    user_id: adminProfile.id,
                    title: pushTitle,
                    body: pushMessage,
                    data: { booking_id: bookingId, type: 'car_booking_cancelled_admin' }
                });

                if (queueError) {
                    console.error(`[Car Booking Cancel] Failed to queue push notification for admin ${adminProfile.id}:`, queueError);
                }
            }
            console.log(`[Car Booking Cancel] Push notifications queued for ${admins.length} admins`);
        }

        // Get user email for notification
        let userEmail = '';
        if (booking.requester_id) {
            const { data: userProfile } = await admin
                .from('profiles')
                .select('email')
                .eq('id', booking.requester_id)
                .single();
            userEmail = userProfile?.email || '';
        }

        // Send cancellation email to user
        try {
            if (userEmail) {
                await sendCarBookingCancellationEmail({
                    to: userEmail,
                    userName: booking.employee_name,
                    dateOfUse: booking.date_of_use,
                    timeSlot: booking.time_slot,
                    destination: booking.destination || undefined,
                    cancelledBy: isAdmin ? 'admin' : 'user',
                    reason: reason || undefined,
                });
            }
        } catch (e) {
            console.warn('sendCarBookingCancellationEmail to user failed', e);
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
                                title: 'Car booking cancelled',
                                preheader: 'A booking has been cancelled',
                                greeting: `Hello ${adminProfile.full_name || 'Admin'},`,
                                message: `A car booking has been cancelled ${isAdmin ? 'by an administrator' : 'by the user'}.`,
                                sections: [{
                                    heading: 'Cancelled booking details',
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
                                subject: `Car booking cancelled - ${booking.employee_name}`,
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

        return ok(null, 'Car booking cancelled.');
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return fail(500, msg, 'We could not cancel the booking right now. Please try again.', 'CAR_BOOKING_CANCEL_UNEXPECTED_ERROR');
    }
}
