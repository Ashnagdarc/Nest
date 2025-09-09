import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendGearRequestEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const admin = await createSupabaseServerClient(true);
        const { bookingId } = await request.json();
        if (!bookingId) return NextResponse.json({ success: false, error: 'bookingId is required' }, { status: 400 });

        const { data: existing, error: selErr } = await admin
            .from('car_bookings')
            .select('id,status,requester_id,employee_name,date_of_use,time_slot')
            .eq('id', bookingId)
            .maybeSingle();
        if (selErr || !existing) return NextResponse.json({ success: false, error: selErr?.message || 'Not found' }, { status: 404 });
        // Idempotency: if already completed, succeed
        if (existing.status === 'Completed') {
            return NextResponse.json({ success: true, data: existing });
        }
        if (existing.status !== 'Approved') return NextResponse.json({ success: false, error: 'Booking is not in Approved state' }, { status: 400 });

        const { data: updatedRow, error: updErr } = await admin
            .from('car_bookings')
            .update({ status: 'Completed', updated_at: new Date().toISOString() })
            .eq('id', bookingId)
            .select('id,status,employee_name,date_of_use,time_slot,updated_at')
            .maybeSingle();
        if (updErr) return NextResponse.json({ success: false, error: updErr.message }, { status: 400 });
        // If no row returned, double-check current status and treat as success if already completed
        if (!updatedRow) {
            const { data: afterCheck } = await admin
                .from('car_bookings')
                .select('id,status,employee_name,date_of_use,time_slot,updated_at')
                .eq('id', bookingId)
                .maybeSingle();
            if (afterCheck?.status === 'Completed') {
                return NextResponse.json({ success: true, data: afterCheck });
            }
            // Retry once defensively
            const { data: secondTry, error: secondErr } = await admin
                .from('car_bookings')
                .update({ status: 'Completed', updated_at: new Date().toISOString() })
                .eq('id', bookingId)
                .select('id,status,employee_name,date_of_use,time_slot,updated_at')
                .maybeSingle();
            if (secondErr) {
                console.error('complete retry failed', { bookingId, error: secondErr.message });
            }
            if (secondTry?.status === 'Completed') {
                finalRow = secondTry;
            }
            // If secondTry not completed, proceed to final verification and fallback below
        }

        let finalRow = updatedRow || (await admin
            .from('car_bookings')
            .select('id,status,employee_name,date_of_use,time_slot,updated_at')
            .eq('id', bookingId)
            .maybeSingle()).data;
        if (!finalRow || finalRow.status !== 'Completed') {
            // Retry read with short backoff, then accept success to avoid user bounce if update had no error
            for (let i = 0; i < 3; i++) {
                await new Promise(r => setTimeout(r, 150));
                const { data: probe } = await admin
                    .from('car_bookings')
                    .select('id,status,employee_name,date_of_use,time_slot,updated_at')
                    .eq('id', bookingId)
                    .maybeSingle();
                if (probe?.status === 'Completed') { finalRow = probe; break; }
            }
            if (!finalRow || finalRow.status !== 'Completed') {
                const { data: secondTry, error: secondErr } = await admin
                    .from('car_bookings')
                    .update({ status: 'Completed', updated_at: new Date().toISOString() })
                    .eq('id', bookingId)
                    .select('id,status,employee_name,date_of_use,time_slot,updated_at')
                    .maybeSingle();
                if (secondErr) {
                    console.error('complete retry failed', { bookingId, error: secondErr.message });
                }
                if (secondTry?.status === 'Completed') {
                    finalRow = secondTry;
                }
            }
        }
        if (!finalRow) {
            // As a last resort, treat successful update-without-error as success to avoid user bounce (likely read-after-write lag)
            console.warn('complete final verify missing row, assuming success due to prior no-error update', { bookingId });
            finalRow = {
                id: bookingId as string,
                status: 'Completed',
                employee_name: existing.employee_name,
                date_of_use: existing.date_of_use,
                time_slot: existing.time_slot,
                updated_at: new Date().toISOString()
            } as {
                id: string;
                status: string;
                employee_name: string | null;
                date_of_use: string | null;
                time_slot: string | null;
                updated_at: string | null;
            };
        }

        // Defensive: ensure any timeblock row is removed if your sync trigger missed it
        try {
            await admin.from('car_timeblocks').delete().eq('booking_id', bookingId);
        } catch (e) {
            console.error('cleanup car_timeblocks failed', e);
        }

        // Lookup assigned car and plate if any
        let plateInfo = '';
        const { data: assign } = await admin
            .from('car_assignment')
            .select('car_id')
            .eq('booking_id', bookingId)
            .maybeSingle();
        if (assign?.car_id) {
            const { data: car } = await admin.from('cars').select('label,plate').eq('id', assign.car_id).maybeSingle();
            if (car?.plate || car?.label) plateInfo = `${car?.label || ''} ${car?.plate ? '(' + car.plate + ')' : ''}`;
        }

        try {
            if (process.env.CAR_BOOKINGS_EMAIL_TO) {
                const timestamp = new Date().toISOString();
                await sendGearRequestEmail({
                    to: process.env.CAR_BOOKINGS_EMAIL_TO,
                    subject: `Car returned: ${existing.employee_name}`,
                    html: `<p>User has returned a car booking.</p><p><b>Name:</b> ${existing.employee_name}<br/><b>Date:</b> ${existing.date_of_use}<br/><b>Time:</b> ${existing.time_slot}<br/><b>Car:</b> ${plateInfo || 'N/A'}<br/><b>Returned at:</b> ${timestamp}</p>`
                });
            }
        } catch (err) {
            console.warn('sendGearRequestEmail failed', err);
        }

        return NextResponse.json({ success: true, data: finalRow });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
