import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendGearRequestEmail, sendCarBookingCancellationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const admin = await createSupabaseServerClient(true);
        const { bookingId, reason } = await request.json();
        
        if (!bookingId) {
            return NextResponse.json({ success: false, error: 'bookingId is required' }, { status: 400 });
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
            return NextResponse.json({ success: false, error: selErr?.message || 'Booking not found' }, { status: 404 });
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
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        // Idempotency: if already cancelled, return success
        if (booking.status === 'Cancelled') {
            return NextResponse.json({ success: true, message: 'Booking already cancelled' });
        }

        // Validate status
        if (!['Pending', 'Approved'].includes(booking.status)) {
            return NextResponse.json(
                { success: false, error: `Cannot cancel booking with status: ${booking.status}` },
                { status: 400 }
            );
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
                    { success: false, error: 'Cannot cancel past approved bookings' },
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
            return NextResponse.json({ success: false, error: updateErr.message }, { status: 400 });
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
                            await sendGearRequestEmail({
                                to: adminProfile.email,
                                subject: `🚫 Car Booking Cancelled - ${booking.employee_name}`,
                                html: `
                                    <!DOCTYPE html>
                                    <html>
                                        <head>
                                            <meta charset="utf-8">
                                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                        </head>
                                        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
                                            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                                                <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px 40px; text-align: center;">
                                                    <h1 style="margin: 0; font-size: 24px; font-weight: 600;">🚫 Car Booking Cancelled</h1>
                                                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Cancelled by ${isAdmin ? 'admin' : 'user'}</p>
                                                </div>
                                                <div style="padding: 40px; line-height: 1.6; color: #333;">
                                                    <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">Hello ${adminProfile.full_name || 'Admin'},</h2>
                                                    <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151;">A car booking has been cancelled ${isAdmin ? 'by an administrator' : 'by the user'}. The assigned vehicle (if any) has been freed.</p>
                                                    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
                                                        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #92400e;">Cancelled Booking Details</h3>
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
                                                        <a href="https://nestbyeden.app/admin/manage-car-bookings" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">View All Bookings</a>
                                                    </div>
                                                </div>
                                                <div style="background-color: #f7fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                                                    <p style="margin: 0; font-size: 14px; color: #718096;">
                                                        This is an automated notification from <a href="https://nestbyeden.app" style="color: #f59e0b; text-decoration: none;"><strong>Nest by Eden Oasis</strong></a><br>
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
