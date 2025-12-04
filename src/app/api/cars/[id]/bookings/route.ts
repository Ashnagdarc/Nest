import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const admin = await createSupabaseServerClient(true);
        const { id: carId } = await params;
        const { data: assignmentRows, error: aErr } = await admin
            .from('car_assignment')
            .select('booking_id')
            .eq('car_id', carId)
            .order('created_at', { ascending: false })
            .limit(20);
        if (aErr) return NextResponse.json({ data: [], error: aErr.message }, { status: 400 });
        const bookingIds = (assignmentRows || []).map(r => r.booking_id);
        if (bookingIds.length === 0) return NextResponse.json({ data: [], error: null });
        const { data: bookings, error: bErr } = await admin
            .from('car_bookings')
            .select('*')
            .in('id', bookingIds)
            .order('updated_at', { ascending: false });
        if (bErr) return NextResponse.json({ data: [], error: bErr.message }, { status: 400 });
        return NextResponse.json({ data: bookings || [], error: null });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ data: [], error: msg }, { status: 500 });
    }
}
