import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendGearRequestEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const admin = await createSupabaseServerClient(true);
        const userScoped = await createSupabaseServerClient();
        const { data: me } = await userScoped.auth.getUser();
        const userId = me.user?.id;
        const { bookingId } = await request.json();
        if (!bookingId || !userId) return NextResponse.json({ success: false, error: 'bookingId and session required' }, { status: 400 });

        const { data: existing, error: selErr } = await admin
            .from('car_bookings')
            .select('id,status,requester_id,employee_name,date_of_use,time_slot')
            .eq('id', bookingId)
            .maybeSingle();
        if (selErr || !existing) return NextResponse.json({ success: false, error: selErr?.message || 'Not found' }, { status: 404 });
        if (existing.requester_id && existing.requester_id !== userId) return NextResponse.json({ success: false, error: 'Not your booking' }, { status: 403 });
        if (existing.status !== 'Approved') return NextResponse.json({ success: false, error: 'Booking is not in Approved state' }, { status: 400 });

        const { data: updatedRow, error: updErr } = await admin
            .from('car_bookings')
            .update({ status: 'Completed', updated_at: new Date().toISOString() })
            .eq('id', bookingId)
            .select('*')
            .maybeSingle();
        if (updErr) return NextResponse.json({ success: false, error: updErr.message }, { status: 400 });

        // Lookup assigned car and plate if any
        let plateInfo = '';
        const { data: assign } = await admin
            .from('car_assignment')
            .select('car_id')
            .eq('booking_id', bookingId)
            .maybeSingle();
        if (assign?.car_id) {
            const { data: car } = await admin.from('cars').select('label,plate').eq('id', assign.car_id).maybeSingle();
            if (car?.plate || car?.label) plateInfo = `${car?.label || ''} ${car?.plate ? '(' + car.plate + ')' : ''}`;
        }

        try {
            if (process.env.CAR_BOOKINGS_EMAIL_TO) {
                const timestamp = new Date().toISOString();
                await sendGearRequestEmail({
                    to: process.env.CAR_BOOKINGS_EMAIL_TO,
                    subject: `Car returned: ${existing.employee_name}`,
                    html: `<p>User has returned a car booking.</p><p><b>Name:</b> ${existing.employee_name}<br/><b>Date:</b> ${existing.date_of_use}<br/><b>Time:</b> ${existing.time_slot}<br/><b>Car:</b> ${plateInfo || 'N/A'}<br/><b>Returned at:</b> ${timestamp}</p>`
                });
            }
        } catch { }

        return NextResponse.json({ success: true, data: updatedRow });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
