type SupabaseAdminLike = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => Promise<{ data: Array<{ car_id?: string | null }> | { car_id?: string | null } | null; error: unknown }>;
    };
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ data: unknown; error: unknown }>;
    };
  };
};

export async function getBookedCarId(admin: SupabaseAdminLike, bookingId: string): Promise<string | null> {
  const { data, error } = await admin
    .from('car_assignment')
    .select('car_id')
    .eq('booking_id', bookingId);

  if (error) {
    throw error;
  }

  if (Array.isArray(data)) {
    return data[0]?.car_id || null;
  }

  return data?.car_id || null;
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
