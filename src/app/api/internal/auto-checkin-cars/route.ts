import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { transitionBooking } from '@/lib/bookings-v2/service';

async function handleAutoCheckin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const isBearerAuthorized = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isVercelCron = request.headers.has('x-vercel-cron');

  if (!isBearerAuthorized && !isVercelCron) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createSupabaseServerClient(true);
    const nowIso = new Date().toISOString();

    const { data: dueBookings, error } = await supabase
      .from('bookings')
      .select('id,status,source_type,end_at')
      .eq('source_type', 'car_booking')
      .in('status', ['approved', 'checked_out', 'active', 'overdue'])
      .not('end_at', 'is', null)
      .lte('end_at', nowIso)
      .limit(200);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    let processed = 0;
    let failed = 0;

    for (const row of dueBookings || []) {
      try {
        await transitionBooking({
          bookingId: row.id,
          nextStatus: 'completed',
          changedBy: null,
          reason: 'Auto check-in completed by scheduler',
          metadata: { job: 'auto-checkin-cars' },
          idempotencyKey: `auto-complete:${row.id}`,
        });
        processed += 1;
      } catch {
        failed += 1;
      }
    }

    return NextResponse.json({ success: true, processed, failed, message: 'Auto check-in job completed' });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleAutoCheckin(request);
}

export async function POST(request: NextRequest) {
  return handleAutoCheckin(request);
}
