import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';
import { sendGearRequestEmail, sendCarBookingRequestEmail } from '@/lib/email';

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
    try {
        const supabase = await createSupabaseServerClient();
        const body = await request.json();
        const { employeeName, dateOfUse, timeSlot, destination, purpose } = body || {};
        if (!employeeName || !dateOfUse || !timeSlot) {
            return NextResponse.json({ success: false, error: 'timeSlot is required' }, { status: 400 });
        }

        // Rate limit: configurable
        const maxPending = Number(process.env.CAR_BOOKINGS_MAX_PENDING || MAX_PENDING_DEFAULT);
        const { data: me } = await supabase.auth.getUser();
        const requesterId = me.user?.id || null;

        // Prevent exact duplicate bookings (same user, date, and slot)
        if (requesterId) {
            const { data: existing } = await supabase
                .from('car_bookings')
                .select('id')
                .eq('requester_id', requesterId)
                .eq('date_of_use', dateOfUse)
                .eq('time_slot', timeSlot)
                .in('status', ['Pending', 'Approved'])
                .maybeSingle();

            if (existing) {
                return NextResponse.json({ success: false, error: 'You already have a booking for this date and time slot.' }, { status: 409 });
            }
        }
        if (requesterId && Number.isFinite(maxPending)) {
            const { count: pendingCount } = await supabase
                .from('car_bookings')
                .select('*', { count: 'exact', head: true })
                .eq('requester_id', requesterId)
                .eq('status', 'Pending');
            if ((pendingCount || 0) >= maxPending) {
                return NextResponse.json({ success: false, error: `You have too many pending car bookings (limit ${maxPending}).` }, { status: 429 });
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

        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

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
                    purpose: purpose || undefined,
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
                            await sendGearRequestEmail({
                                to: admin.email,
                                subject: `🚗 New Car Booking Request - ${employeeName}`,
                                html: `
                                    <!DOCTYPE html>
                                    <html>
                                        <head>
                                            <meta charset="utf-8">
                                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                        </head>
                                        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
                                            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                                                <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px 40px; text-align: center;">
                                                    <h1 style="margin: 0; font-size: 24px; font-weight: 600;">🚗 New Car Booking Request</h1>
                                                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Action required - Review and assign vehicle</p>
                                                </div>
                                                <div style="padding: 40px; line-height: 1.6; color: #333;">
                                                    <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">Hello ${admin.full_name || 'Admin'},</h2>
                                                    <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151;">A new car booking request has been submitted and requires your review.</p>
                                                    <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 4px;">
                                                        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1e40af;">Booking Details</h3>
                                                        <table style="width: 100%; border-collapse: collapse;">
                                                            <tr>
                                                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Employee:</td>
                                                                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${employeeName}</td>
                                                            </tr>
                                                            <tr>
                                                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Date of Use:</td>
                                                                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${dateOfUse}</td>
                                                            </tr>
                                                            <tr>
                                                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Time Slot:</td>
                                                                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${timeSlot}</td>
                                                            </tr>
                                                            ${destination ? `
                                                            <tr>
                                                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Destination:</td>
                                                                <td style="padding: 8px 0; color: #1f2937;">${destination}</td>
                                                            </tr>
                                                            ` : ''}
                                                            ${purpose ? `
                                                            <tr>
                                                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Purpose:</td>
                                                                <td style="padding: 8px 0; color: #1f2937;">${purpose}</td>
                                                            </tr>
                                                            ` : ''}
                                                        </table>
                                                    </div>
                                                    <div style="text-align: center; margin: 32px 0;">
                                                        <a href="https://nestbyeden.app/admin/manage-car-bookings" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">Review Booking Request</a>
                                                    </div>
                                                    <p style="margin-top: 32px; font-size: 14px; color: #6b7280; line-height: 1.6;">Please review this request and assign an available vehicle if approved.</p>
                                                </div>
                                                <div style="background-color: #f7fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                                                    <p style="margin: 0; font-size: 14px; color: #718096;">
                                                        This is an automated notification from <a href="https://nestbyeden.app" style="color: #3b82f6; text-decoration: none;"><strong>Nest by Eden Oasis</strong></a><br>
                                                        Vehicle Management System
                                                    </p>
                                                </div>
                                            </div>
                                        </body>
                                    </html>
                                `
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

        return NextResponse.json({ success: true, data });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
