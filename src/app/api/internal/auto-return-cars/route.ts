import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { autoReturnDueCarBookings } from '@/lib/car-bookings/auto-return';

async function handleAutoReturn(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const isBearerAuthorized = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isVercelCron = request.headers.has('x-vercel-cron');

  if (!isBearerAuthorized && !isVercelCron) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = await createSupabaseServerClient(true);
    const result = await autoReturnDueCarBookings(admin as unknown as Parameters<typeof autoReturnDueCarBookings>[0]);

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

export async function GET(request: NextRequest) {
  return handleAutoReturn(request);
}

export async function POST(request: NextRequest) {
  return handleAutoReturn(request);
}
