import { describe, expect, it } from '@jest/globals';
import { getBookedCarId } from '../car-status-sync';

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
