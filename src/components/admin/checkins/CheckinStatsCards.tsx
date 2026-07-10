"use client";

import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { CheckinSummary } from "@/hooks/admin/useCheckinSummary";

interface CheckinStatsCardsProps {
    summary: CheckinSummary;
    loading: boolean;
}

const tiles = [
    {
        key: "pending",
        label: "Pending approvals",
        icon: Clock,
        tone: "text-orange-600",
        getValue: (s: CheckinSummary) => s.pending,
    },
    {
        key: "completedToday",
        label: "Completed today",
        icon: CheckCircle2,
        tone: "text-emerald-600",
        getValue: (s: CheckinSummary) => s.completedToday,
    },
    {
        key: "damaged",
        label: "Damaged items",
        icon: AlertTriangle,
        tone: "text-red-600",
        getValue: (s: CheckinSummary) => s.damaged,
    },
] as const;

export function CheckinStatsCards({ summary, loading }: CheckinStatsCardsProps) {
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {tiles.map((tile) => {
                const Icon = tile.icon;
                return (
                    <Card key={tile.key} className="border-border/50">
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                                <Icon className={`h-5 w-5 ${tile.tone}`} />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{tile.label}</p>
                                <p className={`text-2xl font-semibold ${tile.tone}`}>
                                    {loading ? "—" : tile.getValue(summary)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
