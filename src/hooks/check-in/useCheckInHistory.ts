import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  groupCheckInHistory,
  type CheckInHistoryItem,
} from "@/components/check-in/types";

type HistoryRow = {
  id: string;
  checkin_date: string;
  status: string;
  condition: string;
  notes: string;
  gear_id: string;
  request_id: string | null;
  quantity: number | null;
  gears: { name: string } | { name: string }[] | null;
  gear_requests: { destination: string | null } | { destination: string | null }[] | null;
};

function gearNameFromRow(row: HistoryRow): string {
  const gears = row.gears;
  if (Array.isArray(gears)) return gears[0]?.name || "Unknown Gear";
  return gears?.name || "Unknown Gear";
}

function destinationFromRow(row: HistoryRow): string | null {
  const request = row.gear_requests;
  if (Array.isArray(request)) return request[0]?.destination ?? null;
  return request?.destination ?? null;
}

function mapRow(row: HistoryRow): CheckInHistoryItem {
  return {
    id: row.id,
    gearId: row.gear_id,
    gearName: gearNameFromRow(row),
    quantity: Math.max(1, Number(row.quantity ?? 1)),
    checkinDate: new Date(row.checkin_date),
    status: row.status || "Unknown",
    condition: row.condition || "Not specified",
    notes: row.notes || "",
    requestId: row.request_id,
    destination: destinationFromRow(row),
  };
}

export function useCheckInHistory(userId: string | null) {
  const [items, setItems] = useState<CheckInHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { data: historyData, error: historyError } = await supabase
        .from("checkins")
        .select(`
          id,
          checkin_date,
          status,
          condition,
          notes,
          gear_id,
          request_id,
          quantity,
          gears!inner ( name ),
          gear_requests:request_id ( destination )
        `)
        .eq("user_id", userId)
        .order("checkin_date", { ascending: false });

      if (historyError) {
        const { data: basicHistoryData } = await supabase
          .from("checkins")
          .select("id, checkin_date, status, condition, notes, gear_id, request_id, quantity")
          .eq("user_id", userId)
          .order("checkin_date", { ascending: false });

        const rows = basicHistoryData || [];
        const gearIds = rows.map((item) => item.gear_id).filter(Boolean);
        const requestIds = rows.map((item) => item.request_id).filter(Boolean) as string[];

        const [{ data: gearsData }, { data: requestsData }] = await Promise.all([
          gearIds.length
            ? supabase.from("gears").select("id, name").in("id", gearIds)
            : Promise.resolve({ data: [] as { id: string; name: string }[] }),
          requestIds.length
            ? supabase.from("gear_requests").select("id, destination").in("id", requestIds)
            : Promise.resolve({ data: [] as { id: string; destination: string | null }[] }),
        ]);

        const gearNameMap = new Map(gearsData?.map((g) => [g.id, g.name]) || []);
        const destinationMap = new Map(requestsData?.map((r) => [r.id, r.destination]) || []);

        setItems(
          rows.map((item) => ({
            id: item.id,
            gearId: item.gear_id,
            gearName: gearNameMap.get(item.gear_id) || "Unknown Gear",
            quantity: Math.max(1, Number(item.quantity ?? 1)),
            checkinDate: new Date(item.checkin_date),
            status: item.status || "Unknown",
            condition: item.condition || "Not specified",
            notes: item.notes || "",
            requestId: item.request_id,
            destination: item.request_id ? destinationMap.get(item.request_id) ?? null : null,
          })),
        );
        return;
      }

      setItems((historyData || []).map((item) => mapRow(item as HistoryRow)));
    } catch (error) {
      console.error("Error fetching check-in history:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const groups = useMemo(() => groupCheckInHistory(items), [items]);

  return { items, groups, loading, refetch: fetchHistory };
}
