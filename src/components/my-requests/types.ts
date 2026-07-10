export type RequestProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export type RequestGear = {
  id: string;
  name?: string;
  category?: string;
  quantity: number;
};

export type GearRequestItem = {
  id: string;
  created_at: string;
  reason?: string;
  destination?: string;
  expected_duration?: string;
  status: string;
  user_id: string;
  submitted_by_user_id?: string | null;
  team_members?: string | null;
  profiles?: RequestProfile | null;
  submitted_by?: RequestProfile | null;
  gears: RequestGear[];
};

export type RequestStats = {
  total: number;
  pending: number;
  active: number;
  completed: number;
};

export function processGearRequest(req: Record<string, unknown>): GearRequestItem {
  const gearLines = Array.isArray(req.gear_request_gears) ? req.gear_request_gears : [];
  const gears: RequestGear[] = gearLines
    .map((line: Record<string, unknown>) => {
      const grg = line;
      const gear = grg.gears as Record<string, unknown> | undefined;
      if (gear && typeof gear.name === "string") {
        return {
          id: String(gear.id),
          name: gear.name,
          category: typeof gear.category === "string" ? gear.category : undefined,
          quantity: Number(grg.quantity ?? 1),
        };
      }
      if (grg.gear_id) {
        return {
          id: String(grg.gear_id),
          name: `Gear ${String(grg.gear_id).slice(0, 8)}…`,
          quantity: Number(grg.quantity ?? 1),
        };
      }
      return null;
    })
    .filter(Boolean) as RequestGear[];

  return {
    id: String(req.id),
    created_at: String(req.created_at),
    reason: typeof req.reason === "string" ? req.reason : undefined,
    destination: typeof req.destination === "string" ? req.destination : undefined,
    expected_duration:
      typeof req.expected_duration === "string" ? req.expected_duration : undefined,
    status: String(req.status ?? "Unknown"),
    user_id: String(req.user_id),
    submitted_by_user_id:
      typeof req.submitted_by_user_id === "string" ? req.submitted_by_user_id : null,
    team_members: typeof req.team_members === "string" ? req.team_members : null,
    profiles: (req.profiles as RequestProfile | null) ?? null,
    submitted_by: (req.submitted_by as RequestProfile | null) ?? null,
    gears,
  };
}

export function calculateRequestStats(requests: GearRequestItem[]): RequestStats {
  return requests.reduce(
    (stats, request) => {
      const status = request.status.toLowerCase();
      stats.total += 1;
      if (status === "pending") stats.pending += 1;
      else if (status === "approved" || status === "checked out") stats.active += 1;
      else if (
        status === "completed" ||
        status === "checked in" ||
        status === "returned"
      ) {
        stats.completed += 1;
      }
      return stats;
    },
    { total: 0, pending: 0, active: 0, completed: 0 },
  );
}

export function getRequestContextLabel(
  request: GearRequestItem,
  currentUserId: string | null,
): string | null {
  if (!currentUserId) return null;
  const isOnBehalf =
    request.submitted_by_user_id && request.submitted_by_user_id !== request.user_id;
  if (!isOnBehalf) return null;

  const ownerName =
    request.profiles?.full_name || request.profiles?.email || "colleague";
  const submitterName =
    request.submitted_by?.full_name || request.submitted_by?.email || "someone";

  if (request.user_id === currentUserId) {
    return `Booked for you by ${submitterName}`;
  }
  if (request.submitted_by_user_id === currentUserId) {
    return `You submitted for ${ownerName}`;
  }
  return null;
}

export function canCancelRequest(request: GearRequestItem, currentUserId: string | null) {
  return (
    !!currentUserId &&
    request.user_id === currentUserId &&
    request.status.toLowerCase() === "pending"
  );
}
