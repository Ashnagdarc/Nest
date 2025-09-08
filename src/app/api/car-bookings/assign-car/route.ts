import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const admin = await createSupabaseServerClient(true);
        const { bookingId, carId } = await request.json();
        if (!bookingId || !carId) return NextResponse.json({ success: false, error: 'bookingId and carId are required' }, { status: 400 });

        const { data: booking, error: bErr } = await admin.from('car_bookings').select('*').eq('id', bookingId).maybeSingle();
        if (bErr || !booking) return NextResponse.json({ success: false, error: bErr?.message || 'Booking not found' }, { status: 404 });

        // Overlap warning: same date/time & same car approved
        const { data: conflicts, error: cErr } = await admin
            .from('car_assignment')
            .select('booking_id, car_id')
            .eq('car_id', carId);
        if (cErr) return NextResponse.json({ success: false, error: cErr.message }, { status: 400 });

        let conflict = false;
        if ((conflicts || []).length > 0) {
            const ids = conflicts.map(r => r.booking_id);
            const { data: bookings } = await admin
                .from('car_bookings')
                .select('id, date_of_use, time_slot, status')
                .in('id', ids)
                .eq('date_of_use', booking.date_of_use)
                .eq('time_slot', booking.time_slot)
                .eq('status', 'Approved');
            conflict = (bookings || []).length > 0;
        }

        // Upsert assignment
        const { error } = await admin.from('car_assignment').upsert({ booking_id: bookingId, car_id: carId });
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

        return NextResponse.json({ success: true, conflict });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
