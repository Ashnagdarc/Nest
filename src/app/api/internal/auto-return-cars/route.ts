import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { autoReturnDueCarBookings } from '@/lib/car-bookings/auto-return';

export async function POST(request: NextRequest) {
  if (process.env.CRON_SECRET && request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = await createSupabaseServerClient(true);
    const result = await autoReturnDueCarBookings(admin);

    return NextResponse.json({
      success: true,
      message: 'Daily car return job completed',
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
