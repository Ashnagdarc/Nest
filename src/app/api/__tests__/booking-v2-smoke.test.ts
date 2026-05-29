import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { POST as createBookingPost } from '@/app/api/v2/bookings/route';
import { POST as transitionBookingPost } from '@/app/api/v2/bookings/[id]/transition/route';
import { POST as autoCheckinPost } from '@/app/api/internal/auto-checkin-cars/route';

const mockCreateSupabaseServerClient = jest.fn();
const mockCreateBookingAggregate = jest.fn();
const mockTransitionBooking = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: (...args: unknown[]) => mockCreateSupabaseServerClient(...args),
}));

jest.mock('@/lib/bookings-v2/service', () => ({
  createBookingAggregate: (...args: unknown[]) => mockCreateBookingAggregate(...args),
  transitionBooking: (...args: unknown[]) => mockTransitionBooking(...args),
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

describe('Booking V2 smoke tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  it('rejects unauthenticated v2 booking creation', async () => {
    (mockCreateSupabaseServerClient as any).mockResolvedValueOnce(buildSupabaseMock({ userId: null }));
    const req = new Request('http://localhost/api/v2/bookings', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    });

    const res = await createBookingPost(req as any);
    expect(res.status).toBe(401);
  });

  it('creates booking through v2 handler when payload is valid', async () => {
    const userId = '11111111-1111-1111-1111-111111111111';
    (mockCreateSupabaseServerClient as any).mockResolvedValueOnce(buildSupabaseMock({ userId, profileRole: 'User' }));
    (mockCreateBookingAggregate as any).mockResolvedValueOnce({
      booking: { id: 'b1', status: 'pending' },
      items: [{ id: 'i1', status: 'pending' }],
      warnings: [],
    });

    const req = new Request('http://localhost/api/v2/bookings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sourceType: 'gear_request',
        sourceId: '22222222-2222-2222-2222-222222222222',
        requesterId: userId,
        startAt: '2026-05-29T10:00:00.000Z',
        endAt: '2026-05-30T10:00:00.000Z',
        items: [{ itemType: 'gear', gearId: '33333333-3333-3333-3333-333333333333', quantity: 1 }],
        idempotencyKey: 'idem-key-123456',
      }),
    });

    const res = await createBookingPost(req as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockCreateBookingAggregate).toHaveBeenCalledTimes(1);
  });

  it('blocks non-admin booking transition', async () => {
    const userId = '11111111-1111-1111-1111-111111111111';
    (mockCreateSupabaseServerClient as any).mockResolvedValueOnce(
      buildSupabaseMock({ userId, profileRole: 'User', profileStatus: 'Active' })
    );

    const req = new Request('http://localhost/api/v2/bookings/abc/transition', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nextStatus: 'approved',
        idempotencyKey: 'idem-123456',
      }),
    });

    const res = await transitionBookingPost(req as any, { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(403);
  });

  it('runs auto check-in and processes due bookings', async () => {
    const dueBookings = [
      { id: 'b1', status: 'active', source_type: 'car_booking', end_at: '2026-05-28T10:00:00.000Z' },
      { id: 'b2', status: 'overdue', source_type: 'car_booking', end_at: '2026-05-28T10:00:00.000Z' },
    ];

    (mockCreateSupabaseServerClient as any).mockResolvedValueOnce(buildSupabaseMock({ dueBookings }));
    (mockTransitionBooking as any).mockResolvedValue(undefined);

    const req = new Request('http://localhost/api/internal/auto-checkin-cars', { method: 'POST' });
    const res = await autoCheckinPost(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.processed).toBe(2);
    expect(body.failed).toBe(0);
    expect(mockTransitionBooking).toHaveBeenCalledTimes(2);
  });
});
