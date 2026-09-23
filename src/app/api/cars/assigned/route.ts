import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getRouteAuthContext } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
    try {
        const authContext = await getRouteAuthContext();
        if ('errorResponse' in authContext) {
            return authContext.errorResponse;
        }

        const admin = await createSupabaseServerClient(true);
        const { searchParams } = new URL(request.url);
        const idsParam = searchParams.get('bookingIds') || '';
        const bookingIds = idsParam.split(',').map(s => s.trim()).filter(Boolean);
        if (bookingIds.length === 0) return NextResponse.json({ data: [], error: null });

        if (!authContext.isActiveAdmin) {
            const { data: ownedBookings, error: ownershipError } = await admin
                .from('car_bookings')
                .select('id')
                .eq('requester_id', authContext.user.id)
                .in('id', bookingIds);

            if (ownershipError) {
                return NextResponse.json({ data: [], error: ownershipError.message }, { status: 400 });
            }

            const ownedIds = new Set((ownedBookings || []).map((row) => row.id));
            const unauthorized = bookingIds.some((id) => !ownedIds.has(id));
            if (unauthorized) {
                return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
            }
        }

        const { data, error } = await admin
            .from('car_assignment')
            .select('booking_id, car_id, cars:car_id(label,plate)')
            .in('booking_id', bookingIds);
        if (error) return NextResponse.json({ data: [], error: error.message }, { status: 400 });
        const result = (data || []).map((row) => ({ booking_id: row.booking_id, car_id: row.car_id, label: row.cars?.label || null, plate: row.cars?.plate || null }));
        return NextResponse.json({ data: result, error: null });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ data: [], error: msg }, { status: 500 });
    }
}
