import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createBookingAggregate, transitionBooking } from '@/lib/bookings-v2/service';

export async function POST(request: NextRequest) {
  try {
    const { request_id } = await request.json();
    if (!request_id) {
      return NextResponse.json({ success: false, error: 'Missing request_id' }, { status: 400 });
    }

    const userClient = await createSupabaseServerClient();
    const { data: auth } = await userClient.auth.getUser();
    const user = auth?.user;
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await createSupabaseServerClient(true);

    const { data: reqRow, error: reqErr } = await admin
      .from('gear_requests')
      .select('id, user_id, status, created_at, reason, destination, expected_duration')
      .eq('id', request_id)
      .single();

    if (reqErr || !reqRow) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    }

    if (reqRow.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if ((reqRow.status || '').toLowerCase() !== 'pending') {
      return NextResponse.json({ success: false, error: 'Only pending requests can be cancelled' }, { status: 409 });
    }

    try {
      const { data: gearLines } = await admin
        .from('gear_request_gears')
        .select('gear_id, quantity')
        .eq('gear_request_id', request_id);

      let { data: aggregate } = await (admin as any)
        .from('bookings')
        .select('id')
        .eq('source_type', 'gear_request')
        .eq('source_id', request_id)
        .maybeSingle();

      if (!aggregate?.id) {
        await createBookingAggregate({
          sourceType: 'gear_request',
          sourceId: request_id,
          requesterId: user.id,
          startAt: reqRow.created_at ?? new Date().toISOString(),
          endAt: null,
          idempotencyKey: `legacy-gear-create:${request_id}`,
          metadata: {
            reason: reqRow.reason ?? null,
            destination: reqRow.destination ?? null,
            expected_duration: reqRow.expected_duration ?? null,
          },
          items: (gearLines || []).map((line: { gear_id: string; quantity?: number }) => ({
            itemType: 'gear' as const,
            gearId: line.gear_id,
            quantity: Math.max(1, Number(line.quantity ?? 1)),
          })),
        });

        const { data: createdAggregate } = await (admin as any)
          .from('bookings')
          .select('id')
          .eq('source_type', 'gear_request')
          .eq('source_id', request_id)
          .maybeSingle();
        aggregate = createdAggregate;
      }

      if (aggregate?.id) {
        await transitionBooking({
          bookingId: aggregate.id,
          nextStatus: 'cancelled',
          changedBy: user.id,
          reason: 'Request cancelled by user',
          metadata: { legacy_route: '/api/requests/cancel' },
          idempotencyKey: `legacy-cancel:${request_id}`,
        });
      }
    } catch (syncError) {
      console.error('[Gear Request Cancel] Failed syncing status to v2 booking lifecycle:', syncError);
      return NextResponse.json({ success: false, error: 'Failed to sync booking lifecycle state' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
