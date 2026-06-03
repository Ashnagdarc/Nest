import { transitionBooking } from '@/lib/bookings-v2/service';
import { getBookedCarId, setCarStatus } from '@/lib/car-bookings/car-status-sync';

type BookingRow = {
  id: string;
  status: string;
  requester_id?: string | null;
  employee_name?: string | null;
  date_of_use?: string | null;
  time_slot?: string | null;
};

export type SupabaseQueryChain = {
  eq: (column: string, value: string) => SupabaseQueryChain;
  lte: (column: string, value: string) => Promise<{ data: BookingRow[] | null; error: unknown }>;
  maybeSingle: () => Promise<{ data: { id: string } | null; error: unknown }>;
};

export type SupabaseUpdateChain = {
  eq: (column: string, value: string) => Promise<{ data: unknown; error: unknown }>;
};

export type SupabaseAdminLike = {
  from: (table: string) => {
    select: (...args: unknown[]) => SupabaseQueryChain;
    update: (values: Record<string, unknown>) => SupabaseUpdateChain;
  };
};

type AutoReturnOptions = {
  cutoffDate?: string;
  transitionBookingFn?: typeof transitionBooking;
};

export async function autoReturnDueCarBookings(
  admin: SupabaseAdminLike,
  options: AutoReturnOptions = {},
) {
  const cutoffDate = options.cutoffDate || new Date().toISOString().slice(0, 10);
  const transitionBookingFn = options.transitionBookingFn || transitionBooking;

  const { data: dueBookings, error } = await admin
    .from('car_bookings')
    .select('id,status,requester_id,employee_name,date_of_use,time_slot')
    .eq('status', 'Approved')
    .lte('date_of_use', cutoffDate);

  if (error) {
    throw error;
  }

  let processed = 0;
  let releasedCars = 0;
  let failed = 0;

  for (const booking of dueBookings || []) {
    try {
      const { data: aggregate } = await admin
        .from('bookings')
        .select('id')
        .eq('source_type', 'car_booking')
        .eq('source_id', booking.id)
        .maybeSingle();

      if (aggregate?.id) {
        await transitionBookingFn({
          bookingId: aggregate.id,
          nextStatus: 'completed',
          changedBy: null,
          reason: 'Auto return at close of business',
          metadata: { job: 'auto-return-cars', cutoff_date: cutoffDate },
          idempotencyKey: `legacy-car-auto-return:${booking.id}`,
        });
      } else {
        const { error: updateError } = await admin
          .from('car_bookings')
          .update({ status: 'Completed', updated_at: new Date().toISOString() })
          .eq('id', booking.id);

        if (updateError) {
          throw updateError;
        }
      }

      const carId = await getBookedCarId(admin as unknown as Parameters<typeof getBookedCarId>[0], booking.id);
      if (carId) {
        await setCarStatus(admin as unknown as Parameters<typeof setCarStatus>[0], carId, 'Available');
        releasedCars += 1;
      }

      processed += 1;
    } catch (error) {
      failed += 1;
      console.warn('[Auto Return Cars] Failed to return booking:', booking.id, error);
    }
  }

  return { processed, releasedCars, failed, cutoffDate };
}
