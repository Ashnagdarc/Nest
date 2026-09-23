import { describe, it, expect } from '@jest/globals';
import {
  findApprovedSlotConflict,
  sameCarBookingSlot,
} from '@/lib/car-bookings/overlap';

describe('Car booking overlap helpers', () => {
  describe('sameCarBookingSlot', () => {
    it('matches equal date and time slot', () => {
      expect(
        sameCarBookingSlot(
          { date_of_use: '2026-09-23', time_slot: 'Morning' },
          { date_of_use: '2026-09-23', time_slot: 'Morning' },
        ),
      ).toBe(true);
    });

    it('rejects different dates or slots', () => {
      expect(
        sameCarBookingSlot(
          { date_of_use: '2026-09-23', time_slot: 'Morning' },
          { date_of_use: '2026-09-24', time_slot: 'Morning' },
        ),
      ).toBe(false);
      expect(
        sameCarBookingSlot(
          { date_of_use: '2026-09-23', time_slot: 'Morning' },
          { date_of_use: '2026-09-23', time_slot: 'Afternoon' },
        ),
      ).toBe(false);
    });

    it('treats nullish slot fields as empty strings', () => {
      expect(
        sameCarBookingSlot(
          { date_of_use: '2026-09-23', time_slot: null },
          { date_of_use: '2026-09-23', time_slot: undefined },
        ),
      ).toBe(true);
    });
  });

  describe('findApprovedSlotConflict', () => {
    const target = {
      id: 'b-new',
      date_of_use: '2026-09-23',
      time_slot: 'Morning',
    };

    it('returns Approved booking on the same date/slot', () => {
      const conflict = findApprovedSlotConflict(
        [
          {
            id: 'b-other',
            status: 'Approved',
            date_of_use: '2026-09-23',
            time_slot: 'Morning',
          },
        ],
        target,
      );
      expect(conflict?.id).toBe('b-other');
    });

    it('ignores Approved bookings on a different date or slot (no global lock)', () => {
      expect(
        findApprovedSlotConflict(
          [
            {
              id: 'b-other-day',
              status: 'Approved',
              date_of_use: '2026-09-22',
              time_slot: 'Morning',
            },
            {
              id: 'b-other-slot',
              status: 'Approved',
              date_of_use: '2026-09-23',
              time_slot: 'Afternoon',
            },
          ],
          target,
        ),
      ).toBeUndefined();
    });

    it('ignores non-Approved bookings on the same slot', () => {
      expect(
        findApprovedSlotConflict(
          [
            {
              id: 'b-pending',
              status: 'Pending',
              date_of_use: '2026-09-23',
              time_slot: 'Morning',
            },
            {
              id: 'b-completed',
              status: 'Completed',
              date_of_use: '2026-09-23',
              time_slot: 'Morning',
            },
          ],
          target,
        ),
      ).toBeUndefined();
    });

    it('ignores the target booking itself', () => {
      expect(
        findApprovedSlotConflict(
          [
            {
              id: 'b-new',
              status: 'Approved',
              date_of_use: '2026-09-23',
              time_slot: 'Morning',
            },
          ],
          target,
        ),
      ).toBeUndefined();
    });
  });
});
