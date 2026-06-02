import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';
import { minimalEmailLayout, sendGearRequestEmail, sendCarBookingApprovalEmail } from '@/lib/email';
import { transitionBooking } from '@/lib/bookings-v2/service';
import { getBookedCarId, setCarStatus } from '@/lib/car-bookings/car-status-sync';
import { randomUUID } from 'crypto';

function isCarConflictError(message?: string | null) {
    const msg = (message || '').toLowerCase();
    return msg.includes('currently checked out')
        || msg.includes('already assigned and approved for this specific time slot')
        || msg.includes('already assigned to another approved booking for this date and time slot');
}

export async function POST(request: NextRequest) {
    const correlationId = randomUUID();
    const ok = (booking: unknown = null, userMessage = 'Car booking approved.', warnings: string[] = []) =>
        NextResponse.json({ success: true, booking, items: [], warnings, user_message: userMessage, error_code: null, correlation_id: correlationId });
    const fail = (status: number, error: string, userMessage: string, errorCode: string) =>
        NextResponse.json({ success: false, booking: null, items: [], warnings: [], user_message: userMessage, error_code: errorCode, correlation_id: correlationId, error }, { status });
    try {
        const admin = await createSupabaseServerClient(true);
        const { bookingId } = await request.json();
        if (!bookingId) return fail(400, 'bookingId is required', 'Missing booking reference.', 'BOOKING_ID_REQUIRED');

        const { data: booking, error: selErr } = await admin.from('car_bookings').select('*').eq('id', bookingId).maybeSingle();
        if (selErr || !booking) return fail(404, selErr?.message || 'Not found', 'Booking not found.', 'CAR_BOOKING_NOT_FOUND');
        if (booking.status === 'Approved') {
            try {
                const carId = await getBookedCarId(admin, bookingId);
                if (carId) {
                    await setCarStatus(admin, carId, 'In Service');
                }
            } catch (syncError) {
                console.warn('[Car Booking Approve] Failed to sync already-approved car status:', syncError);
            }
            return ok(booking, 'Booking is already approved.');
        }

        // Enforce: only one Approved per user per day
        if (booking.requester_id) {
            const { count: alreadyApproved } = await admin
                .from('car_bookings')
                .select('*', { count: 'exact', head: true })
                .eq('requester_id', booking.requester_id)
                .eq('date_of_use', booking.date_of_use)
                .eq('status', 'Approved');
            if ((alreadyApproved || 0) > 0) {
                return fail(400, 'User already has an approved car booking for this date.', 'User already has an approved booking for this date.', 'CAR_BOOKING_USER_CONFLICT');
            }
        }

        // Require assignment before approval
        const { data: assignment } = await admin.from('car_assignment').select('car_id').eq('booking_id', bookingId).maybeSingle();
        if (!assignment?.car_id) {
            return fail(400, 'Assign a car before approval.', 'Assign a vehicle before approval.', 'CAR_ASSIGNMENT_REQUIRED');
        }

        // Prevent approval if car is already assigned/checked out by another approved booking
        const { data: assignments, error: aErr } = await admin
            .from('car_assignment')
            .select('booking_id, car_id')
            .eq('car_id', assignment.car_id);
        if (aErr) return fail(400, aErr.message, 'Could not verify car assignment.', 'CAR_ASSIGNMENT_CHECK_FAILED');

        if ((assignments || []).length > 0) {
            const ids = assignments.map(r => r.booking_id);
            const { data: relatedBookings, error: relatedErr } = await admin
                .from('car_bookings')
                .select('id, date_of_use, time_slot, status, employee_name')
                .in('id', ids)
                .neq('id', bookingId);

            if (relatedErr) return fail(400, relatedErr.message, 'Could not verify booking conflicts.', 'CAR_CONFLICT_CHECK_FAILED');

            const approvedConflicts = (relatedBookings || []).filter(b => b.status === 'Approved');

            // Check for exact slot conflict first for clearer error messaging
            const slotConflict = approvedConflicts.find(
                (b) => b.date_of_use === booking.date_of_use && b.time_slot === booking.time_slot
            );
            if (slotConflict) {
                return fail(409, 'Car is already assigned and approved for this specific time slot.', 'Car is already assigned for this time slot.', 'CAR_SLOT_CONFLICT');
            }

            const checkedOut = approvedConflicts[0];
            if (checkedOut) {
                return fail(409, 'Vehicle is currently checked out by another user. It must be returned (marked as Completed) before this booking can be approved.', 'Vehicle is currently checked out and unavailable.', 'CAR_ALREADY_CHECKED_OUT');
            }
        }

        const { data: me } = await admin.auth.getUser();
        const approverId = me.user?.id || null;

        const { error } = await admin.from('car_bookings').update({
            status: 'Approved',
            approved_by: approverId,
            approved_at: new Date().toISOString()
        }).eq('id', bookingId);
        if (error) {
            return fail(isCarConflictError(error.message) ? 409 : 400, error.message, 'Could not approve booking right now.', 'CAR_BOOKING_APPROVE_FAILED');
        }

        try {
            if (assignment?.car_id) {
                await setCarStatus(admin, assignment.car_id, 'In Service');
            }
        } catch (syncError) {
            console.warn('[Car Booking Approve] Failed to mark assigned car in service:', syncError);
        }

        try {
            const { data: aggregate } = await (admin as any)
                .from('bookings')
                .select('id,status')
                .eq('source_type', 'car_booking')
                .eq('source_id', bookingId)
                .maybeSingle();
            if (aggregate?.id) {
                await transitionBooking({
                    bookingId: aggregate.id,
                    nextStatus: 'approved',
                    changedBy: approverId,
                    reason: 'Legacy car approval route sync',
                    metadata: { legacy_route: '/api/car-bookings/approve' },
                    idempotencyKey: `legacy-car-approve:${bookingId}`,
                });
            }
        } catch (syncError) {
            console.error('[Car Booking Approve] Failed syncing status to v2 booking lifecycle:', syncError);
        }

        // Get assigned car details early so subsequent notifications can use it safely
        let carDetails = '';
        if (assignment?.car_id) {
            const { data: car } = await admin.from('cars').select('label, plate').eq('id', assignment.car_id).maybeSingle();
            if (car) {
                carDetails = `${car.label || ''} ${car.plate ? '(' + car.plate + ')' : ''}`.trim();
            }
        }

        if (booking.requester_id) {
            await admin.from('notifications').insert({
                user_id: booking.requester_id,
                type: 'Approval',
                title: 'Car booking approved',
                message: `Your car booking for ${booking.date_of_use} (${booking.time_slot}) has been approved.`,
                link: '/user/car-booking'
            });

            // Queue push notification for the user
            const pushTitle = 'Car booking approved';
            const pushMessage = `Your car booking for ${booking.date_of_use} (${booking.time_slot}) is approved.${carDetails ? ` Vehicle: ${carDetails}.` : ''}`;

            const { error: queueError } = await admin.from('push_notification_queue').insert({
                user_id: booking.requester_id,
                title: pushTitle,
                body: pushMessage,
                data: { booking_id: bookingId, type: 'car_booking_approved' }
            });

            if (queueError) {
                console.error('[Car Booking Approve] Failed to queue push notification for user:', queueError);
            } else {
                console.log('[Car Booking Approve] Push notification queued for user');
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

        // Send approval email to user
        try {
            if (userEmail) {
                await sendCarBookingApprovalEmail({
                    to: userEmail,
                    userName: booking.employee_name,
                    dateOfUse: booking.date_of_use,
                    timeSlot: booking.time_slot,
                    destination: booking.destination || undefined,
                    carDetails: carDetails || undefined,
                });
            }
        } catch (e) {
            console.warn('sendCarBookingApprovalEmail to user failed', e);
        }

        try {
            await notifyGoogleChat(NotificationEventType.ADMIN_APPROVE_REQUEST, {
                adminName: me.user?.email,
                adminEmail: me.user?.email,
                userName: booking.employee_name,
                userEmail: '',
                gearNames: [`Car booking: ${booking.date_of_use} ${booking.time_slot}`],
                dueDate: booking.date_of_use
            });
        } catch { }

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
                                title: 'Car booking approved',
                                preheader: 'A booking has been approved',
                                greeting: `Hello ${adminProfile.full_name || 'Admin'},`,
                                message: 'A car booking has been approved and the vehicle is now in service.',
                                sections: [{
                                    heading: 'Booking details',
                                    rows: [
                                        { label: 'Employee', value: booking.employee_name },
                                        { label: 'Date of use', value: booking.date_of_use },
                                        { label: 'Time slot', value: booking.time_slot },
                                        { label: 'Assigned vehicle', value: carDetails || 'Not provided' },
                                    ]
                                }],
                                ctaLabel: 'View bookings',
                                ctaHref: 'https://nestbyeden.app/admin/manage-car-bookings',
                                footerNote: 'Nest by Eden Oasis · Vehicle management',
                            });
                            await sendGearRequestEmail({
                                to: adminProfile.email,
                                subject: `Car booking approved - ${booking.employee_name}`,
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

        return ok(null, 'Car booking approved.');
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return fail(500, msg, 'We could not complete approval right now. Please try again.', 'CAR_BOOKING_APPROVE_UNEXPECTED_ERROR');
    }
}
