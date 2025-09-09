import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';
import { sendGearRequestEmail } from '@/lib/email';

const MAX_PENDING_DEFAULT = 2;

export async function GET(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
        const status = searchParams.get('status');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const userId = searchParams.get('userId');
        const dateOfUse = searchParams.get('dateOfUse');
        const timeSlot = searchParams.get('timeSlot');
        const startTime = searchParams.get('startTime');
        const endTime = searchParams.get('endTime');
        const carId = searchParams.get('carId');
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // Base query
        let query = supabase.from('car_bookings').select('*', { count: 'exact' });
        if (status) query = query.eq('status', status);
        if (dateFrom) query = query.gte('date_of_use', dateFrom);
        if (dateTo) query = query.lte('date_of_use', dateTo);
        if (userId) query = query.eq('requester_id', userId);
        if (dateOfUse) query = query.eq('date_of_use', dateOfUse);
        if (timeSlot) query = query.eq('time_slot', timeSlot);
        if (startTime) query = query.gte('start_time', startTime);
        if (endTime) query = query.lte('end_time', endTime);

        // carId filter by joining assignment
        if (carId) {
            const { data: bookingIds, error: aErr } = await supabase
                .from('car_assignment')
                .select('booking_id')
                .eq('car_id', carId);
            if (aErr) return NextResponse.json({ data: [], total: 0, error: aErr.message }, { status: 400 });
            const ids = (bookingIds || []).map(r => r.booking_id);
            if (ids.length === 0) {
                return NextResponse.json({ data: [], total: 0, error: null });
            }
            query = query.in('id', ids);
        }

        const { data, error, count } = await query.order('date_of_use', { ascending: true }).order('start_time', { ascending: true }).range(from, to);
        if (error) return NextResponse.json({ data: [], total: 0, error: error.message }, { status: 400 });
        return NextResponse.json({ data, total: count || 0, error: null });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ data: [], total: 0, error: msg }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const body = await request.json();
        const { employeeName, dateOfUse, timeSlot, destination, purpose, startTime, endTime } = body || {};
        if (!employeeName || !dateOfUse || (!timeSlot && !(startTime && endTime))) {
            return NextResponse.json({ success: false, error: 'Provide timeSlot or startTime+endTime' }, { status: 400 });
        }

        // Business hours guard: 09:00–18:00
        const inBusinessHours = (t: string) => {
            const [h, m] = t.split(':').map(Number);
            const minutes = h * 60 + m;
            return minutes >= 9 * 60 && minutes <= 18 * 60; // inclusive end means 18:00 allowed as end
        };
        if (startTime && !inBusinessHours(startTime)) {
            return NextResponse.json({ success: false, error: 'Start time must be within business hours (09:00–18:00).' }, { status: 400 });
        }
        if (endTime && !inBusinessHours(endTime)) {
            return NextResponse.json({ success: false, error: 'End time must be within business hours (09:00–18:00).' }, { status: 400 });
        }

        // If start/end provided, block overlaps for same day (any status in Pending/Approved)
        if (startTime && endTime) {
            const { data: dayBookings, error: dErr } = await supabase
                .from('car_bookings')
                .select('id, start_time, end_time, status')
                .eq('date_of_use', dateOfUse)
                .in('status', ['Pending', 'Approved']);
            if (dErr) return NextResponse.json({ success: false, error: dErr.message }, { status: 400 });
            const overlaps = (dayBookings || []).some(b => b.start_time && b.end_time && !(endTime <= b.start_time || startTime >= b.end_time));
            if (overlaps) {
                return NextResponse.json({ success: false, error: 'Selected time overlaps another booking for that day.' }, { status: 409 });
            }
        }

        // Rate limit: configurable
        const maxPending = Number(process.env.CAR_BOOKINGS_MAX_PENDING || MAX_PENDING_DEFAULT);
        const { data: me } = await supabase.auth.getUser();
        const requesterId = me.user?.id || null;
        if (requesterId && Number.isFinite(maxPending)) {
            const { count: pendingCount } = await supabase
                .from('car_bookings')
                .select('*', { count: 'exact', head: true })
                .eq('requester_id', requesterId)
                .eq('status', 'Pending');
            if ((pendingCount || 0) >= maxPending) {
                return NextResponse.json({ success: false, error: `You have too many pending car bookings (limit ${maxPending}).` }, { status: 429 });
            }
        }

        // Derive a legacy time_slot string if only start/end were provided to satisfy NOT NULL constraint
        const derivedSlot = (!timeSlot && startTime && endTime) ? `${startTime}-${endTime}` : timeSlot;

        const { data, error } = await supabase.from('car_bookings').insert({
            requester_id: requesterId,
            employee_name: employeeName,
            date_of_use: dateOfUse,
            time_slot: derivedSlot,
            start_time: startTime || null,
            end_time: endTime || null,
            destination: destination || null,
            purpose: purpose || null,
            status: 'Pending'
        }).select('*').maybeSingle();

        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

        // Fire-and-forget notifications
        try {
            await notifyGoogleChat(NotificationEventType.USER_REQUEST, {
                userName: employeeName,
                userEmail: me.user?.email,
                gearNames: [`Car booking: ${dateOfUse} ${timeSlot}`],
                reason: purpose,
                destination,
                duration: 'N/A'
            });
        } catch (e) {
            console.warn('notifyGoogleChat failed', e);
        }
        try {
            if (process.env.CAR_BOOKINGS_EMAIL_TO) {
                await sendGearRequestEmail({
                    to: process.env.CAR_BOOKINGS_EMAIL_TO,
                    subject: `New car booking: ${employeeName}`,
                    html: `<p>New car booking submitted.</p><p><b>Name:</b> ${employeeName}<br/><b>Date:</b> ${dateOfUse}<br/><b>Time:</b> ${timeSlot}<br/><b>Destination:</b> ${destination || ''}<br/><b>Purpose:</b> ${purpose || ''}</p>`
                });
            }
        } catch (e) {
            console.warn('sendGearRequestEmail failed', e);
        }

        return NextResponse.json({ success: true, data });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
