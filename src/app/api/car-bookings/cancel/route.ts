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

        // Send notification email to admin
        try {
            if (process.env.CAR_BOOKINGS_EMAIL_TO) {
                await sendGearRequestEmail({
                    to: process.env.CAR_BOOKINGS_EMAIL_TO,
                    subject: `Car booking cancelled: ${booking.employee_name}`,
                    html: `<p>Car booking cancelled ${isAdmin ? 'by admin' : 'by user'}.</p><p><b>Name:</b> ${booking.employee_name}<br/><b>Date:</b> ${booking.date_of_use}<br/><b>Time:</b> ${booking.time_slot}${reason ? `<br/><b>Reason:</b> ${reason}` : ''}</p>`
                });
            }
        } catch (e) {
            console.warn('Admin notification email failed', e);
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
