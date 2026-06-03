import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { autoReturnDueCarBookings, type SupabaseAdminLike } from '../auto-return';

const mockTransitionBooking = jest.fn() as jest.MockedFunction<(...args: unknown[]) => Promise<void>>;
const mockGetBookedCarId = jest.fn() as jest.MockedFunction<(...args: unknown[]) => Promise<string | null>>;
const mockSetCarStatus = jest.fn() as jest.MockedFunction<(...args: unknown[]) => Promise<void>>;

jest.mock('@/lib/bookings-v2/service', () => ({
  transitionBooking: (...args: unknown[]) => mockTransitionBooking(...args),
}));

jest.mock('@/lib/car-bookings/car-status-sync', () => ({
  getBookedCarId: (...args: unknown[]) => mockGetBookedCarId(...args),
  setCarStatus: (...args: unknown[]) => mockSetCarStatus(...args),
}));

function buildAdminMock(options?: {
  dueBookings?: Array<{ id: string; status: string; date_of_use: string }>;
  aggregateIdByBookingId?: Record<string, string | null>;
  updateShouldFail?: boolean;
}) {
  const dueBookings = options?.dueBookings ?? [];
  const aggregateIdByBookingId = options?.aggregateIdByBookingId ?? {};
  const updateShouldFail = options?.updateShouldFail ?? false;
  let currentBookingId: string | null = null;

  return {
    from: jest.fn((table: string) => {
      if (table === 'car_bookings') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              lte: jest.fn(async () => ({ data: dueBookings, error: null })),
            })),
          })),
          update: jest.fn(() => ({
            eq: jest.fn(async () => (
              updateShouldFail
                ? { data: null, error: new Error('update failed') }
                : { data: [], error: null }
            )),
          })),
        };
      }

      if (table === 'bookings') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn((column: string, value: string) => {
                if (column === 'source_id') {
                  currentBookingId = value;
                }
                return {
                  maybeSingle: jest.fn(async () => {
                    const aggregateId = currentBookingId ? aggregateIdByBookingId[currentBookingId] : null;
                    return { data: aggregateId ? { id: aggregateId } : null, error: null };
                  }),
                };
              }),
            })),
          })),
        };
      }

      return {
        select: jest.fn(() => ({ data: [], error: null })),
      };
    }),
  } as unknown as SupabaseAdminLike;
}

describe('autoReturnDueCarBookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('completes due bookings and releases assigned cars', async () => {
    const admin = buildAdminMock({
      dueBookings: [{ id: 'booking-1', status: 'Approved', date_of_use: '2026-06-02' }],
      aggregateIdByBookingId: { 'booking-1': 'aggregate-1' },
    });

    mockGetBookedCarId.mockResolvedValueOnce('car-1');
    mockSetCarStatus.mockResolvedValueOnce(undefined);
    mockTransitionBooking.mockResolvedValueOnce(undefined);

    const result = await autoReturnDueCarBookings(admin, {
      cutoffDate: '2026-06-03',
    });

    expect(result.processed).toBe(1);
    expect(result.releasedCars).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockTransitionBooking).toHaveBeenCalledTimes(1);
    expect(mockSetCarStatus).toHaveBeenCalledWith(expect.anything(), 'car-1', 'Available');
  });

  it('returns no work when there are no due bookings', async () => {
    const admin = buildAdminMock({ dueBookings: [] });

    const result = await autoReturnDueCarBookings(admin, {
      cutoffDate: '2026-06-03',
    });

    expect(result.processed).toBe(0);
    expect(result.releasedCars).toBe(0);
    expect(result.failed).toBe(0);
    expect(mockTransitionBooking).not.toHaveBeenCalled();
  });
});
