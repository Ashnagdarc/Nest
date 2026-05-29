import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { bookingCreateSchema } from '@/lib/bookings-v2/validation';
import { fail, ok, withCorrelationId } from '@/lib/bookings-v2/response';
import { createBookingAggregate } from '@/lib/bookings-v2/service';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return fail('UNAUTHORIZED', 'Please sign in to continue.', 401);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role,status')
      .eq('id', userData.user.id)
      .maybeSingle();

    const isAdmin = profile?.role === 'Admin' && profile?.status === 'Active';
    const query = (supabase as any)
      .from('v_booking_lifecycle_compat')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    const scoped = isAdmin ? query : query.eq('requester_id', userData.user.id);
    const { data, error } = await scoped;
    if (error) return fail('DB_READ_FAILED', 'Could not load bookings right now.', 500);

    return ok({ booking: null, items: data || [], warnings: [] });
  } catch {
    return fail('UNEXPECTED_ERROR', 'Could not load bookings right now.', 500);
  }
}

export async function POST(request: NextRequest) {
  const correlationId = withCorrelationId();

  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return fail('UNAUTHORIZED', 'Please sign in to continue.', 401, [], correlationId);

    const body = await request.json();
    const parsed = bookingCreateSchema.safeParse(body);
    if (!parsed.success) {
      return fail('VALIDATION_ERROR', 'Some booking details are invalid. Please review and try again.', 400, parsed.error.issues.map(i => i.message), correlationId);
    }

    if (parsed.data.requesterId !== userData.user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role,status')
        .eq('id', userData.user.id)
        .maybeSingle();
      const isAdmin = profile?.role === 'Admin' && profile?.status === 'Active';
      if (!isAdmin) return fail('FORBIDDEN', 'You cannot create a booking for another user.', 403, [], correlationId);
    }

    const result = await createBookingAggregate(parsed.data);
    return ok({ booking: result.booking, items: result.items, warnings: result.warnings, user_message: 'Booking created successfully.' }, correlationId);
  } catch (error) {
    return fail('BOOKING_CREATE_FAILED', 'We could not complete your booking right now. Please try again.', 500, [error instanceof Error ? error.message : 'Unknown error'], correlationId);
  }
}
