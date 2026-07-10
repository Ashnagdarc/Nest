import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';
import { minimalEmailLayout, sendGearRequestEmail, sendCarBookingRequestEmail } from '@/lib/email';
import { createBookingAggregate } from '@/lib/bookings-v2/service';
import { randomUUID } from 'crypto';
import { sitePath } from '@/lib/site-url';

const MAX_PENDING_DEFAULT = 2;

export async function GET(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
        const status = searchParams.get('status');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const userId = searchParams.get('userId');
        const dateOfUse = searchParams.get('dateOfUse');
        const timeSlot = searchParams.get('timeSlot');
        const carId = searchParams.get('carId');
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // Base query
        let query = supabase.from('car_bookings').select('*', { count: 'exact' });
        if (status) query = query.eq('status', status);
        if (dateFrom) query = query.gte('date_of_use', dateFrom);
        if (dateTo) query = query.lte('date_of_use', dateTo);
        if (userId) query = query.eq('requester_id', userId);
        if (dateOfUse) query = query.eq('date_of_use', dateOfUse);
        if (timeSlot) query = query.eq('time_slot', timeSlot);

        // carId filter by joining assignment
        if (carId) {
            const { data: bookingIds, error: aErr } = await supabase
                .from('car_assignment')
                .select('booking_id')
                .eq('car_id', carId);
            if (aErr) return NextResponse.json({ data: [], total: 0, error: aErr.message }, { status: 400 });
            const ids = (bookingIds || []).map(r => r.booking_id);
            if (ids.length === 0) {
                return NextResponse.json({ data: [], total: 0, error: null });
            }
            query = query.in('id', ids);
        }

        const { data, error, count } = await query.order('date_of_use', { ascending: true }).order('start_time', { ascending: true }).range(from, to);
        if (error) return NextResponse.json({ data: [], total: 0, error: error.message }, { status: 400 });
        return NextResponse.json({ data, total: count || 0, error: null });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ data: [], total: 0, error: msg }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const correlationId = randomUUID();
    const ok = (booking: unknown, userMessage: string, warnings: string[] = []) =>
        NextResponse.json({ success: true, booking, items: [], warnings, user_message: userMessage, error_code: null, correlation_id: correlationId });
    const fail = (status: number, error: string, userMessage: string, errorCode: string) =>
        NextResponse.json({ success: false, booking: null, items: [], warnings: [], user_message: userMessage, error_code: errorCode, correlation_id: correlationId, error }, { status });
    try {
        const supabase = await createSupabaseServerClient();
        const body = await request.json();
        const { employeeName, dateOfUse, timeSlot, preferredCarId, destination, purpose } = body || {};
        if (!employeeName || !dateOfUse || !timeSlot) {
            return fail(400, 'timeSlot is required', 'Please provide employee name, date, and time slot.', 'CAR_BOOKING_VALIDATION_FAILED');
        }

        // Rate limit: configurable
        const maxPending = Number(process.env.CAR_BOOKINGS_MAX_PENDING || MAX_PENDING_DEFAULT);
        const { data: me } = await supabase.auth.getUser();
        const requesterId = me.user?.id || null;
        if (!requesterId) {
            return fail(401, 'No authenticated user found', 'Please sign in before booking a car.', 'CAR_BOOKING_UNAUTHORIZED');
        }

        // Prevent exact duplicate bookings (same user, date, and slot)
        {
            const { data: existing } = await supabase
                .from('car_bookings')
                .select('id')
                .eq('requester_id', requesterId)
                .eq('date_of_use', dateOfUse)
                .eq('time_slot', timeSlot)
                .in('status', ['Pending', 'Approved'])
                .maybeSingle();

            if (existing) {
                return fail(409, 'You already have a booking for this date and time slot.', 'You already have a booking for this date and time slot.', 'CAR_BOOKING_DUPLICATE');
            }
        }
        if (Number.isFinite(maxPending)) {
            const { count: pendingCount } = await supabase
                .from('car_bookings')
                .select('*', { count: 'exact', head: true })
                .eq('requester_id', requesterId)
                .eq('status', 'Pending');
            if ((pendingCount || 0) >= maxPending) {
                return fail(429, `You have too many pending car bookings (limit ${maxPending}).`, `You have reached the pending booking limit (${maxPending}).`, 'CAR_BOOKING_LIMIT_REACHED');
            }
        }

        const { data, error } = await supabase.from('car_bookings').insert({
            requester_id: requesterId,
            employee_name: employeeName,
            date_of_use: dateOfUse,
            time_slot: timeSlot,
            start_time: null,
            end_time: null,
            destination: destination || null,
            purpose: purpose || null,
            status: 'Pending'
        }).select('*').maybeSingle();

        if (error) return fail(400, error.message, 'We could not create your booking right now.', 'CAR_BOOKING_CREATE_FAILED');

        let preferredCarDetails: { label?: string; plate?: string } | null = null;
        if (preferredCarId && data?.id) {
            const { data: requestedCar, error: carErr } = await supabase
                .from('cars')
                .select('id,label,plate,status,active')
                .eq('id', preferredCarId)
                .maybeSingle();

            if (carErr || !requestedCar) {
                return fail(400, carErr?.message || 'Preferred car not found', 'Selected vehicle is not available. Please refresh and try again.', 'CAR_BOOKING_PREFERRED_CAR_INVALID');
            }

            if (requestedCar.status === 'Retired') {
                return fail(400, 'Preferred car is retired', 'Selected vehicle cannot be requested.', 'CAR_BOOKING_PREFERRED_CAR_RETIRED');
            }

            if (!requestedCar.active || requestedCar.status !== 'Available') {
                return fail(409, 'Preferred car is not available', 'Selected vehicle is currently unavailable.', 'CAR_BOOKING_PREFERRED_CAR_UNAVAILABLE');
            }

            const { data: assignments, error: assignmentCheckError } = await supabase
                .from('car_assignment')
                .select('booking_id')
                .eq('car_id', preferredCarId);

            if (assignmentCheckError) {
                return fail(400, assignmentCheckError.message, 'Could not verify selected vehicle availability.', 'CAR_BOOKING_PREFERRED_CAR_CHECK_FAILED');
            }

            if ((assignments || []).length > 0) {
                const bookingIds = assignments.map((a) => a.booking_id);
                const { data: relatedBookings, error: relatedBookingsError } = await supabase
                    .from('car_bookings')
                    .select('id,status,date_of_use,time_slot')
                    .in('id', bookingIds)
                    .neq('id', data.id);

                if (relatedBookingsError) {
                    return fail(400, relatedBookingsError.message, 'Could not verify selected vehicle availability.', 'CAR_BOOKING_PREFERRED_CAR_CHECK_FAILED');
                }

                const blocked = (relatedBookings || []).find((b) => b.status === 'Approved');
                if (blocked) {
                    return fail(409, 'Preferred car currently checked out', 'Selected vehicle is currently checked out by another approved booking.', 'CAR_BOOKING_PREFERRED_CAR_LOCKED');
                }
            }

            const { error: assignErr } = await supabase
                .from('car_assignment')
                .insert({ booking_id: data.id, car_id: preferredCarId });

            if (!assignErr) {
                preferredCarDetails = { label: requestedCar.label, plate: requestedCar.plate || undefined };
            } else {
                console.warn('[Car Booking] Failed to persist preferred car assignment:', assignErr);
            }
        }

        // Dual-run synchronization: keep v2 aggregate in lock-step with legacy row creation.
        try {
            if (requesterId && data?.id) {
                await createBookingAggregate({
                    sourceType: 'car_booking',
                    sourceId: data.id,
                    requesterId,
                    startAt: `${dateOfUse}T00:00:00.000Z`,
                    endAt: `${dateOfUse}T23:59:59.000Z`,
                    idempotencyKey: `legacy-car-create:${data.id}`,
                    metadata: {
                        date_of_use: dateOfUse,
                        time_slot: timeSlot,
                        destination: destination || null,
                        purpose: purpose || null,
                    },
                    items: [],
                });
            }
        } catch (syncError) {
            console.error('[Car Booking] Failed to sync booking to v2 aggregate:', syncError);
        }

        // Create in-app notification for user
        if (requesterId) {
            await supabase.from('notifications').insert({
                user_id: requesterId,
                type: 'Request',
                title: 'Car booking request submitted',
                message: `Your car booking request for ${dateOfUse} (${timeSlot}) has been submitted and is pending approval.${preferredCarDetails?.label ? ` Preferred car: ${preferredCarDetails.label}${preferredCarDetails.plate ? ` (${preferredCarDetails.plate})` : ''}.` : ''}`,
                link: '/user/car-booking'
            });
        }

        // Queue push notification for the user
        if (requesterId) {
            const pushTitle = 'Car Booking Request Submitted';
            const pushMessage = `Your request for a car on ${dateOfUse} (${timeSlot}) has been submitted.${preferredCarDetails?.label ? ` Preferred: ${preferredCarDetails.label}${preferredCarDetails.plate ? ` (${preferredCarDetails.plate})` : ''}.` : ''} You will be notified when the admin approves or rejects it.`;

            const { error: queueError } = await supabase.from('push_notification_queue').insert({
                user_id: requesterId,
                title: pushTitle,
                body: pushMessage,
                data: { booking_id: data.id, type: 'car_booking_request' }
            });

            if (queueError) {
                console.error('[Car Booking Request] Failed to queue push notification for user:', queueError);
            } else {
                console.log('[Car Booking Request] Push notification queued for user');
            }
        }

        // Fire-and-forget notifications
        try {
            await notifyGoogleChat(NotificationEventType.USER_REQUEST, {
                userName: employeeName,
                userEmail: me.user?.email,
                gearNames: [`Car booking: ${dateOfUse} ${timeSlot}`],
                reason: purpose,
                destination,
                duration: 'N/A'
            });
        } catch (e) {
            console.warn('notifyGoogleChat failed', e);
        }

        // Send confirmation email to user
        try {
            if (me.user?.email) {
                await sendCarBookingRequestEmail({
                    to: me.user.email,
                    userName: employeeName,
                    dateOfUse,
                    timeSlot,
                    destination: destination || undefined,
                    purpose: preferredCarDetails?.label
                      ? `${purpose ? `${purpose} | ` : ''}Preferred car: ${preferredCarDetails.label}${preferredCarDetails.plate ? ` (${preferredCarDetails.plate})` : ''}`
                      : purpose || undefined,
                });
            }
        } catch (e) {
            console.warn('sendCarBookingRequestEmail to user failed', e);
        }

        // Send notification email to all admins
        try {
            // Create admin client to bypass RLS for querying profiles
            const adminSupabase = await createSupabaseServerClient(true);
            const { data: admins } = await adminSupabase
                .from('profiles')
                .select('id, email, full_name')
                .eq('role', 'Admin')
                .eq('status', 'Active');

            console.log(`[Car Booking] Found ${admins?.length || 0} admins to notify`);

            if (admins && Array.isArray(admins)) {
                for (const admin of admins) {
                    console.log(`[Car Booking] Processing admin: ${admin.email}`);
                    if (admin.email) {
                        try {
                            console.log(`[Car Booking] Sending email to: ${admin.email}`);
                            const adminHtml = minimalEmailLayout({
                                title: 'Car booking request',
                                preheader: 'A car booking is waiting for review',
                                greeting: `Hello ${admin.full_name || 'Admin'},`,
                                message: 'A new car booking request has been submitted and needs review.',
                                sections: [{
                                    heading: 'Booking details',
                                    rows: [
                                        { label: 'Employee', value: employeeName },
                                        { label: 'Date of use', value: dateOfUse },
                                        { label: 'Time slot', value: timeSlot },
                                        { label: 'Destination', value: destination || 'Not provided' },
                                        { label: 'Purpose', value: purpose || 'Not provided' },
                                        { label: 'Preferred vehicle', value: preferredCarDetails ? `${preferredCarDetails.label}${preferredCarDetails.plate ? ` (${preferredCarDetails.plate})` : ''}` : 'Not selected' },
                                    ]
                                }],
                                ctaLabel: 'Review booking',
                                ctaHref: sitePath('/admin/manage-car-bookings'),
                                footerNote: 'Nest by Eden Oasis · Vehicle management',
                            });
                            await sendGearRequestEmail({
                                to: admin.email,
                                subject: `Car booking request - ${employeeName}`,
                                html: adminHtml,
                            });
                            console.log(`[Car Booking] ✅ Email sent successfully to: ${admin.email}`);
                        } catch (emailError) {
                            console.error(`[Car Booking] ❌ Failed to send email to admin ${admin.email}:`, emailError);
                        }
                    } else {
                        console.warn(`[Car Booking] ⚠️ Admin has no email: ${admin.full_name}`);
                    }
                }

                // Queue push notifications for all admins
                for (const admin of admins) {
                    const { error: queueError } = await adminSupabase.from('push_notification_queue').insert({
                        user_id: admin.id,
                        title: 'New Car Booking Request',
                        body: `${employeeName} requested a car booking for ${dateOfUse} (${timeSlot}). Please review.`,
                        data: { booking_id: data.id, type: 'car_booking_request' }
                    });

                    if (queueError) {
                        console.error(`[Car Booking] Failed to queue push notification for admin ${admin.id}:`, queueError);
                    }
                }
                console.log(`[Car Booking] Push notifications queued for ${admins.length} admins`);
            } else {
                console.warn('[Car Booking] No admins found or admins is not an array');
            }
        } catch (e) {
            console.error('[Car Booking] Failed to notify admins by email:', e);
        }

        return ok(data, 'Car booking request submitted.');
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ success: false, booking: null, items: [], warnings: [], user_message: 'We could not create your booking right now. Please try again.', error_code: 'CAR_BOOKING_UNEXPECTED_ERROR', correlation_id: correlationId, error: msg }, { status: 500 });
    }
}
