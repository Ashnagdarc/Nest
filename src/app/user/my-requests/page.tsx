"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { RequestStats } from "@/components/my-requests/RequestStats";
import { RequestFilters } from "@/components/my-requests/RequestFilters";
import { RequestCard } from "@/components/my-requests/RequestCard";
import { RequestDetailsDialog } from "@/components/my-requests/RequestDetailsDialog";
import { RequestListSkeleton } from "@/components/my-requests/RequestListSkeleton";
import {
  calculateRequestStats,
  processGearRequest,
  type GearRequestItem,
} from "@/components/my-requests/types";

function MyRequestsContent() {
  const [requests, setRequests] = useState<GearRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<GearRequestItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);

  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightRequestId = searchParams.get("id");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/requests/user", {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch requests (${response.status})`);
      }

      const { data, error } = await response.json();
      if (error) throw new Error(error);
      if (!Array.isArray(data)) throw new Error("Invalid response format");

      setRequests(data.map((req: Record<string, unknown>) => processGearRequest(req)));
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast({
        title: "Error",
        description: "Failed to load your requests.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("my-requests-gear")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gear_requests" },
        () => fetchRequests(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gear_request_gears" },
        () => fetchRequests(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchRequests]);

  useEffect(() => {
    if (!highlightRequestId || loading || !requests.length) return;
    const match = requests.find((r) => r.id === highlightRequestId);
    if (!match) return;

    setSelectedRequest(match);
    setShowDetails(true);
    requestAnimationFrame(() => {
      document.getElementById(`request-${highlightRequestId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [highlightRequestId, loading, requests]);

  const filteredRequests = useMemo(() => {
    let result = requests;
    if (statusFilter !== "all") {
      result = result.filter((req) => req.status.toLowerCase() === statusFilter);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (req) =>
          req.gears.some((g) => g.name?.toLowerCase().includes(term)) ||
          req.destination?.toLowerCase().includes(term) ||
          req.reason?.toLowerCase().includes(term),
      );
    }
    return result;
  }, [requests, statusFilter, searchTerm]);

  const stats = useMemo(() => calculateRequestStats(requests), [requests]);

  const handleCancelRequest = async (requestId: string) => {
    setCancellingRequestId(requestId);
    try {
      const res = await fetch("/api/requests/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId }),
      });
      const payload = await res.json();
      if (!res.ok || payload?.success === false) {
        throw new Error(payload?.error || "Failed to cancel request");
      }

      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: "Cancelled" } : r)),
      );
      setShowDetails(false);
      toast({
        title: "Request cancelled",
        description: "Your gear request has been cancelled.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel request.",
        variant: "destructive",
      });
    } finally {
      setCancellingRequestId(null);
    }
  };

  const openDetails = (request: GearRequestItem) => {
    setSelectedRequest(request);
    setShowDetails(true);
  };

  const hasFilters = searchTerm.trim().length > 0 || statusFilter !== "all";

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My requests</h1>
          </div>
          <p className="text-sm text-muted-foreground sm:pl-[52px]">
            Track equipment you requested or booked for colleagues.
          </p>
        </div>
        <Button asChild className="h-10 shrink-0 gap-2 self-start">
          <Link href="/user/request">
            <Plus className="h-4 w-4" />
            New request
          </Link>
        </Button>
      </header>

      <RequestStats stats={stats} />

      <div className="space-y-4 rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-5">
        <RequestFilters
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          onSearchChange={setSearchTerm}
          onStatusChange={setStatusFilter}
        />

        {loading ? (
          <RequestListSkeleton />
        ) : filteredRequests.length > 0 ? (
          <motion.div layout className="space-y-3 pt-1">
            {filteredRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                currentUserId={currentUserId}
                highlighted={highlightRequestId === request.id}
                isCancelling={cancellingRequestId === request.id}
                onView={openDetails}
                onCancel={handleCancelRequest}
              />
            ))}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
            <Package className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold">No requests found</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {hasFilters
                ? "Try adjusting your search or status filter."
                : "You haven't requested any equipment yet."}
            </p>
            <div className="mt-6 flex gap-2">
              {hasFilters ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => router.push("/user/request")}>Request equipment</Button>
              )}
            </div>
          </div>
        )}
      </div>

      <RequestDetailsDialog
        request={selectedRequest}
        open={showDetails}
        currentUserId={currentUserId}
        isCancelling={!!cancellingRequestId}
        onOpenChange={setShowDetails}
        onCancel={handleCancelRequest}
      />
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading your requests…</p>
      </div>
    </div>
  );
}

export default function MyRequestsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MyRequestsContent />
    </Suspense>
  );
}
