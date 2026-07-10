"use client";

import { Car, CheckCircle2, Clock, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface BookingStatsCardsProps {
    pending: number;
    activeTrips: number;
    availableCars: number;
    historyTotal: number;
    loading?: boolean;
}

const tiles = [
    { key: "pending", label: "Pending approvals", icon: Clock, tone: "text-orange-600", getValue: (s: BookingStatsCardsProps) => s.pending },
    { key: "active", label: "Active trips", icon: Car, tone: "text-blue-600", getValue: (s: BookingStatsCardsProps) => s.activeTrips },
    { key: "available", label: "Cars available", icon: CheckCircle2, tone: "text-emerald-600", getValue: (s: BookingStatsCardsProps) => s.availableCars },
    { key: "history", label: "History records", icon: History, tone: "text-slate-600", getValue: (s: BookingStatsCardsProps) => s.historyTotal },
] as const;

export function BookingStatsCards(props: BookingStatsCardsProps) {
    const { loading = false } = props;

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
                                    {loading ? "—" : tile.getValue(props)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
