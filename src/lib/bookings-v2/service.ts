import { createSupabaseServerClient } from '@/lib/supabase/server';
import { enqueuePushNotification } from '@/lib/push-queue';
import { sendBookingLifecycleEmail } from '@/lib/email';
import type { BookingCreateInput, BookingLifecycleStatus, BookingTransitionInput } from './types';

type RpcError = { message: string } | null;

type BookingItemPayload = {
  item_type: 'gear' | 'car';
  quantity: number;
  status: string;
  metadata?: Record<string, unknown>;
};

type BookingAggregateRpcResult = {
  booking?: {
    id: string;
    reference: string;
    status: string;
    requester_id: string;
    source_type?: string | null;
    source_id?: string | null;
    start_at?: string | null;
    end_at?: string | null;
  };
  items?: BookingItemPayload[];
  idempotent?: boolean;
};

type RpcCapableSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>> & {
  rpc: (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: BookingAggregateRpcResult | null; error: RpcError }>;
};

const TRANSITIONS: Record<BookingLifecycleStatus, BookingLifecycleStatus[]> = {
  pending: ['approved', 'cancelled', 'failed'],
  approved: ['checked_out', 'active', 'completed', 'cancelled', 'failed'],
  checked_out: ['active', 'completed', 'overdue', 'failed'],
  active: ['completed', 'overdue', 'failed'],
  completed: [],
  cancelled: [],
  overdue: ['completed', 'failed'],
  failed: [],
};

const toLegacyBookingStatus = (status: BookingLifecycleStatus): string => {
  if (status === 'approved') return 'Approved';
  if (status === 'checked_out') return 'Approved';
  if (status === 'active') return 'Approved';
  if (status === 'overdue') return 'Approved';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'failed') return 'Rejected';
  return 'Pending';
};

export async function createBookingAggregate(input: BookingCreateInput) {
  const supabase = await createSupabaseServerClient(true);
  const rpcSupabase = supabase as RpcCapableSupabase;
  const itemsPayload = input.items.map((item, index) => ({
    itemType: item.itemType,
    gearId: item.itemType === 'gear' ? item.gearId : null,
    carId: item.itemType === 'car' ? item.carId : null,
    quantity: item.quantity,
    metadata: {},
    idempotencyKey: input.idempotencyKey ? `${input.idempotencyKey}:item:${index}` : null,
  }));

  const { data: rpcResult, error: rpcError } = await rpcSupabase.rpc('create_booking_with_items_atomic', {
    p_source_type: input.sourceType,
    p_source_id: input.sourceId || null,
    p_requester_id: input.requesterId,
    p_start_at: input.startAt || null,
    p_end_at: input.endAt || null,
    p_metadata: input.metadata || {},
    p_idempotency_key: input.idempotencyKey || null,
    p_items: itemsPayload,
  });

  if (rpcError) throw new Error(`Failed to create booking atomically: ${rpcError.message}`);

  const booking = rpcResult?.booking;
  const items = rpcResult?.items || [];
  if (!booking) throw new Error('Atomic create returned no booking payload');

  if (input.sourceType === 'car_booking' && input.sourceId) {
    await supabase
      .from('car_bookings')
      .update({ status: 'Pending' })
      .eq('id', input.sourceId);
  }

  return { booking, items, warnings: rpcResult?.idempotent ? ['Existing booking returned from idempotency key'] : [] };
}

export async function transitionBooking(input: BookingTransitionInput) {
  const supabase = await createSupabaseServerClient(true);

  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', input.bookingId)
    .single();

  if (bookingErr || !booking) {
    throw new Error('Booking not found');
  }

  const current = booking.status as BookingLifecycleStatus;
  if (current !== input.nextStatus && !TRANSITIONS[current]?.includes(input.nextStatus)) {
    throw new Error(`Invalid booking transition from ${current} to ${input.nextStatus}`);
  }

  const rpcSupabase = supabase as RpcCapableSupabase;
  const { data: rpcResult, error: rpcError } = await rpcSupabase.rpc('transition_booking_atomic', {
    p_booking_id: input.bookingId,
    p_next_status: input.nextStatus,
    p_changed_by: input.changedBy || null,
    p_reason: input.reason || null,
    p_metadata: input.metadata || {},
    p_idempotency_key: input.idempotencyKey || null,
  });

  if (rpcError) throw new Error(`Failed atomic transition: ${rpcError.message}`);

  const updatedBooking = rpcResult?.booking;
  const items = rpcResult?.items || [];
  if (!updatedBooking) throw new Error('Atomic transition returned no booking payload');

  if (updatedBooking.source_type === 'car_booking' && updatedBooking.source_id) {
    await supabase
      .from('car_bookings')
      .update({ status: toLegacyBookingStatus(input.nextStatus), updated_at: new Date().toISOString() })
      .eq('id', updatedBooking.source_id);
  }

  if (updatedBooking.source_type === 'gear_request' && updatedBooking.source_id) {
    await supabase
      .from('gear_requests')
      .update({ status: toLegacyBookingStatus(input.nextStatus), updated_at: new Date().toISOString() })
      .eq('id', updatedBooking.source_id);
  }

  const { data: requesterProfile } = await supabase
    .from('profiles')
    .select('email,full_name')
    .eq('id', updatedBooking.requester_id)
    .maybeSingle();

  if (requesterProfile?.email) {
    const emailResult = await sendBookingLifecycleEmail({
      booking: updatedBooking,
      items: (items || []) as BookingItemPayload[],
      to: requesterProfile.email,
      userName: requesterProfile.full_name || 'User',
      transition: input.nextStatus,
    });

    if (!emailResult.success) {
      const emailError = 'error' in emailResult ? emailResult.error : 'Unknown email error';
      await supabase.from('audit_logs').insert({
        actor_id: input.changedBy || null,
        entity_type: 'booking',
        entity_id: input.bookingId,
        action: 'email_send_failed',
        metadata: { message: emailError, transition: input.nextStatus },
      });
    }
  }

  await enqueuePushNotification({
    userId: updatedBooking.requester_id,
    title: `Booking ${input.nextStatus.replace('_', ' ')}`,
    body: `Booking ${updatedBooking.reference} is now ${input.nextStatus.replace('_', ' ')}.`,
    data: {
      booking_id: updatedBooking.id,
      event_type: `booking.${input.nextStatus}`,
      dedupe_key: `${updatedBooking.requester_id}:booking.${input.nextStatus}:${updatedBooking.id}`,
    },
  }, { context: 'Booking Lifecycle' });

  await supabase.from('audit_logs').insert({
    actor_id: input.changedBy || null,
    entity_type: 'booking',
    entity_id: updatedBooking.id,
    action: 'status_transition',
    metadata: {
      from: current,
      to: input.nextStatus,
      reason: input.reason || null,
    },
  });

  return { booking: updatedBooking, items: items || [], warnings: [] };
}
