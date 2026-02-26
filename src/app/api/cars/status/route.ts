import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
    try {
        const admin = await createSupabaseServerClient(true);
        const { data: cars, error: cErr } = await admin.from('cars').select('id,label,plate,image_url,status').neq('status', 'Retired');
        if (cErr) return NextResponse.json({ data: [], error: cErr.message }, { status: 400 });

        const { data: approvedBookings, error: approvedErr } = await admin
            .from('car_bookings')
            .select('id, employee_name, date_of_use, time_slot, approved_at')
            .eq('status', 'Approved')
            .order('approved_at', { ascending: true, nullsFirst: true });
        if (approvedErr) return NextResponse.json({ data: [], error: approvedErr.message }, { status: 400 });

        const approvedIds = (approvedBookings || []).map(b => b.id);
        const bookingById = new Map((approvedBookings || []).map(b => [b.id, b]));
        const locksByCarId = new Map<string, {
            booking_id: string;
            employee_name?: string | null;
            date_of_use?: string | null;
            time_slot?: string | null;
        }>();

        if (approvedIds.length > 0) {
            const { data: assigned } = await admin
                .from('car_assignment')
                .select('car_id, booking_id')
                .in('booking_id', approvedIds);
            (assigned || []).forEach((a) => {
                if (!a.car_id || locksByCarId.has(a.car_id)) return;
                const booking = bookingById.get(a.booking_id);
                if (!booking) return;
                locksByCarId.set(a.car_id, {
                    booking_id: booking.id,
                    employee_name: booking.employee_name,
                    date_of_use: booking.date_of_use,
                    time_slot: booking.time_slot,
                });
            });
        }

        const response = (cars || []).map((c) => {
            const lock = locksByCarId.get(c.id);
            const lockReason = lock
                ? `Checked out${lock.employee_name ? ` by ${lock.employee_name}` : ''}${lock.date_of_use ? ` on ${lock.date_of_use}` : ''}${lock.time_slot ? ` (${lock.time_slot})` : ''}; mark booking as Completed to release`
                : null;

            return {
                id: c.id,
                label: c.label,
                plate: c.plate,
                status: c.status,
                in_use: !!lock,
                image_url: c.image_url || null,
                locked_by_booking_id: lock?.booking_id || null,
                lock_reason: lockReason,
                locked_booking_employee_name: lock?.employee_name || null,
                locked_booking_date_of_use: lock?.date_of_use || null,
                locked_booking_time_slot: lock?.time_slot || null,
            };
        });

        return NextResponse.json({ data: response, error: null });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ data: [], error: msg }, { status: 500 });
    }
}
