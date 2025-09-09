import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';
import { sendGearRequestEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const admin = await createSupabaseServerClient(true);
        const { bookingId } = await request.json();
        if (!bookingId) return NextResponse.json({ success: false, error: 'bookingId is required' }, { status: 400 });

        const { data: booking, error: selErr } = await admin.from('car_bookings').select('*').eq('id', bookingId).maybeSingle();
        if (selErr || !booking) return NextResponse.json({ success: false, error: selErr?.message || 'Not found' }, { status: 404 });
        if (booking.status === 'Approved') return NextResponse.json({ success: true, data: { message: 'Already approved' } });

        // Require assignment before approval
        const { data: assignment } = await admin.from('car_assignment').select('car_id').eq('booking_id', bookingId).maybeSingle();
        if (!assignment?.car_id) {
            return NextResponse.json({ success: false, error: 'Assign a car before approval.' }, { status: 400 });
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
        try {
            if (process.env.CAR_BOOKINGS_EMAIL_TO) {
                await sendGearRequestEmail({
                    to: process.env.CAR_BOOKINGS_EMAIL_TO,
                    subject: `Car booking approved: ${booking.employee_name}`,
                    html: `<p>Approved car booking.</p><p><b>Name:</b> ${booking.employee_name}<br/><b>Date:</b> ${booking.date_of_use}<br/><b>Time:</b> ${booking.time_slot}</p>`
                });
            }
        } catch { }

        return NextResponse.json({ success: true });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
