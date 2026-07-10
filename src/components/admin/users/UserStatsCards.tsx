"use client";

import { Shield, UserCheck, Users, UserX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { UserSummary } from "@/hooks/admin/useUserSummary";

interface UserStatsCardsProps {
    summary: UserSummary;
    loading: boolean;
}

const tiles = [
    {
        key: 'total',
        label: 'Total users',
        icon: Users,
        tone: 'text-foreground',
        getValue: (s: UserSummary) => s.total,
    },
    {
        key: 'admins',
        label: 'Admins',
        icon: Shield,
        tone: 'text-purple-600',
        getValue: (s: UserSummary) => s.admins,
    },
    {
        key: 'active',
        label: 'Active',
        icon: UserCheck,
        tone: 'text-emerald-600',
        getValue: (s: UserSummary) => s.active,
    },
    {
        key: 'inactive',
        label: 'Inactive',
        icon: UserX,
        tone: 'text-muted-foreground',
        getValue: (s: UserSummary) => s.inactive,
    },
] as const;

export function UserStatsCards({ summary, loading }: UserStatsCardsProps) {
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
                                    {loading ? '—' : tile.getValue(summary)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
