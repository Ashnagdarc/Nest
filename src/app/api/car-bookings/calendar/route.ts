import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function toIcsDate(dateStr: string, timeStr: string) {
    // Expect time like "12:00-1:30 PM" or "10:00 AM"; produce DTSTART and DTEND in floating time
    const startEnd = timeStr.includes('-') ? timeStr.split('-') : [timeStr, timeStr];
    const parse = (t: string) => {
        const d = new Date(`${dateStr} ${t}`);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${y}${m}${day}T${hh}${mm}00`;
    };
    return { dtStart: parse(startEnd[0].trim()), dtEnd: parse(startEnd[1].trim()) };
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient(true); // admin to read all approved
        const { searchParams } = new URL(request.url);
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');

        let query = supabase.from('car_bookings').select('*').eq('status', 'Approved');
        if (dateFrom) query = query.gte('date_of_use', dateFrom);
        if (dateTo) query = query.lte('date_of_use', dateTo);
        const { data, error } = await query.order('date_of_use');
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });

        const lines: string[] = [];
        lines.push('BEGIN:VCALENDAR');
        lines.push('VERSION:2.0');
        lines.push('PRODID:-//Nest//CarBookings//EN');
        for (const b of data || []) {
            const { dtStart, dtEnd } = toIcsDate(b.date_of_use, b.time_slot);
            const uid = `${b.id}@nest-car-bookings`;
            lines.push('BEGIN:VEVENT');
            lines.push(`UID:${uid}`);
            lines.push(`DTSTAMP:${dtStart}`);
            lines.push(`DTSTART:${dtStart}`);
            lines.push(`DTEND:${dtEnd}`);
            const summary = `${b.employee_name} - Car Booking`;
            lines.push(`SUMMARY:${summary}`);
            const desc = `Destination: ${b.destination || ''}\\nPurpose: ${b.purpose || ''}`;
            lines.push(`DESCRIPTION:${desc}`);
            lines.push('END:VEVENT');
        }
        lines.push('END:VCALENDAR');

        const body = lines.join('\r\n');
        return new NextResponse(body, {
            status: 200,
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': 'attachment; filename="car-bookings.ics"'
            }
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
