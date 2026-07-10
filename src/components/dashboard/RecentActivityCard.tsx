"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/dashboard/ListSkeleton";
import type { UnifiedDashboardData } from "@/hooks/dashboard/use-unified-dashboard";
import { formatDayGroupLabel, formatRelativeTimeAgo, toLocalYmd } from "@/lib/format/date";

type ActivityItem = UnifiedDashboardData["recent_activity"][number];

const INITIAL_ITEMS_PER_DAY = 5;

function groupByDay(items: ActivityItem[]): Array<[string, ActivityItem[]]> {
    const groups = new Map<string, ActivityItem[]>();
    for (const item of items) {
        const key = toLocalYmd(item.timestamp);
        if (!key) continue;
        const group = groups.get(key) ?? [];
        group.push(item);
        groups.set(key, group);
    }
    return Array.from(groups.entries()).sort((a, b) => (a[0] > b[0] ? -1 : 1));
}

function formatActivityText(item: ActivityItem): string {
    if (item.user && item.user !== "You") {
        return `${item.user} — ${item.action} • ${item.item}`;
    }
    if (item.type === "request") {
        return `Request ${item.action} • ${item.item}`;
    }
    return `${item.action} • ${item.item}`;
}

interface RecentActivityCardProps {
    activity: ActivityItem[];
    isLoading: boolean;
    mounted: boolean;
}

export function RecentActivityCard({ activity, isLoading, mounted }: RecentActivityCardProps) {
    const grouped = groupByDay(activity);
    const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

    return (
        <Card className="flex h-full max-h-[32rem] flex-col border-border/50">
            <CardHeader className="shrink-0 pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto pt-0">
                {isLoading ? (
                    <ListSkeleton rows={3} />
                ) : grouped.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">No recent activity</p>
                ) : (
                    <div className="space-y-3">
                        {grouped.map(([day, items], index) => {
                            const isExpanded = expandedDays[day] ?? false;
                            const visibleItems = isExpanded
                                ? items
                                : items.slice(0, INITIAL_ITEMS_PER_DAY);
                            const hiddenCount = items.length - visibleItems.length;

                            return (
                                <details
                                    key={day}
                                    className="rounded-lg border border-border"
                                    open={index === 0}
                                >
                                    <summary className="flex cursor-pointer select-none items-center justify-between px-3 py-2 text-sm font-semibold">
                                        <span>{formatDayGroupLabel(day)}</span>
                                        <span className="text-xs text-muted-foreground">{items.length}</span>
                                    </summary>
                                    <div className="space-y-2 p-2 pt-0">
                                        {visibleItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                                            >
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
                                                    <Activity className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium text-foreground">
                                                        {formatActivityText(item)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {mounted
                                                            ? formatRelativeTimeAgo(item.timestamp)
                                                            : "…"}
                                                    </p>
                                                </div>
                                                <Badge variant="secondary" className="shrink-0 text-xs">
                                                    {item.status}
                                                </Badge>
                                            </div>
                                        ))}
                                        {hiddenCount > 0 ? (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-full text-xs text-muted-foreground"
                                                onClick={() =>
                                                    setExpandedDays((prev) => ({ ...prev, [day]: true }))
                                                }
                                            >
                                                Show {hiddenCount} more
                                            </Button>
                                        ) : null}
                                    </div>
                                </details>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
