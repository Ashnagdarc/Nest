import type { BookingLifecycleStatus } from './types';

const GEAR_RICH_IN_PROGRESS = new Set<string>([
  'Checked Out',
  'Partially Checked Out',
  'Overdue',
]);

/**
 * Map v2 booking lifecycle → car_bookings.status (constraint-safe).
 * In-progress v2 states collapse to Approved — cars have no Checked Out/Overdue.
 */
export function toLegacyCarBookingStatus(status: BookingLifecycleStatus): string {
  switch (status) {
    case 'approved':
    case 'checked_out':
    case 'active':
    case 'overdue':
      return 'Approved';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'failed':
      return 'Rejected';
    case 'pending':
      return 'Pending';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/**
 * Map v2 booking lifecycle → gear_requests.status without inventing product rules.
 * - checked_out / overdue keep their rich labels
 * - active (in-progress / partial return sync) → Partially Checked Out
 */
export function toLegacyGearRequestStatus(status: BookingLifecycleStatus): string {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'checked_out':
      return 'Checked Out';
    case 'active':
      return 'Partially Checked Out';
    case 'overdue':
      return 'Overdue';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'failed':
      return 'Rejected';
    case 'pending':
      return 'Pending';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/**
 * Whether writing `nextLegacy` would erase a more meaningful gear_requests status.
 * Prefer skip over downgrade (e.g. Overdue → Partially Checked Out / Approved).
 */
export function shouldSkipGearLegacyOverwrite(
  currentLegacy: string | null | undefined,
  nextLegacy: string
): boolean {
  if (!currentLegacy || currentLegacy === nextLegacy) {
    return Boolean(currentLegacy && currentLegacy === nextLegacy);
  }

  // Never clobber Overdue except with terminal outcomes.
  if (
    currentLegacy === 'Overdue' &&
    nextLegacy !== 'Completed' &&
    nextLegacy !== 'Cancelled' &&
    nextLegacy !== 'Rejected' &&
    nextLegacy !== 'Overdue'
  ) {
    return true;
  }

  // Never write Approved over richer in-progress labels.
  if (GEAR_RICH_IN_PROGRESS.has(currentLegacy) && nextLegacy === 'Approved') {
    return true;
  }

  return false;
}

export function resolveLegacyStatusForSource(params: {
  sourceType: string | null | undefined;
  nextStatus: BookingLifecycleStatus;
  currentLegacyStatus?: string | null;
}): { status: string; skip: boolean } {
  const { sourceType, nextStatus, currentLegacyStatus } = params;

  if (sourceType === 'car_booking') {
    return { status: toLegacyCarBookingStatus(nextStatus), skip: false };
  }

  const status = toLegacyGearRequestStatus(nextStatus);
  const skip = shouldSkipGearLegacyOverwrite(currentLegacyStatus, status);
  return { status, skip };
}
