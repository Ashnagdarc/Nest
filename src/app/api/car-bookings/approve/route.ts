import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';
import { sendGearRequestEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const admin = await createSupabaseServerClient(true);
        const { bookingId } = await request.json();
        if (!bookingId) return NextResponse.json({ success: false, error: 'bookingId is required' }, { status: 400 });

        // Single fetch for current status
        const { data: booking, error: selErr } = await admin.from('car_bookings').select('*').eq('id', bookingId).maybeSingle();
        if (selErr || !booking) return NextResponse.json({ success: false, error: selErr?.message || 'Not found' }, { status: 404 });

        // If already approved, return early (no notifications)
        if (booking.status === 'Approved') return NextResponse.json({ success: true, data: { message: 'Already approved' } });

        const { data: me } = await admin.auth.getUser();
        const approverId = me.user?.id || null;

        // Idempotent update: only update rows not already approved and return row
        const { data: updated, error: upErr } = await admin
            .from('car_bookings')
            .update({ status: 'Approved', approved_by: approverId, approved_at: new Date().toISOString() })
            .eq('id', bookingId)
            .neq('status', 'Approved')
            .select('*')
            .maybeSingle();
        if (upErr) return NextResponse.json({ success: false, error: upErr.message }, { status: 400 });

        // If no row returned, someone else approved between read and write → no notifications
        if (!updated) return NextResponse.json({ success: true, data: { message: 'Already approved' } });

        if (updated.requester_id) {
            await admin.from('notifications').insert({
                user_id: updated.requester_id,
                type: 'Approval',
                title: 'Car booking approved',
                message: `Your car booking for ${updated.date_of_use} (${updated.time_slot}) has been approved.`,
                link: '/user/car-booking'
            });
        }

        // Fire-and-forget outbound notifications
        try {
            await notifyGoogleChat(NotificationEventType.ADMIN_APPROVE_REQUEST, {
                adminName: me.user?.email,
                adminEmail: me.user?.email,
                userName: updated.employee_name,
                userEmail: '',
                gearNames: [`Car booking: ${updated.date_of_use} ${updated.time_slot}`],
                dueDate: updated.date_of_use
            });
        } catch { }
        try {
            if (process.env.CAR_BOOKINGS_EMAIL_TO) {
                await sendGearRequestEmail({
                    to: process.env.CAR_BOOKINGS_EMAIL_TO,
                    subject: `Car booking approved: ${updated.employee_name}`,
                    html: `<p>Approved car booking.</p><p><b>Name:</b> ${updated.employee_name}<br/><b>Date:</b> ${updated.date_of_use}<br/><b>Time:</b> ${updated.time_slot}</p>`
                });
            }
        } catch { }

        return NextResponse.json({ success: true });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
