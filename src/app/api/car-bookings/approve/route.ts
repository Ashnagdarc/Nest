import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';
import { sendGearRequestEmail, sendCarBookingApprovalEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const admin = await createSupabaseServerClient(true);
        const { bookingId } = await request.json();
        if (!bookingId) return NextResponse.json({ success: false, error: 'bookingId is required' }, { status: 400 });

        const { data: booking, error: selErr } = await admin.from('car_bookings').select('*').eq('id', bookingId).maybeSingle();
        if (selErr || !booking) return NextResponse.json({ success: false, error: selErr?.message || 'Not found' }, { status: 404 });
        if (booking.status === 'Approved') return NextResponse.json({ success: true, data: { message: 'Already approved' } });

        // Enforce: only one Approved per user per day
        if (booking.requester_id) {
            const { count: alreadyApproved } = await admin
                .from('car_bookings')
                .select('*', { count: 'exact', head: true })
                .eq('requester_id', booking.requester_id)
                .eq('date_of_use', booking.date_of_use)
                .eq('status', 'Approved');
            if ((alreadyApproved || 0) > 0) {
                return NextResponse.json({ success: false, error: 'User already has an approved car booking for this date.' }, { status: 400 });
            }
        }

        // Require assignment before approval
        const { data: assignment } = await admin.from('car_assignment').select('car_id').eq('booking_id', bookingId).maybeSingle();
        if (!assignment?.car_id) {
            return NextResponse.json({ success: false, error: 'Assign a car before approval.' }, { status: 400 });
        }

        // Prevent approval if car is already assigned to another approved booking for this date/time slot
        const { data: assignments, error: aErr } = await admin
            .from('car_assignment')
            .select('booking_id, car_id')
            .eq('car_id', assignment.car_id);
        if (aErr) return NextResponse.json({ success: false, error: aErr.message }, { status: 400 });

        if ((assignments || []).length > 0) {
            const ids = assignments.map(r => r.booking_id);
            const { data: bookings, error: bErr } = await admin
                .from('car_bookings')
                .select('id, date_of_use, time_slot, status')
                .in('id', ids)
                .eq('date_of_use', booking.date_of_use)
                .neq('status', 'Completed')
                .neq('status', 'Cancelled')
                .neq('id', bookingId);

            if (bErr) return NextResponse.json({ success: false, error: bErr.message }, { status: 400 });

            // Check for exact slot conflict (Slot overlap)
            const slotConflict = (bookings || []).find(b => b.time_slot === booking.time_slot && b.status === 'Approved');
            if (slotConflict) {
                return NextResponse.json({ success: false, error: 'Car is already assigned and approved for this specific time slot.' }, { status: 409 });
            }

            // Check for Physical Handover conflict (Car not returned yet - only for today)
            const today = new Date().toISOString().slice(0, 10);
            if (booking.date_of_use === today) {
                const checkedOut = (bookings || []).find(b => b.status === 'Approved');
                if (checkedOut) {
                    return NextResponse.json({
                        success: false,
                        error: 'Vehicle is currently checked out by another user. It must be returned (marked as Completed) before this booking can be approved.'
                    }, { status: 400 });
                }
            }
        }

        const { data: me } = await admin.auth.getUser();
        const approverId = me.user?.id || null;

        const { error } = await admin.from('car_bookings').update({
            status: 'Approved',
            approved_by: approverId,
            approved_at: new Date().toISOString()
        }).eq('id', bookingId);
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

        if (booking.requester_id) {
            await admin.from('notifications').insert({
                user_id: booking.requester_id,
                type: 'Approval',
                title: 'Car booking approved',
                message: `Your car booking for ${booking.date_of_use} (${booking.time_slot}) has been approved.`,
                link: '/user/car-booking'
            });
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

        // Get assigned car details
        let carDetails = '';
        if (assignment?.car_id) {
            const { data: car } = await admin.from('cars').select('label, plate').eq('id', assignment.car_id).maybeSingle();
            if (car) {
                carDetails = `${car.label || ''} ${car.plate ? '(' + car.plate + ')' : ''}`.trim();
            }
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
                            await sendGearRequestEmail({
                                to: adminProfile.email,
                                subject: `✅ Car Booking Approved - ${booking.employee_name}`,
                                html: `
                                    <!DOCTYPE html>
                                    <html>
                                        <head>
                                            <meta charset="utf-8">
                                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                        </head>
                                        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
                                            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                                                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px 40px; text-align: center;">
                                                    <h1 style="margin: 0; font-size: 24px; font-weight: 600;">✅ Car Booking Approved</h1>
                                                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Vehicle assigned and ready</p>
                                                </div>
                                                <div style="padding: 40px; line-height: 1.6; color: #333;">
                                                    <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">Hello ${adminProfile.full_name || 'Admin'},</h2>
                                                    <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151;">A car booking has been approved by ${me.user?.email || 'an admin'}.</p>
                                                    <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 4px;">
                                                        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #166534;">Approved Booking Details</h3>
                                                        <table style="width: 100%; border-collapse: collapse;">
                                                            <tr>
                                                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Employee:</td>
                                                                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${booking.employee_name}</td>
                                                            </tr>
                                                            <tr>
                                                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Date of Use:</td>
                                                                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${booking.date_of_use}</td>
                                                            </tr>
                                                            <tr>
                                                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Time Slot:</td>
                                                                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${booking.time_slot}</td>
                                                            </tr>
                                                            ${carDetails ? `
                                                            <tr>
                                                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Assigned Vehicle:</td>
                                                                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${carDetails}</td>
                                                            </tr>
                                                            ` : ''}
                                                        </table>
                                                    </div>
                                                    <div style="text-align: center; margin: 32px 0;">
                                                        <a href="https://nestbyeden.app/admin/manage-car-bookings" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">View All Bookings</a>
                                                    </div>
                                                </div>
                                                <div style="background-color: #f7fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                                                    <p style="margin: 0; font-size: 14px; color: #718096;">
                                                        This is an automated notification from <a href="https://nestbyeden.app" style="color: #10b981; text-decoration: none;"><strong>Nest by Eden Oasis</strong></a><br>
                                                        Vehicle Management System
                                                    </p>
                                                </div>
                                            </div>
                                        </body>
                                    </html>
                                `
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

        return NextResponse.json({ success: true });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
