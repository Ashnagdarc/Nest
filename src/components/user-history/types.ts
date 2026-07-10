import { groupCheckInHistory, type CheckInHistoryItem } from "@/components/check-in/types";

export type ActivityGearLine = {
  name: string;
  quantity: number;
};

export type ActivityItem = {
  id: string;
  type: "request" | "check-in";
  title: string;
  date: Date;
  status: string;
  details: string;
  destination: string | null;
  gearLines: ActivityGearLine[];
};

type GearRequestRow = {
  id: string;
  status: string | null;
  reason: string | null;
  destination: string | null;
  created_at: string;
  gear_request_gears?: Array<{
    gear_id?: string | null;
    quantity?: number | null;
    gears?: { name?: string | null } | null;
  }> | null;
};

type CheckinRow = {
  id: string;
  checkin_date: string;
  status: string | null;
  condition: string | null;
  notes: string | null;
  gear_id: string;
  request_id: string | null;
  quantity: number | null;
  gears?: { name?: string | null } | { name?: string | null }[] | null;
  gear_requests?: { destination?: string | null } | { destination?: string | null }[] | null;
};

function gearNameFromCheckin(row: CheckinRow): string {
  const gears = row.gears;
  if (Array.isArray(gears)) return gears[0]?.name || "Unknown Gear";
  return gears?.name || "Unknown Gear";
}

function destinationFromCheckin(row: CheckinRow): string | null {
  const request = row.gear_requests;
  if (Array.isArray(request)) return request[0]?.destination ?? null;
  return request?.destination ?? null;
}

export function mapRequestsToActivities(requests: GearRequestRow[]): ActivityItem[] {
  return requests.map((request) => {
    const lines =
      request.gear_request_gears?.map((line) => ({
        name: line.gears?.name || `Gear ${String(line.gear_id || "").slice(0, 8)}`,
        quantity: Math.max(1, Number(line.quantity ?? 1)),
      })) ?? [];

    return {
      id: request.id,
      type: "request",
      title: request.destination?.trim() || "Gear request",
      date: new Date(request.created_at),
      status: request.status || "Unknown",
      details: request.reason?.trim() || "Gear requested",
      destination: request.destination ?? null,
      gearLines: lines,
    };
  });
}

export function mapCheckinsToActivities(rows: CheckinRow[]): ActivityItem[] {
  const items: CheckInHistoryItem[] = rows.map((row) => ({
    id: row.id,
    gearId: row.gear_id,
    gearName: gearNameFromCheckin(row),
    quantity: Math.max(1, Number(row.quantity ?? 1)),
    checkinDate: new Date(row.checkin_date),
    status: row.status || "Unknown",
    condition: row.condition || "Not specified",
    notes: row.notes || "",
    requestId: row.request_id,
    destination: destinationFromCheckin(row),
  }));

  return groupCheckInHistory(items).map((group) => ({
    id: group.key,
    type: "check-in" as const,
    title: group.destination?.trim() || "Gear return",
    date: group.submittedAt,
    status: group.status,
    details: group.notes || group.condition || "Gear checked in",
    destination: group.destination,
    gearLines: group.items.map((item) => ({
      name: item.gearName,
      quantity: item.quantity,
    })),
  }));
}

export function mergeActivities(requests: ActivityItem[], checkins: ActivityItem[]): ActivityItem[] {
  return [...requests, ...checkins].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function filterActivities(items: ActivityItem[], tab: string): ActivityItem[] {
  switch (tab) {
    case "request":
      return items.filter((item) => item.type === "request");
    case "check-in":
      return items.filter((item) => item.type === "check-in");
    case "maintenance":
      return [];
    case "all":
    default:
      return items;
  }
}
