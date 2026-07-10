"use client";

import { CheckCircle2, Clock, Package, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { RequestSummary } from "@/hooks/admin/useRequestSummary";

interface RequestStatsCardsProps {
    summary: RequestSummary;
    loading: boolean;
}

const tiles = [
    {
        key: "pending",
        label: "Pending review",
        icon: Clock,
        tone: "text-orange-600",
        getValue: (s: RequestSummary) => s.pending,
    },
    {
        key: "approved",
        label: "Approved",
        icon: CheckCircle2,
        tone: "text-green-600",
        getValue: (s: RequestSummary) => s.approved,
    },
    {
        key: "checkedOut",
        label: "Checked out",
        icon: Package,
        tone: "text-blue-600",
        getValue: (s: RequestSummary) => s.checkedOut,
    },
    {
        key: "rejected",
        label: "Rejected",
        icon: XCircle,
        tone: "text-red-600",
        getValue: (s: RequestSummary) => s.rejected,
    },
] as const;

export function RequestStatsCards({ summary, loading }: RequestStatsCardsProps) {
    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
