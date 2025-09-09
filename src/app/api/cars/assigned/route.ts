import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const admin = await createSupabaseServerClient(true);
        const { searchParams } = new URL(request.url);
        const idsParam = searchParams.get('bookingIds') || '';
        const bookingIds = idsParam.split(',').map(s => s.trim()).filter(Boolean);
        if (bookingIds.length === 0) return NextResponse.json({ data: [], error: null });
        const { data, error } = await admin
            .from('car_assignment')
            .select('booking_id, car_id, cars:car_id(label,plate)')
            .in('booking_id', bookingIds);
        if (error) return NextResponse.json({ data: [], error: error.message }, { status: 400 });
        const result = (data || []).map((r: any) => ({ booking_id: r.booking_id, car_id: r.car_id, label: r.cars?.label || null, plate: r.cars?.plate || null }));
        return NextResponse.json({ data: result, error: null });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ data: [], error: msg }, { status: 500 });
    }
}
