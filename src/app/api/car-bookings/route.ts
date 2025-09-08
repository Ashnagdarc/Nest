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

        const { data, error, count } = await query.order('date_of_use', { ascending: true }).range(from, to);
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
        const { employeeName, dateOfUse, timeSlot, destination, purpose } = body || {};
        if (!employeeName || !dateOfUse || !timeSlot) {
            return NextResponse.json({ success: false, error: 'employeeName, dateOfUse and timeSlot are required' }, { status: 400 });
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

        const { data, error } = await supabase.from('car_bookings').insert({
            requester_id: requesterId,
            employee_name: employeeName,
            date_of_use: dateOfUse,
            time_slot: timeSlot,
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
        } catch { }
        try {
            if (process.env.CAR_BOOKINGS_EMAIL_TO) {
                await sendGearRequestEmail({
                    to: process.env.CAR_BOOKINGS_EMAIL_TO,
                    subject: `New car booking: ${employeeName}`,
                    html: `<p>New car booking submitted.</p><p><b>Name:</b> ${employeeName}<br/><b>Date:</b> ${dateOfUse}<br/><b>Time:</b> ${timeSlot}<br/><b>Destination:</b> ${destination || ''}<br/><b>Purpose:</b> ${purpose || ''}</p>`
                });
            }
        } catch { }

        return NextResponse.json({ success: true, data });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
