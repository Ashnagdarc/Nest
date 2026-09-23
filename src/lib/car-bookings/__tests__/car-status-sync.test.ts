import { describe, expect, it, jest } from '@jest/globals';
import {
  getBookedCarId,
  hasOtherApprovedAssignment,
  releaseCarIfNoOtherApproved,
  type SupabaseAdminLike,
} from '../car-status-sync';

describe('getBookedCarId', () => {
  it('returns the first assigned car when the assignment query returns rows', async () => {
    const admin = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({
            data: [
              { car_id: 'car-1' },
              { car_id: 'car-2' },
            ],
            error: null,
          }),
        }),
      }),
    };

    await expect(getBookedCarId(admin as never, 'booking-1')).resolves.toBe('car-1');
  });
});

function buildReleaseAdmin(options: {
  assignmentBookingIds: string[];
  approvedBookingIds: string[];
  updates?: Array<{ status: string; carId: string }>;
}): SupabaseAdminLike {
  const updates = options.updates ?? [];

  return {
    from: jest.fn((table: string) => {
      if (table === 'car_assignment') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(async () => ({
              data: options.assignmentBookingIds.map((booking_id) => ({ booking_id })),
              error: null,
            })),
          })),
          update: jest.fn(),
        };
      }

      if (table === 'car_bookings') {
        return {
          select: jest.fn(() => ({
            in: jest.fn(() => ({
              eq: jest.fn(async (_column: string, status: string) => ({
                data: status === 'Approved'
                  ? options.approvedBookingIds.map((id) => ({ id }))
                  : [],
                error: null,
              })),
            })),
          })),
          update: jest.fn(),
        };
      }

      if (table === 'cars') {
        return {
          select: jest.fn(),
          update: jest.fn((values: Record<string, unknown>) => ({
            eq: jest.fn(async (_column: string, carId: string) => {
              updates.push({ status: String(values.status), carId });
              return { data: null, error: null };
            }),
          })),
        };
      }

      return {
        select: jest.fn(),
        update: jest.fn(),
      };
    }),
  } as unknown as SupabaseAdminLike;
}

describe('hasOtherApprovedAssignment / releaseCarIfNoOtherApproved', () => {
  it('detects another Approved assignment on the same car', async () => {
    const admin = buildReleaseAdmin({
      assignmentBookingIds: ['booking-done', 'booking-still-approved'],
      approvedBookingIds: ['booking-still-approved'],
    });

    await expect(hasOtherApprovedAssignment(admin, 'car-1', 'booking-done')).resolves.toBe(true);
  });

  it('returns false when no other Approved assignment remains', async () => {
    const admin = buildReleaseAdmin({
      assignmentBookingIds: ['booking-done'],
      approvedBookingIds: [],
    });

    await expect(hasOtherApprovedAssignment(admin, 'car-1', 'booking-done')).resolves.toBe(false);
  });

  it('keeps In Service when another Approved booking remains', async () => {
    const updates: Array<{ status: string; carId: string }> = [];
    const admin = buildReleaseAdmin({
      assignmentBookingIds: ['booking-a', 'booking-b'],
      approvedBookingIds: ['booking-b'],
      updates,
    });

    const released = await releaseCarIfNoOtherApproved(admin, 'car-1', 'booking-a');

    expect(released).toBe(false);
    expect(updates).toEqual([{ status: 'In Service', carId: 'car-1' }]);
  });

  it('sets Available when no other Approved booking remains', async () => {
    const updates: Array<{ status: string; carId: string }> = [];
    const admin = buildReleaseAdmin({
      assignmentBookingIds: ['booking-a'],
      approvedBookingIds: [],
      updates,
    });

    const released = await releaseCarIfNoOtherApproved(admin, 'car-1', 'booking-a');

    expect(released).toBe(true);
    expect(updates).toEqual([{ status: 'Available', carId: 'car-1' }]);
  });
});
