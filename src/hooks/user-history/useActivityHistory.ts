import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  mapCheckinsToActivities,
  mapRequestsToActivities,
  mergeActivities,
  type ActivityItem,
} from "@/components/user-history/types";

export function useActivityHistory(
  toast: (params: { title: string; description?: string; variant?: "default" | "destructive" }) => void,
) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        toast({
          title: "Authentication error",
          description: "Please log in to view your activity history.",
          variant: "destructive",
        });
        setItems([]);
        return;
      }

      const [requestsResponse, checkinsResponse] = await Promise.all([
        supabase
          .from("gear_requests")
          .select(`
            id,
            status,
            reason,
            destination,
            created_at,
            gear_request_gears (
              gear_id,
              quantity,
              gears ( name )
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
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
            gears ( name ),
            gear_requests:request_id ( destination )
          `)
          .eq("user_id", user.id)
          .order("checkin_date", { ascending: false }),
      ]);

      if (requestsResponse.error) {
        console.error("Error fetching gear requests:", requestsResponse.error);
      }
      if (checkinsResponse.error) {
        console.error("Error fetching check-ins:", checkinsResponse.error);
      }

      const requestActivities = mapRequestsToActivities(requestsResponse.data || []);
      const checkinActivities = mapCheckinsToActivities(checkinsResponse.data || []);

      setItems(mergeActivities(requestActivities, checkinActivities));
    } catch (error) {
      console.error("Error loading activity history:", error);
      toast({
        title: "Error",
        description: "Failed to load your activity history.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchHistory();

    const supabase = createClient();
    const requestsChannel = supabase
      .channel("user_history_requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "gear_requests" }, () => {
        void fetchHistory();
      })
      .subscribe();

    const checkinsChannel = supabase
      .channel("user_history_checkins")
      .on("postgres_changes", { event: "*", schema: "public", table: "checkins" }, () => {
        void fetchHistory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(checkinsChannel);
    };
  }, [fetchHistory]);

  return { items, loading, refetch: fetchHistory };
}
