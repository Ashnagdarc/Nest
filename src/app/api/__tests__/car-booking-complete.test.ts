import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { POST as completeCarBookingPost } from '@/app/api/car-bookings/complete/route';
import type { NextRequest } from 'next/server';

const mockCreateSupabaseServerClient = jest.fn() as jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
const mockTransitionBooking = jest.fn() as jest.MockedFunction<(...args: unknown[]) => Promise<void>>;
const mockGetBookedCarId = jest.fn() as jest.MockedFunction<(...args: unknown[]) => Promise<string | null>>;
const mockSetCarStatus = jest.fn() as jest.MockedFunction<(...args: unknown[]) => Promise<void>>;

jest.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: (...args: unknown[]) => mockCreateSupabaseServerClient(...args),
}));

jest.mock('@/lib/bookings-v2/service', () => ({
  transitionBooking: (...args: unknown[]) => mockTransitionBooking(...args),
}));

jest.mock('@/lib/car-bookings/car-status-sync', () => ({
  getBookedCarId: (...args: unknown[]) => mockGetBookedCarId(...args),
  setCarStatus: (...args: unknown[]) => mockSetCarStatus(...args),
}));

jest.mock('@/lib/email', () => ({
  minimalEmailLayout: jest.fn(() => '<html></html>'),
  sendGearRequestEmail: jest.fn(async () => ({ success: true })),
  sendCarReturnConfirmationEmail: jest.fn(async () => ({ success: true })),
}));

function buildClient(userId: string | null, bookingOwnerId: string | null) {
  return {
    auth: {
      getUser: jest.fn(async () => ({ data: { user: userId ? { id: userId } : null } })),
    },
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(async () => ({ data: { role: userId === 'admin' ? 'Admin' : 'User', status: 'Active' } })),
              single: jest.fn(async () => ({ data: { email: 'user@example.com' } })),
            })),
          })),
        };
      }

      if (table === 'car_bookings') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(async () => ({
                data: {
                  id: 'booking-1',
                  status: 'Approved',
                  requester_id: bookingOwnerId,
                  employee_name: 'Test User',
                  date_of_use: '2026-06-02',
                  time_slot: '09:00 AM',
                },
                error: null,
              })),
            })),
          })),
          update: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                maybeSingle: jest.fn(async () => ({
                  data: {
                    id: 'booking-1',
                    status: 'Completed',
                    employee_name: 'Test User',
                    date_of_use: '2026-06-02',
                    time_slot: '09:00 AM',
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                })),
              })),
            })),
          })),
        };
      }

      if (table === 'car_assignment') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(async () => ({ data: { car_id: 'car-1' }, error: null })),
            })),
          })),
        };
      }

      if (table === 'cars') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(async () => ({ data: { label: 'Car 1', plate: 'ABC123' }, error: null })),
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

type BookingCompleteClient = ReturnType<typeof buildClient>;

describe('car booking complete route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  it('allows the booking owner to complete their car booking', async () => {
    const authClient: BookingCompleteClient = buildClient('user-1', 'user-1');
    const adminClient: BookingCompleteClient = buildClient('user-1', 'user-1');
    mockCreateSupabaseServerClient.mockImplementation(((isAdmin: unknown) => Promise.resolve((isAdmin ? adminClient : authClient) as unknown)) as (...args: unknown[]) => Promise<unknown>);
    mockGetBookedCarId.mockResolvedValue('car-1');
    mockSetCarStatus.mockResolvedValue(undefined);
    mockTransitionBooking.mockResolvedValue(undefined);

    const req = new Request('http://localhost/api/car-bookings/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bookingId: 'booking-1' }),
    });

    const res = await completeCarBookingPost(req as unknown as NextRequest);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });
});
