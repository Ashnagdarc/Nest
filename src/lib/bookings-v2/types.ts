export const BOOKING_STATUSES = [
  'pending',
  'approved',
  'checked_out',
  'active',
  'completed',
  'cancelled',
  'overdue',
  'failed',
] as const;

export type BookingLifecycleStatus = (typeof BOOKING_STATUSES)[number];

export type BookingItemInput = {
  itemType: 'gear' | 'car';
  gearId?: string;
  carId?: string;
  quantity: number;
};

export type BookingCreateInput = {
  sourceType: 'gear_request' | 'car_booking' | 'manual';
  sourceId?: string;
  requesterId: string;
  startAt?: string | null;
  endAt?: string | null;
  metadata?: Record<string, unknown>;
  items: BookingItemInput[];
  idempotencyKey?: string | null;
};

export type BookingTransitionInput = {
  bookingId: string;
  nextStatus: BookingLifecycleStatus;
  changedBy?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string | null;
};

export type BookingApiResponse<T = unknown> = {
  success: boolean;
  booking?: T;
  items?: unknown[];
  warnings?: string[];
  user_message?: string;
  error_code?: string;
  correlation_id: string;
};
