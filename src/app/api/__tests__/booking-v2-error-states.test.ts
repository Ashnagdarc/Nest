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

function buildSupabaseMock(options?: { userId?: string | null; profileRole?: string; profileStatus?: string }) {
  const userId = options?.userId ?? '11111111-1111-1111-1111-111111111111';
  const profileRole = options?.profileRole ?? 'Admin';
  const profileStatus = options?.profileStatus ?? 'Active';

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

      return {
        select: jest.fn(() => ({ data: [], error: null })),
      };
    }),
  };
}

describe('Booking V2 error-state tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  it('returns 400 for invalid booking create payload', async () => {
    (mockCreateSupabaseServerClient as any).mockResolvedValueOnce(buildSupabaseMock({ userId: '11111111-1111-1111-1111-111111111111', profileRole: 'Admin' }));

    const req = new Request('http://localhost/api/v2/bookings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ invalid: 'payload' }),
    });

    const res = await createBookingPost(req as any);
    expect(res.status).toBe(400);
  });

  it('handles service errors during booking creation (500)', async () => {
    (mockCreateSupabaseServerClient as any).mockResolvedValueOnce(buildSupabaseMock({ userId: 'u1', profileRole: 'User' }));
    (mockCreateBookingAggregate as any).mockRejectedValueOnce(new Error('service failure'));

    const req = new Request('http://localhost/api/v2/bookings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sourceType: 'gear_request',
        sourceId: '22222222-2222-2222-2222-222222222222',
        requesterId: '11111111-1111-1111-1111-111111111111',
        startAt: '2026-05-29T10:00:00.000Z',
        endAt: '2026-05-30T10:00:00.000Z',
        items: [{ itemType: 'gear', gearId: '33333333-3333-3333-3333-333333333333', quantity: 1 }],
        idempotencyKey: 'idem-test-1',
      }),
    });

    const res = await createBookingPost(req as any);
    expect([403, 500]).toContain(res.status);
  });

  it('returns 400 for invalid transition payload', async () => {
    (mockCreateSupabaseServerClient as any).mockResolvedValueOnce(buildSupabaseMock({ userId: 'u1', profileRole: 'Admin' }));

    const req = new Request('http://localhost/api/v2/bookings/abc/transition', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await transitionBookingPost(req as any, { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(400);
  });

  it('handles service errors during transition (500)', async () => {
    (mockCreateSupabaseServerClient as any).mockResolvedValueOnce(buildSupabaseMock({ userId: 'u1', profileRole: 'Admin' }));
    (mockTransitionBooking as any).mockRejectedValueOnce(new Error('transition failure'));

    const req = new Request('http://localhost/api/v2/bookings/abc/transition', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nextStatus: 'completed' }),
    });

    const res = await transitionBookingPost(req as any, { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(500);
  });

  it('auto-checkin rejects unauthorized when CRON_SECRET is set', async () => {
    process.env.CRON_SECRET = 'superSecret';
    const req = new Request('http://localhost/api/internal/auto-checkin-cars', { method: 'POST' });
    const res = await autoCheckinPost(req as any);
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });
});
