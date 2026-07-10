"use client";

import { Package, Wrench, CheckCircle2, Boxes } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { GearInventorySummary } from "@/hooks/admin/useGearInventorySummary";

interface GearInventoryStatsProps {
    summary: GearInventorySummary;
    loading: boolean;
}

const tiles = [
    {
        key: "total",
        label: "Total equipment",
        icon: Boxes,
        tone: "text-foreground",
        getValue: (summary: GearInventorySummary) => summary.total,
    },
    {
        key: "available",
        label: "Available",
        icon: CheckCircle2,
        tone: "text-green-600",
        getValue: (summary: GearInventorySummary) => summary.available,
    },
    {
        key: "checkedOut",
        label: "Checked out / booked",
        icon: Package,
        tone: "text-blue-600",
        getValue: (summary: GearInventorySummary) => summary.checkedOut,
    },
    {
        key: "maintenance",
        label: "Needs attention",
        icon: Wrench,
        tone: "text-amber-600",
        getValue: (summary: GearInventorySummary) => summary.maintenance,
    },
] as const;

export function GearInventoryStats({ summary, loading }: GearInventoryStatsProps) {
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
