"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationFooter } from "@/components/ui/PaginationFooter";
import type { CheckInHistoryGroup } from "./types";

const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

interface CheckInHistoryListProps {
  groups: CheckInHistoryGroup[];
  loading: boolean;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "Completed") return "default";
  if (status === "Pending Admin Approval") return "secondary";
  if (status === "Rejected") return "destructive";
  return "outline";
}

function GroupCard({ group }: { group: CheckInHistoryGroup }) {
  const label = group.destination
    ? group.destination
    : `Return · ${format(group.submittedAt, "MMM d, yyyy")}`;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="font-semibold leading-tight">{label}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(group.submittedAt, "MMM d, yyyy · h:mm a")}
              </span>
              {group.destination && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {group.destination}
                </span>
              )}
              {group.condition && <span>Condition: {group.condition}</span>}
            </div>
            {group.notes && (
              <p className="line-clamp-2 text-xs text-muted-foreground">{group.notes}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <Badge variant="secondary">
              {group.items.length} item{group.items.length !== 1 ? "s" : ""} · {group.totalUnits} unit
              {group.totalUnits !== 1 ? "s" : ""}
            </Badge>
            <Badge variant={statusVariant(group.status)}>{group.status}</Badge>
          </div>
        </div>

        <ul className="divide-y divide-border">
          {group.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate font-medium">{item.gearName}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">×{item.quantity}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function CheckInHistoryList({ groups, loading }: CheckInHistoryListProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(5);

  const totalPages = Math.max(1, Math.ceil(groups.length / pageSize));

  const paginatedGroups = useMemo(() => {
    const start = (page - 1) * pageSize;
    return groups.slice(start, start + pageSize);
  }, [groups, page, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [groups.length, pageSize]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        No check-in history yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {paginatedGroups.map((group) => (
          <GroupCard key={group.key} group={group} />
        ))}
      </div>

      <PaginationFooter
        page={page}
        pageSize={pageSize}
        total={groups.length}
        onPageChange={setPage}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={setPageSize}
        pageSizeLabel="Per page"
        itemLabel="return"
      />
    </div>
  );
}
