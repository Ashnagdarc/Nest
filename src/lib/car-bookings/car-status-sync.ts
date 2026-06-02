type SupabaseAdminLike = {
  from: (table: string) => {
    select: (columns: string) => any;
    update: (values: Record<string, unknown>) => any;
  };
};

export async function getBookedCarId(admin: SupabaseAdminLike, bookingId: string): Promise<string | null> {
  const { data, error } = await admin
    .from('car_assignment')
    .select('car_id')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (error) {
    throw error;
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

