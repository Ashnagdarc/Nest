import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';
import { sendGearRequestEmail, sendCarBookingRejectionEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const admin = await createSupabaseServerClient(true);
        const { bookingId, reason } = await request.json();
        if (!bookingId) return NextResponse.json({ success: false, error: 'bookingId is required' }, { status: 400 });

        const { data: booking, error: selErr } = await admin.from('car_bookings').select('*').eq('id', bookingId).maybeSingle();
        if (selErr || !booking) return NextResponse.json({ success: false, error: selErr?.message || 'Not found' }, { status: 404 });
        if (booking.status === 'Rejected') return NextResponse.json({ success: true });

        const { data: me } = await admin.auth.getUser();
        const actorId = me.user?.id || null;

        const { error } = await admin.from('car_bookings').update({
            status: 'Rejected',
            rejected_by: actorId,
            rejection_reason: reason || null
        }).eq('id', bookingId);
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

        if (booking.requester_id) {
            await admin.from('notifications').insert({
                user_id: booking.requester_id,
                type: 'Rejection',
                title: 'Car booking rejected',
                message: `Your car booking for ${booking.date_of_use} (${booking.time_slot}) has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
                link: '/user/car-booking'
            });

            // Queue push notification for the user
            const pushTitle = 'Your Car Booking Was Rejected';
            const pushMessage = `Your car booking for ${booking.date_of_use} (${booking.time_slot}) has been rejected.${reason ? ` Reason: ${reason}` : ''}`;

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
                                subject: `❌ Car Booking Rejected - ${booking.employee_name}`,
                                html: `
                                    <!DOCTYPE html>
                                    <html>
                                        <head>
                                            <meta charset="utf-8">
                                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                        </head>
                                        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
                                            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                                                <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px 40px; text-align: center;">
                                                    <h1 style="margin: 0; font-size: 24px; font-weight: 600;">❌ Car Booking Rejected</h1>
                                                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Request declined</p>
                                                </div>
                                                <div style="padding: 40px; line-height: 1.6; color: #333;">
                                                    <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">Hello ${adminProfile.full_name || 'Admin'},</h2>
                                                    <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151;">A car booking request has been rejected by ${me.user?.email || 'an admin'}.</p>
                                                    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px;">
                                                        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #991b1b;">Rejected Booking Details</h3>
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
                                                            ${reason ? `
                                                            <tr>
                                                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Reason:</td>
                                                                <td style="padding: 8px 0; color: #1f2937;">${reason}</td>
                                                            </tr>
                                                            ` : ''}
                                                        </table>
                                                    </div>
                                                    <div style="text-align: center; margin: 32px 0;">
                                                        <a href="https://nestbyeden.app/admin/manage-car-bookings" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">View All Bookings</a>
                                                    </div>
                                                </div>
                                                <div style="background-color: #f7fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                                                    <p style="margin: 0; font-size: 14px; color: #718096;">
                                                        This is an automated notification from <a href="https://nestbyeden.app" style="color: #ef4444; text-decoration: none;"><strong>Nest by Eden Oasis</strong></a><br>
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
