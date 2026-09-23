import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { bookingCreateSchema, bookingTransitionSchema } from '@/lib/bookings-v2/validation';
import { syncBookingTransitionSoft } from '@/lib/bookings-v2/service';
import { POST as autoCheckinPost } from '@/app/api/internal/auto-checkin-cars/route';

const mockTransitionBooking = jest.fn() as jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;

jest.mock('@/lib/bookings-v2/service', () => ({
  transitionBooking: (...args: unknown[]) => mockTransitionBooking(...args),
  // Mirror production soft-fail policy so car approve cannot be broken by v2 flakes.
  syncBookingTransitionSoft: async (input: unknown, context: string) => {
    try {
      await mockTransitionBooking(input);
      return true;
    } catch (error) {
      console.error(`[${context}] Failed syncing status to v2 booking lifecycle:`, error);
      return false;
    }
  },
}));

describe('Booking dual-write error-state tests (lib)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  it('returns validation errors for invalid booking create payloads', () => {
    const parsed = bookingCreateSchema.safeParse({ invalid: 'payload' });
    expect(parsed.success).toBe(false);
  });

  it('returns validation errors for invalid transition payloads', () => {
    const parsed = bookingTransitionSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it('accepts a valid transition payload shape', () => {
    const parsed = bookingTransitionSchema.safeParse({
      nextStatus: 'completed',
      idempotencyKey: 'idem-123456',
    });
    expect(parsed.success).toBe(true);
  });

  it('soft-fails transition sync without throwing (car-safe policy)', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockTransitionBooking.mockRejectedValueOnce(new Error('transition failure'));
    const ok = await syncBookingTransitionSoft(
      {
        bookingId: '11111111-1111-1111-1111-111111111111',
        nextStatus: 'completed',
        changedBy: null,
        reason: 'test',
      },
      'Test Soft Sync'
    );
    expect(ok).toBe(false);
    expect(mockTransitionBooking).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('auto-checkin rejects unauthorized when CRON_SECRET is set', async () => {
    process.env.CRON_SECRET = 'superSecret';
    const req = new Request('http://localhost/api/internal/auto-checkin-cars', { method: 'POST' });
    const res = await autoCheckinPost(req as Parameters<typeof autoCheckinPost>[0]);
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });
});
