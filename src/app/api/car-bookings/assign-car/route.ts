import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function isCarConflictError(message?: string | null) {
    const msg = (message || '').toLowerCase();
    return msg.includes('currently checked out')
        || msg.includes('already assigned to another approved booking for this date and time slot');
}

export async function POST(request: NextRequest) {
    try {
        const admin = await createSupabaseServerClient(true);
        const { bookingId, carId } = await request.json();
        if (!bookingId || !carId) return NextResponse.json({ success: false, error: 'bookingId and carId are required' }, { status: 400 });

        // Check if car exists and is active
        const { data: car, error: carErr } = await admin
            .from('cars')
            .select('id, active')
            .eq('id', carId)
            .maybeSingle();
        
        if (carErr || !car) {
            return NextResponse.json({ success: false, error: 'Car not found' }, { status: 404 });
        }
        
        if (!car.active) {
            return NextResponse.json({ success: false, error: 'Car is not active and cannot be assigned' }, { status: 400 });
        }

        const { data: booking, error: bErr } = await admin.from('car_bookings').select('*').eq('id', bookingId).maybeSingle();
        if (bErr || !booking) return NextResponse.json({ success: false, error: bErr?.message || 'Booking not found' }, { status: 404 });

        // Prevent double assignment and hard-lock cars with any active approved booking
        const { data: assignments, error: aErr } = await admin
            .from('car_assignment')
            .select('booking_id, car_id')
            .eq('car_id', carId);
        if (aErr) return NextResponse.json({ success: false, error: aErr.message }, { status: 400 });

        if ((assignments || []).length > 0) {
            const ids = assignments.map(r => r.booking_id);
            const { data: relatedBookings, error: relatedErr } = await admin
                .from('car_bookings')
                .select('id, date_of_use, time_slot, status, employee_name')
                .in('id', ids)
                .neq('id', bookingId);
            if (relatedErr) return NextResponse.json({ success: false, error: relatedErr.message }, { status: 400 });

            const approvedConflicts = (relatedBookings || []).filter(b => b.status === 'Approved');
            const slotConflict = approvedConflicts.find(
                (b) => b.date_of_use === booking.date_of_use && b.time_slot === booking.time_slot
            );
            if (slotConflict) {
                return NextResponse.json({ success: false, error: 'Car is already assigned to another approved booking for this date and time slot.' }, { status: 409 });
            }

            const activeLock = approvedConflicts[0];
            if (activeLock) {
                return NextResponse.json({
                    success: false,
                    error: 'Vehicle is currently checked out by another user. It must be returned (marked as Completed) before it can be assigned to a new booking.'
                }, { status: 409 });
            }
        }

        // Upsert assignment
        const { error } = await admin.from('car_assignment').upsert({ booking_id: bookingId, car_id: carId });
        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: isCarConflictError(error.message) ? 409 : 400 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
