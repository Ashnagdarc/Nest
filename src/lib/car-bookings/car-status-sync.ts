/**
 * Structural admin client shape used by car status helpers.
 * Real SupabaseClient is cast at route boundaries:
 *   `admin as unknown as Parameters<typeof getBookedCarId>[0]`
 *
 * Types regen (deferred — not linked / not run here):
 *   npx supabase link --project-ref <PROJECT_REF>
 *   npx supabase gen types typescript --linked > src/types/supabase.ts
 */
export type SupabaseAdminLike = {
  from: (table: string) => {
    select: (columns: string) => FilterChain;
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => QueryResult;
    };
  };
};

type QueryResult = Promise<{
  data: Array<Record<string, unknown>> | Record<string, unknown> | null;
  error: unknown;
}>;

type FilterChain = {
  eq: (column: string, value: string) => FilterChain & QueryResult;
  in: (column: string, values: readonly string[]) => FilterChain & QueryResult;
  neq: (column: string, value: string) => FilterChain & QueryResult;
};

function asRows(data: Array<Record<string, unknown>> | Record<string, unknown> | null): Array<Record<string, unknown>> {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

export async function getBookedCarId(admin: SupabaseAdminLike, bookingId: string): Promise<string | null> {
  const { data, error } = await admin
    .from('car_assignment')
    .select('car_id')
    .eq('booking_id', bookingId);

  if (error) {
    throw error;
  }

  const row = asRows(data)[0];
  const carId = row?.car_id;
  return typeof carId === 'string' ? carId : null;
}

export async function setCarStatus(
  admin: SupabaseAdminLike,
  carId: string,
  status: 'Available' | 'In Service',
) {
  const { error } = await admin
    .from('cars')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', carId);

  if (error) {
    throw error;
  }
}

/**
 * True when another Approved booking still holds an assignment for this car
 * (overlap-only model: multiple Approved on different dates/slots are allowed).
 */
export async function hasOtherApprovedAssignment(
  admin: SupabaseAdminLike,
  carId: string,
  excludeBookingId: string,
): Promise<boolean> {
  const { data: assignments, error: assignmentError } = await admin
    .from('car_assignment')
    .select('booking_id')
    .eq('car_id', carId);

  if (assignmentError) {
    throw assignmentError;
  }

  const otherBookingIds = asRows(assignments)
    .map((row) => row.booking_id)
    .filter((id): id is string => typeof id === 'string' && id !== excludeBookingId);

  if (otherBookingIds.length === 0) {
    return false;
  }

  const { data: approved, error: bookingError } = await admin
    .from('car_bookings')
    .select('id')
    .in('id', otherBookingIds)
    .eq('status', 'Approved');

  if (bookingError) {
    throw bookingError;
  }

  return asRows(approved).length > 0;
}

/**
 * On complete/cancel/reassign: only mark Available when no other Approved
 * assignment remains; otherwise keep (or restore) In Service.
 * @returns true when the car was set to Available
 */
export async function releaseCarIfNoOtherApproved(
  admin: SupabaseAdminLike,
  carId: string,
  excludeBookingId: string,
): Promise<boolean> {
  const otherApproved = await hasOtherApprovedAssignment(admin, carId, excludeBookingId);
  if (otherApproved) {
    await setCarStatus(admin, carId, 'In Service');
    return false;
  }
  await setCarStatus(admin, carId, 'Available');
  return true;
}
