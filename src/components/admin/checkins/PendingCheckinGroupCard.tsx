"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, Package } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getConditionConfig } from "@/components/admin/checkins/checkin-status";
import type { Checkin, RequestSummary } from "@/components/admin/checkins/types";
import { cn } from "@/lib/utils";

const PREVIEW_LIMIT = 4;

interface PendingCheckinGroupCardProps {
    groupKey: string;
    items: Checkin[];
    requestSummary?: RequestSummary | null;
    onApproveAll: (groupKey: string) => void;
    isApproving: boolean;
}

export function PendingCheckinGroupCard({
    groupKey,
    items,
    requestSummary,
    onApproveAll,
    isApproving,
}: PendingCheckinGroupCardProps) {
    const first = items[0];
    const [expanded, setExpanded] = useState(items.length <= PREVIEW_LIMIT);

    const stats = useMemo(() => {
        const pendingUnits = items.reduce((sum, item) => sum + item.quantity, 0);
        const damagedUnits = items
            .filter((item) => item.condition.toLowerCase() === "damaged")
            .reduce((sum, item) => sum + item.quantity, 0);
        const needsRepairUnits = items
            .filter((item) => item.condition.toLowerCase() === "needs repair")
            .reduce((sum, item) => sum + item.quantity, 0);

        return { pendingUnits, damagedUnits, needsRepairUnits };
    }, [items]);

    if (!first) return null;

    const requestId = groupKey.startsWith("req::") ? groupKey.replace("req::", "") : null;
    const submittedDate = first.checkinDate
        ? format(first.checkinDate, "MMM d, yyyy · h:mm a")
        : "Date unknown";

    const requestedQty = requestSummary?.totalRequestedQty ?? stats.pendingUnits;
    const completedQty = requestSummary?.totalCompletedQty ?? 0;
    const outstandingQty = requestSummary?.totalOutstandingQty ?? 0;
    const returnProgress = requestedQty > 0 ? Math.round((completedQty / requestedQty) * 100) : 0;

    const visibleItems = expanded ? items : items.slice(0, PREVIEW_LIMIT);
    const hiddenCount = items.length - visibleItems.length;
    const notes = [...new Set(items.map((item) => item.notes).filter(Boolean))];
    const hasIssues = stats.damagedUnits > 0 || stats.needsRepairUnits > 0;

    return (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md">
            <div className="flex flex-col gap-3 border-b border-border/50 bg-muted/20 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                        {first.avatarUrl && <AvatarImage src={first.avatarUrl} alt="" />}
                        <AvatarFallback className="text-xs font-medium">
                            {first.userName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold leading-tight">{first.userName}</h3>
                            <Badge
                                variant="secondary"
                                className="gap-1 border-0 bg-orange-500/15 font-normal text-orange-700 dark:text-orange-300"
                            >
                                <Clock className="h-3 w-3" />
                                Awaiting approval
                            </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {items.length} line{items.length !== 1 ? "s" : ""} · {stats.pendingUnits} unit
                            {stats.pendingUnits !== 1 ? "s" : ""} · Submitted {submittedDate}
                        </p>
                        {requestId ? (
                            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                Request #{requestId.slice(0, 8)}
                            </p>
                        ) : null}
                    </div>
                </div>

                <Button
                    size="sm"
                    className="shrink-0 gap-2 self-start bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => onApproveAll(groupKey)}
                    loading={isApproving}
                >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve {stats.pendingUnits} unit{stats.pendingUnits !== 1 ? "s" : ""}
                </Button>
            </div>

            <div className="space-y-3 p-4">
                {requestSummary ? (
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                        <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="font-medium text-muted-foreground">Request return progress</span>
                                <span className="tabular-nums text-muted-foreground">
                                    {completedQty} of {requestedQty} returned
                                </span>
                            </div>
                            <Progress value={returnProgress} className="h-1.5" />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            <Badge variant="outline" className="font-normal">
                                Requested {requestedQty}
                            </Badge>
                            <Badge variant="outline" className="font-normal">
                                Approved {completedQty}
                            </Badge>
                            <Badge
                                variant="secondary"
                                className="border-0 bg-orange-500/15 font-normal text-orange-700 dark:text-orange-300"
                            >
                                Pending {stats.pendingUnits}
                            </Badge>
                            {outstandingQty > 0 ? (
                                <Badge variant="destructive" className="font-normal">
                                    Still out {outstandingQty}
                                </Badge>
                            ) : null}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-1.5">
                        <Badge
                            variant="secondary"
                            className="border-0 bg-orange-500/15 font-normal text-orange-700 dark:text-orange-300"
                        >
                            {stats.pendingUnits} unit{stats.pendingUnits !== 1 ? "s" : ""} to approve
                        </Badge>
                        {hasIssues ? (
                            <Badge variant="destructive" className="gap-1 font-normal">
                                <AlertTriangle className="h-3 w-3" />
                                Needs attention
                            </Badge>
                        ) : null}
                    </div>
                )}

                <div className="overflow-hidden rounded-lg border border-border/50">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 border-b border-border/50 bg-muted/30 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        <span>Gear</span>
                        <span className="text-right">Qty</span>
                        <span className="text-right">Condition</span>
                    </div>
                    <div className="divide-y divide-border/50">
                        {visibleItems.map((item) => {
                            const conditionConfig = getConditionConfig(item.condition);
                            const ConditionIcon = conditionConfig.icon;
                            const summaryLine = requestSummary?.lines.find((line) => line.gearId === item.gearId);

                            return (
                                <div
                                    key={item.id}
                                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-3 py-2 text-sm"
                                >
                                    <div className="flex min-w-0 items-center gap-2">
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{item.gearName}</p>
                                            {summaryLine && summaryLine.outstandingQty > 0 ? (
                                                <p className="text-xs text-muted-foreground">
                                                    {summaryLine.outstandingQty} still checked out
                                                </p>
                                            ) : item.damageNotes ? (
                                                <p className="truncate text-xs text-amber-700 dark:text-amber-300">
                                                    {item.damageNotes}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                    <span className="tabular-nums text-muted-foreground">×{item.quantity}</span>
                                    <Badge
                                        variant="secondary"
                                        className={cn("gap-1 border-0 font-normal", conditionConfig.className)}
                                    >
                                        <ConditionIcon className="h-3 w-3" />
                                        {conditionConfig.label}
                                    </Badge>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {hiddenCount > 0 ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full gap-1 text-muted-foreground"
                        onClick={() => setExpanded((value) => !value)}
                    >
                        {expanded ? "Show fewer items" : `Show ${hiddenCount} more item${hiddenCount !== 1 ? "s" : ""}`}
                        <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
                    </Button>
                ) : null}

                {notes.length > 0 ? (
                    <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                        <p className="mt-1 text-sm leading-relaxed text-foreground/90">{notes.join(" · ")}</p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
