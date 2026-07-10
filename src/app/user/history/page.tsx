"use client";

import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useActivityHistory } from "@/hooks/user-history/useActivityHistory";
import {
  ActivityHistoryList,
  ActivityTabCounts,
} from "@/components/user-history/ActivityHistoryList";

export default function UserHistoryPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const { items, loading } = useActivityHistory(toast);

  const summary = useMemo(() => {
    const requests = items.filter((i) => i.type === "request").length;
    const checkins = items.filter((i) => i.type === "check-in").length;
    return { requests, checkins, total: items.length };
  }, [items]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <History className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Activity history</h1>
        </div>
        <p className="text-sm text-muted-foreground sm:pl-[52px]">
          Gear requests and returns in one timeline. Multi-item bookings and check-ins are grouped together.
        </p>
      </header>

      {!loading && summary.total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold tabular-nums">{summary.total}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Requests</p>
            <p className="text-2xl font-semibold tabular-nums">{summary.requests}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Check-ins</p>
            <p className="text-2xl font-semibold tabular-nums">{summary.checkins}</p>
          </div>
        </div>
      )}

      <ActivityTabCounts items={items} activeTab={activeTab} onChange={setActiveTab} />

      <ActivityHistoryList items={items} loading={loading} activeTab={activeTab} />
    </div>
  );
}
