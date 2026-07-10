"use client";

import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Package } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCheckinStatusConfig, getConditionConfig } from "@/components/admin/checkins/checkin-status";
import type { Checkin } from "@/components/admin/checkins/types";
import { cn } from "@/lib/utils";

interface RecentCheckinGroupCardProps {
    groupKey: string;
    items: Checkin[];
    isExpanded: boolean;
    expandedItems: Checkin[];
    onToggle: (groupKey: string, sample: Checkin) => void;
}

export function RecentCheckinGroupCard({
    groupKey,
    items,
    isExpanded,
    expandedItems,
    onToggle,
}: RecentCheckinGroupCardProps) {
    const first = items[0];
    if (!first) return null;

    const displayItems = expandedItems.length > 0 ? expandedItems : items;
    const latestDate = items.reduce<Date | null>((latest, item) => {
        if (!item.checkinDate) return latest;
        if (!latest) return item.checkinDate;
        return item.checkinDate > latest ? item.checkinDate : latest;
    }, null);

    const statusConfig = getCheckinStatusConfig(first.status);
    const StatusIcon = statusConfig.icon;
    const requestId = groupKey.startsWith("req::") ? groupKey.replace("req::", "") : null;

    return (
        <div className="rounded-xl border border-border/60 bg-card p-4 transition-colors hover:bg-muted/20">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                        {first.avatarUrl && <AvatarImage src={first.avatarUrl} alt="" />}
                        <AvatarFallback className="text-xs">{first.userName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{first.userName}</h3>
                            <Badge variant="secondary" className={cn("gap-1 border-0 font-normal", statusConfig.className)}>
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig.label}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Processed {format(latestDate ?? first.checkinDate ?? new Date(), "MMM d, yyyy")}
                        </p>
                        {requestId && (
                            <p className="font-mono text-xs text-muted-foreground">#{requestId.slice(0, 8)}</p>
                        )}
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                        {displayItems.length} item{displayItems.length !== 1 ? "s" : ""}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onToggle(groupKey, first)}
                        aria-expanded={isExpanded}
                        aria-controls={`group-${groupKey}`}
                    >
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                    </Button>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        key="expanded"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        style={{ overflow: "hidden" }}
                        className="mt-3"
                        id={`group-${groupKey}`}
                    >
                        <div className="divide-y divide-border/50 rounded-xl border border-border/50">
                            {displayItems.map((item) => {
                                const conditionConfig = getConditionConfig(item.condition);
                                const ConditionIcon = conditionConfig.icon;
                                return (
                                    <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                                            <Package className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">{item.gearName}</p>
                                            <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                                        </div>
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
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
