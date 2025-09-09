import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
    try {
        const admin = await createSupabaseServerClient(true);
        const { data: cars, error: cErr } = await admin.from('cars').select('id,label,plate,active,image_url').eq('active', true);
        if (cErr) return NextResponse.json({ data: [], error: cErr.message }, { status: 400 });
        const today = new Date().toISOString().slice(0, 10);
        const { data: approvedToday } = await admin
            .from('car_bookings')
            .select('id')
            .eq('status', 'Approved')
            .eq('date_of_use', today);
        const approvedIds = (approvedToday || []).map(b => b.id);
        let usedCarIds = new Set<string>();
        if (approvedIds.length > 0) {
            const { data: assigned } = await admin
                .from('car_assignment')
                .select('car_id, booking_id')
                .in('booking_id', approvedIds);
            (assigned || []).forEach(a => a.car_id && usedCarIds.add(a.car_id));
        }
        const response = (cars || []).map(c => ({ id: c.id, label: c.label, plate: c.plate, in_use: usedCarIds.has(c.id), image_url: c.image_url || null }));
        return NextResponse.json({ data: response, error: null });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ data: [], error: msg }, { status: 500 });
    }
}
