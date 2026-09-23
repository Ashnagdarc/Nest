import { describe, expect, it } from '@jest/globals';
import {
  resolveLegacyStatusForSource,
  shouldSkipGearLegacyOverwrite,
  toLegacyCarBookingStatus,
  toLegacyGearRequestStatus,
} from '@/lib/bookings-v2/legacy-status';
import type { BookingLifecycleStatus } from '@/lib/bookings-v2/types';

describe('bookings-v2 legacy status mapping (H-01)', () => {
  const v2Statuses: BookingLifecycleStatus[] = [
    'pending',
    'approved',
    'checked_out',
    'active',
    'completed',
    'cancelled',
    'overdue',
    'failed',
  ];

  it('maps gear lifecycle to rich legacy labels (not Approved for in-progress)', () => {
    expect(toLegacyGearRequestStatus('approved')).toBe('Approved');
    expect(toLegacyGearRequestStatus('checked_out')).toBe('Checked Out');
    expect(toLegacyGearRequestStatus('active')).toBe('Partially Checked Out');
    expect(toLegacyGearRequestStatus('overdue')).toBe('Overdue');
    expect(toLegacyGearRequestStatus('completed')).toBe('Completed');
    expect(toLegacyGearRequestStatus('cancelled')).toBe('Cancelled');
    expect(toLegacyGearRequestStatus('failed')).toBe('Rejected');
    expect(toLegacyGearRequestStatus('pending')).toBe('Pending');
  });

  it('maps car lifecycle to constraint-safe labels (in-progress → Approved)', () => {
    expect(toLegacyCarBookingStatus('approved')).toBe('Approved');
    expect(toLegacyCarBookingStatus('checked_out')).toBe('Approved');
    expect(toLegacyCarBookingStatus('active')).toBe('Approved');
    expect(toLegacyCarBookingStatus('overdue')).toBe('Approved');
    expect(toLegacyCarBookingStatus('completed')).toBe('Completed');
    expect(toLegacyCarBookingStatus('failed')).toBe('Rejected');
  });

  it('covers every v2 status for both sources without throwing', () => {
    for (const status of v2Statuses) {
      expect(typeof toLegacyGearRequestStatus(status)).toBe('string');
      expect(typeof toLegacyCarBookingStatus(status)).toBe('string');
    }
  });

  it('skips overwriting Overdue with non-terminal partial statuses', () => {
    expect(shouldSkipGearLegacyOverwrite('Overdue', 'Partially Checked Out')).toBe(true);
    expect(shouldSkipGearLegacyOverwrite('Overdue', 'Approved')).toBe(true);
    expect(shouldSkipGearLegacyOverwrite('Overdue', 'Checked Out')).toBe(true);
    expect(shouldSkipGearLegacyOverwrite('Overdue', 'Completed')).toBe(false);
    expect(shouldSkipGearLegacyOverwrite('Overdue', 'Cancelled')).toBe(false);
  });

  it('skips writing Approved over richer in-progress labels', () => {
    expect(shouldSkipGearLegacyOverwrite('Checked Out', 'Approved')).toBe(true);
    expect(shouldSkipGearLegacyOverwrite('Partially Checked Out', 'Approved')).toBe(true);
    expect(shouldSkipGearLegacyOverwrite('Overdue', 'Approved')).toBe(true);
    expect(shouldSkipGearLegacyOverwrite('Approved', 'Approved')).toBe(true);
  });

  it('allows Checked Out → Partially Checked Out (partial return)', () => {
    expect(shouldSkipGearLegacyOverwrite('Checked Out', 'Partially Checked Out')).toBe(false);
    expect(shouldSkipGearLegacyOverwrite('Approved', 'Partially Checked Out')).toBe(false);
  });

  it('resolveLegacyStatusForSource skips gear overwrite when would downgrade', () => {
    const overdueActive = resolveLegacyStatusForSource({
      sourceType: 'gear_request',
      nextStatus: 'active',
      currentLegacyStatus: 'Overdue',
    });
    expect(overdueActive.skip).toBe(true);
    expect(overdueActive.status).toBe('Partially Checked Out');

    const carActive = resolveLegacyStatusForSource({
      sourceType: 'car_booking',
      nextStatus: 'active',
      currentLegacyStatus: 'Approved',
    });
    expect(carActive.skip).toBe(false);
    expect(carActive.status).toBe('Approved');

    const gearCheckedOut = resolveLegacyStatusForSource({
      sourceType: 'gear_request',
      nextStatus: 'checked_out',
      currentLegacyStatus: 'Approved',
    });
    expect(gearCheckedOut.skip).toBe(false);
    expect(gearCheckedOut.status).toBe('Checked Out');
  });
});
