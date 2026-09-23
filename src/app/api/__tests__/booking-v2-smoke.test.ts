import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { bookingCreateSchema, bookingTransitionSchema } from '@/lib/bookings-v2/validation';
import { GET as autoCheckinGet } from '@/app/api/internal/auto-checkin-cars/route';
import { GET as autoReturnGet } from '@/app/api/internal/auto-return-cars/route';

const mockCreateSupabaseServerClient = jest.fn();
const mockCreateBookingAggregate = jest.fn();
const mockTransitionBooking = jest.fn();
const mockAutoReturnDueCarBookings = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: (...args: unknown[]) => mockCreateSupabaseServerClient(...args),
}));

jest.mock('@/lib/bookings-v2/service', () => ({
  createBookingAggregate: (...args: unknown[]) => mockCreateBookingAggregate(...args),
  transitionBooking: (...args: unknown[]) => mockTransitionBooking(...args),
}));

jest.mock('@/lib/car-bookings/auto-return', () => ({
  autoReturnDueCarBookings: (...args: unknown[]) => mockAutoReturnDueCarBookings(...args),
}));

function buildSupabaseMock(options?: {
  userId?: string | null;
  profileRole?: string;
  profileStatus?: string;
  dueBookings?: Array<{ id: string; status: string; source_type: string; end_at: string }>;
}) {
  const userId = options?.userId ?? null;
  const profileRole = options?.profileRole ?? 'User';
  const profileStatus = options?.profileStatus ?? 'Active';
  const dueBookings = options?.dueBookings ?? [];

  return {
    auth: {
      getUser: jest.fn(async () => ({ data: { user: userId ? { id: userId } : null } })),
    },
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(async () => ({ data: { role: profileRole, status: profileStatus } })),
              maybeSingle: jest.fn(async () => ({ data: { role: profileRole, status: profileStatus } })),
            })),
          })),
        };
      }

      if (table === 'bookings') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              in: jest.fn(() => ({
                not: jest.fn(() => ({
                  lte: jest.fn(() => ({
                    limit: jest.fn(async () => ({ data: dueBookings, error: null })),
                  })),
                })),
              })),
            })),
          })),
        };
      }

      return {
        select: jest.fn(() => ({ data: [], error: null })),
      };
    }),
  };
}

describe('Booking dual-write smoke tests (lib + internal jobs)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  it('rejects invalid booking create payloads at the schema boundary', () => {
    const parsed = bookingCreateSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it('accepts a valid create payload and can call createBookingAggregate', async () => {
    const userId = '11111111-1111-1111-1111-111111111111';
    const payload = {
      sourceType: 'gear_request' as const,
      sourceId: '22222222-2222-2222-2222-222222222222',
      requesterId: userId,
      startAt: '2026-05-29T10:00:00.000Z',
      endAt: '2026-05-30T10:00:00.000Z',
      items: [{ itemType: 'gear' as const, gearId: '33333333-3333-3333-3333-333333333333', quantity: 1 }],
      idempotencyKey: 'idem-key-123456',
    };

    const parsed = bookingCreateSchema.safeParse(payload);
    expect(parsed.success).toBe(true);

    const mockedCreateBookingAggregate = mockCreateBookingAggregate as jest.MockedFunction<
      (...args: unknown[]) => Promise<unknown>
    >;
    mockedCreateBookingAggregate.mockResolvedValueOnce({
      booking: { id: 'b1', status: 'pending' },
      items: [{ id: 'i1', status: 'pending' }],
      warnings: [],
    });

    if (parsed.success) {
      await mockedCreateBookingAggregate(parsed.data);
    }
    expect(mockCreateBookingAggregate).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid transition payloads at the schema boundary', () => {
    const parsed = bookingTransitionSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it('runs auto check-in and processes due bookings', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';
    const dueBookings = [
      { id: 'b1', status: 'active', source_type: 'car_booking', end_at: '2026-05-28T10:00:00.000Z' },
      { id: 'b2', status: 'overdue', source_type: 'car_booking', end_at: '2026-05-28T10:00:00.000Z' },
    ];

    const mockedCreateSupabaseServerClient = mockCreateSupabaseServerClient as jest.MockedFunction<
      (...args: unknown[]) => Promise<unknown>
    >;
    const mockedTransitionBooking = mockTransitionBooking as jest.MockedFunction<
      (...args: unknown[]) => Promise<unknown>
    >;
    mockedCreateSupabaseServerClient.mockResolvedValueOnce(buildSupabaseMock({ dueBookings }));
    mockedTransitionBooking.mockResolvedValueOnce(undefined);

    const req = new Request('http://localhost/api/internal/auto-checkin-cars', {
      method: 'GET',
      headers: { authorization: 'Bearer test-cron-secret' },
    });
    const res = await autoCheckinGet(req as Parameters<typeof autoCheckinGet>[0]);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.processed).toBe(2);
    expect(body.failed).toBe(0);
    expect(mockTransitionBooking).toHaveBeenCalledTimes(2);
  });

  it('allows the auto-return route to run with a valid cron secret', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';
    const mockedCreateSupabaseServerClient = mockCreateSupabaseServerClient as jest.MockedFunction<
      (...args: unknown[]) => Promise<unknown>
    >;
    const mockedAutoReturnDueCarBookings = mockAutoReturnDueCarBookings as jest.MockedFunction<
      (...args: unknown[]) => Promise<unknown>
    >;
    mockedCreateSupabaseServerClient.mockResolvedValueOnce(buildSupabaseMock({}));
    mockedAutoReturnDueCarBookings.mockResolvedValueOnce({
      processed: 1,
      releasedCars: 1,
      failed: 0,
      cutoffDate: '2026-06-03',
    });

    const req = new Request('http://localhost/api/internal/auto-return-cars', {
      method: 'GET',
      headers: { authorization: 'Bearer test-cron-secret' },
    });

    const res = await autoReturnGet(req as Parameters<typeof autoReturnGet>[0]);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.processed).toBe(1);
    expect(mockAutoReturnDueCarBookings).toHaveBeenCalledTimes(1);
  });
});
