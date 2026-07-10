"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Calendar,
  CheckCircle,
  History,
  MapPin,
  Package,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationFooter } from "@/components/ui/PaginationFooter";
import { cn } from "@/lib/utils";
import { filterActivities, type ActivityItem } from "./types";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

interface ActivityHistoryListProps {
  items: ActivityItem[];
  loading: boolean;
  activeTab: string;
}

function statusVariant(
  status: string,
  type: ActivityItem["type"],
): "default" | "secondary" | "destructive" | "outline" {
  const normalized = status.toLowerCase();
  if (normalized.includes("reject") || normalized === "overdue") return "destructive";
  if (normalized.includes("pending")) return "secondary";
  if (
    normalized.includes("approv") ||
    normalized.includes("complet") ||
    normalized === "good" ||
    normalized.includes("checked out")
  ) {
    return "default";
  }
  if (type === "check-in" && normalized.includes("damag")) return "outline";
  return "outline";
}

function ActivityIcon({ type }: { type: ActivityItem["type"] }) {
  if (type === "request") return <Package className="h-4 w-4" />;
  return <CheckCircle className="h-4 w-4" />;
}

function ActivityCard({ item }: { item: ActivityItem }) {
  const totalUnits = item.gearLines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1 capitalize">
                <ActivityIcon type={item.type} />
                {item.type === "check-in" ? "Check-in" : "Request"}
              </Badge>
              <p className="font-semibold leading-tight">{item.title}</p>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(item.date, "MMM d, yyyy · h:mm a")}
              </span>
              {item.destination && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {item.destination}
                </span>
              )}
            </div>
            {item.details && (
              <p className="line-clamp-2 text-sm text-muted-foreground">{item.details}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <Badge variant="secondary">
              {item.gearLines.length} item{item.gearLines.length !== 1 ? "s" : ""} · {totalUnits} unit
              {totalUnits !== 1 ? "s" : ""}
            </Badge>
            <Badge variant={statusVariant(item.status, item.type)}>{item.status}</Badge>
          </div>
        </div>

        {item.gearLines.length > 0 && (
          <ul className="divide-y divide-border">
            {item.gearLines.map((line, index) => (
              <li
                key={`${item.id}-${line.name}-${index}`}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate font-medium">{line.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">×{line.quantity}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ActivityHistoryList({ items, loading, activeTab }: ActivityHistoryListProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(5);

  const filteredItems = useMemo(() => filterActivities(items, activeTab), [items, activeTab]);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, pageSize, filteredItems.length]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (filteredItems.length === 0) {
    const emptyMessage =
      activeTab === "maintenance"
        ? "No maintenance activity recorded yet."
        : activeTab === "all"
          ? "You haven't performed any gear-related activities yet."
          : `No ${activeTab === "check-in" ? "check-ins" : "requests"} found.`;

    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
        <History className="mb-4 h-12 w-12 text-muted-foreground/40" />
        <h3 className="text-lg font-semibold">No activity found</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{emptyMessage}</p>
        {activeTab === "all" && (
          <Button asChild className="mt-6 gap-2">
            <Link href="/user/browse">
              <Package className="h-4 w-4" />
              Browse equipment
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {paginatedItems.map((item) => (
          <ActivityCard key={item.id} item={item} />
        ))}
      </div>

      <PaginationFooter
        page={page}
        pageSize={pageSize}
        total={filteredItems.length}
        onPageChange={setPage}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={setPageSize}
        pageSizeLabel="Per page"
        itemLabel="activity"
      />
    </div>
  );
}

export function ActivityTabCounts({
  items,
  activeTab,
  onChange,
}: {
  items: ActivityItem[];
  activeTab: string;
  onChange: (tab: string) => void;
}) {
  const counts = useMemo(
    () => ({
      all: items.length,
      request: items.filter((i) => i.type === "request").length,
      "check-in": items.filter((i) => i.type === "check-in").length,
      maintenance: 0,
    }),
    [items],
  );

  const tabs = [
    { value: "all", label: "All", icon: History },
    { value: "request", label: "Requests", icon: Package },
    { value: "check-in", label: "Check-ins", icon: CheckCircle },
    { value: "maintenance", label: "Maintenance", icon: Wrench },
  ] as const;

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const count = counts[tab.value];
        return (
          <Button
            key={tab.value}
            type="button"
            variant={activeTab === tab.value ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => onChange(tab.value)}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
            <Badge
              variant={activeTab === tab.value ? "secondary" : "outline"}
              className={cn("ml-0.5 h-5 min-w-5 justify-center px-1.5 text-[10px]")}
            >
              {count}
            </Badge>
          </Button>
        );
      })}
    </div>
  );
}
