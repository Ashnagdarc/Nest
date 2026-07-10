export type ProcessedGear = {
  id: string;
  name: string;
  category: string;
  status: string;
  checked_out_to: string | null;
  current_request_id: string | null;
  last_checkout_date: string | null;
  due_date: string | null;
  image_url: string | null;
  serial_number?: string | null;
  requested_quantity: number;
  completed_return_quantity: number;
  pending_return_quantity: number;
  returnable_quantity: number;
  request_destination?: string | null;
  request_reason?: string | null;
  request_created_at?: string | null;
};

export type GearReturnGroup = {
  key: string;
  requestId: string | null;
  bookingDate: string | null;
  dueDate: string | null;
  destination: string | null;
  reason: string | null;
  gears: ProcessedGear[];
  totalUnits: number;
};

export type CheckInHistoryItem = {
  id: string;
  gearId: string;
  gearName: string;
  quantity: number;
  checkinDate: Date;
  status: string;
  condition: string;
  notes: string;
  requestId: string | null;
  destination: string | null;
};

export type CheckInHistoryGroup = {
  key: string;
  requestId: string | null;
  destination: string | null;
  submittedAt: Date;
  status: string;
  condition: string;
  notes: string;
  items: CheckInHistoryItem[];
  totalUnits: number;
};

function historyGroupKey(item: CheckInHistoryItem): string {
  const minute = item.checkinDate.toISOString().slice(0, 16);
  if (item.requestId) return `req::${item.requestId}::${minute}`;
  return `batch::${minute}::${item.condition}::${item.notes}`;
}

function mergeStatus(current: string, next: string): string {
  if (current === next) return current;
  const priority = ["Rejected", "Pending Admin Approval", "Completed"];
  for (const status of priority) {
    if (current === status || next === status) return status;
  }
  return current;
}

export function groupCheckInHistory(items: CheckInHistoryItem[]): CheckInHistoryGroup[] {
  const groups = new Map<string, CheckInHistoryGroup>();

  items.forEach((item) => {
    const key = historyGroupKey(item);
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        key,
        requestId: item.requestId,
        destination: item.destination,
        submittedAt: item.checkinDate,
        status: item.status,
        condition: item.condition,
        notes: item.notes,
        items: [item],
        totalUnits: item.quantity,
      });
      return;
    }

    existing.items.push(item);
    existing.totalUnits += item.quantity;
    if (item.checkinDate > existing.submittedAt) {
      existing.submittedAt = item.checkinDate;
    }
    existing.status = mergeStatus(existing.status, item.status);
    if (!existing.destination && item.destination) {
      existing.destination = item.destination;
    }
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) => a.gearName.localeCompare(b.gearName)),
    }))
    .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
}

export function groupCheckedOutGears(checkedOutGears: ProcessedGear[]): GearReturnGroup[] {
  const groups = new Map<string, GearReturnGroup>();

  checkedOutGears.forEach((gear) => {
    const fallbackDate = gear.last_checkout_date || gear.due_date || gear.request_created_at || null;
    const fallbackDayKey = fallbackDate ? new Date(fallbackDate).toDateString() : "no-date";
    const key = gear.current_request_id ? `req::${gear.current_request_id}` : `day::${fallbackDayKey}`;

    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        key,
        requestId: gear.current_request_id || null,
        bookingDate: gear.last_checkout_date || gear.request_created_at || null,
        dueDate: gear.due_date || null,
        destination: gear.request_destination || null,
        reason: gear.request_reason || null,
        gears: [gear],
        totalUnits: Math.max(1, gear.returnable_quantity || 1),
      });
      return;
    }

    existing.gears.push(gear);
    existing.totalUnits += Math.max(1, gear.returnable_quantity || 1);
    if (!existing.bookingDate && (gear.last_checkout_date || gear.request_created_at)) {
      existing.bookingDate = gear.last_checkout_date || gear.request_created_at || null;
    }
    if (!existing.dueDate && gear.due_date) existing.dueDate = gear.due_date;
    if (!existing.destination && gear.request_destination) {
      existing.destination = gear.request_destination;
    }
    if (!existing.reason && gear.request_reason) existing.reason = gear.request_reason;
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      gears: [...group.gears].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => {
      const aTime = a.bookingDate ? new Date(a.bookingDate).getTime() : 0;
      const bTime = b.bookingDate ? new Date(b.bookingDate).getTime() : 0;
      return bTime - aTime;
    });
}

export function isOverdue(date: string | null) {
  if (!date) return false;
  return new Date(date) < new Date();
}

export function matchGearByScanCode(gears: ProcessedGear[], code: string): ProcessedGear | undefined {
  const normalized = code.trim().toLowerCase();
  return gears.find(
    (g) =>
      g.id.toLowerCase() === normalized ||
      (g.serial_number && g.serial_number.toLowerCase() === normalized),
  );
}
