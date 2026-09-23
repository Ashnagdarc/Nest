/**
 * Car exclusivity is date/slot based (PRD FR-9.6 overlapping bookings),
 * not a global lock while any Approved booking exists for the car.
 */

export type CarBookingSlot = {
  id?: string;
  date_of_use?: string | null;
  time_slot?: string | null;
  status?: string | null;
};

export function sameCarBookingSlot(
  a: Pick<CarBookingSlot, 'date_of_use' | 'time_slot'>,
  b: Pick<CarBookingSlot, 'date_of_use' | 'time_slot'>,
): boolean {
  return (
    (a.date_of_use || '') === (b.date_of_use || '') &&
    (a.time_slot || '') === (b.time_slot || '')
  );
}

/** True when another Approved booking shares the same date and time slot. */
export function findApprovedSlotConflict<T extends CarBookingSlot>(
  candidates: T[],
  target: Pick<CarBookingSlot, 'id' | 'date_of_use' | 'time_slot'>,
): T | undefined {
  return candidates.find(
    (b) =>
      b.status === 'Approved' &&
      b.id !== target.id &&
      sameCarBookingSlot(b, target),
  );
}
