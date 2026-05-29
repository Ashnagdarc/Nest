import { createClient } from '@supabase/supabase-js';
import { createBookingAggregate, transitionBooking } from '@/lib/bookings-v2/service';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !service) throw new Error('Missing Supabase env vars');

  const supabase = createClient(url, service);

  const { data: users } = await supabase
    .from('profiles')
    .select('id,email,full_name')
    .not('email', 'is', null)
    .limit(1);
  const user = users?.[0];
  if (!user) throw new Error('No profile with email found');

  const { data: gears } = await supabase
    .from('gears')
    .select('id,name,available_quantity')
    .gt('available_quantity', 0)
    .limit(2);
  if (!gears || gears.length < 2) throw new Error('Need at least 2 available gears for multi-item smoke');

  const idempotency = `smoke-${Date.now()}`;
  const create = await createBookingAggregate({
    sourceType: 'manual',
    requesterId: user.id,
    startAt: new Date().toISOString(),
    endAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    items: [
      { itemType: 'gear', gearId: gears[0].id, quantity: 1 },
      { itemType: 'gear', gearId: gears[1].id, quantity: 1 },
    ],
    idempotencyKey: idempotency,
    metadata: { smoke: true },
  });

  const bookingId = create.booking.id as string;

  const beforeEmailCount = await supabase.from('email_logs').select('*', { count: 'exact', head: true });

  await transitionBooking({
    bookingId,
    nextStatus: 'approved',
    changedBy: user.id,
    reason: 'smoke-approved',
    idempotencyKey: `${idempotency}-approved`,
  });

  await transitionBooking({
    bookingId,
    nextStatus: 'checked_out',
    changedBy: user.id,
    reason: 'smoke-checkedout',
    idempotencyKey: `${idempotency}-checked-out`,
  });

  await transitionBooking({
    bookingId,
    nextStatus: 'completed',
    changedBy: user.id,
    reason: 'smoke-completed',
    idempotencyKey: `${idempotency}-completed`,
  });

  const afterEmailCount = await supabase.from('email_logs').select('*', { count: 'exact', head: true });

  const { data: historyRows } = await supabase
    .from('booking_status_history')
    .select('from_status,to_status,changed_at')
    .eq('booking_id', bookingId)
    .order('changed_at', { ascending: true });

  const { data: auditRows } = await supabase
    .from('audit_logs')
    .select('action,created_at')
    .eq('entity_id', bookingId)
    .order('created_at', { ascending: true });

  // Auto-checkin smoke setup
  const { data: existingCarBooking } = await supabase
    .from('car_bookings')
    .select('id,requester_id')
    .limit(1)
    .single();

  let autoCheckinResult: any = null;

  if (existingCarBooking) {
    const autoRef = `AUTO-SMOKE-${Date.now()}`;
    const insert = await supabase.from('bookings').insert({
      reference: autoRef,
      source_type: 'car_booking',
      source_id: existingCarBooking.id,
      requester_id: existingCarBooking.requester_id,
      status: 'active',
      start_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      end_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      metadata: { smoke: true, auto: true },
    }).select('id').single();

    if (!insert.error && insert.data?.id) {
      const resp = await fetch('http://localhost:9002/api/internal/auto-checkin-cars', { method: 'POST' });
      autoCheckinResult = await resp.json();
    }
  }

  const summary = {
    bookingId,
    requester: user.email,
    itemCount: create.items.length,
    lifecycleTransitions: historyRows?.map((h: any) => `${h.from_status ?? 'null'}=>${h.to_status}`) ?? [],
    auditActions: auditRows?.map((a: any) => a.action) ?? [],
    emailLogsBefore: beforeEmailCount.count ?? 0,
    emailLogsAfter: afterEmailCount.count ?? 0,
    emailLogDelta: (afterEmailCount.count ?? 0) - (beforeEmailCount.count ?? 0),
    autoCheckinResult,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
