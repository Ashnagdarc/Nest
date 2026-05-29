import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fail, ok, withCorrelationId } from '@/lib/bookings-v2/response';
import { bookingTransitionSchema } from '@/lib/bookings-v2/validation';
import { transitionBooking } from '@/lib/bookings-v2/service';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const correlationId = withCorrelationId();

  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return fail('UNAUTHORIZED', 'Please sign in to continue.', 401, [], correlationId);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role,status')
      .eq('id', userData.user.id)
      .single();

    const isAdmin = profile?.role === 'Admin' && profile?.status === 'Active';
    if (!isAdmin) return fail('FORBIDDEN', 'Only admins can update booking lifecycle state.', 403, [], correlationId);

    const body = await request.json();
    const parsed = bookingTransitionSchema.safeParse(body);
    if (!parsed.success) {
      return fail('VALIDATION_ERROR', 'Invalid transition payload.', 400, parsed.error.issues.map(i => i.message), correlationId);
    }

    const result = await transitionBooking({
      bookingId: id,
      nextStatus: parsed.data.nextStatus,
      changedBy: parsed.data.changedBy || userData.user.id,
      reason: parsed.data.reason,
      metadata: parsed.data.metadata,
      idempotencyKey: parsed.data.idempotencyKey,
    });

    return ok({
      booking: result.booking,
      items: result.items,
      warnings: result.warnings,
      user_message: `Booking is now ${parsed.data.nextStatus.replace('_', ' ')}.`,
    }, correlationId);
  } catch (error) {
    return fail('TRANSITION_FAILED', 'We could not update booking status right now. Please try again.', 500, [error instanceof Error ? error.message : 'Unknown error'], correlationId);
  }
}
