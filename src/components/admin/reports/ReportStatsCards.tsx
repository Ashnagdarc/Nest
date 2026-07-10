"use client";

import { AlertTriangle, BarChart3, Package, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { ReportSummary } from '@/lib/reports/types';

interface ReportStatsCardsProps {
    summary: ReportSummary | null;
    topGearName?: string;
    loading?: boolean;
}

const tiles = [
    {
        key: 'requests',
        label: 'Total requests',
        icon: BarChart3,
        tone: 'text-blue-600',
        getValue: (summary: ReportSummary) => summary.totalRequests,
    },
    {
        key: 'checkouts',
        label: 'Check-outs',
        icon: Package,
        tone: 'text-emerald-600',
        getValue: (summary: ReportSummary) => summary.totalCheckouts,
    },
    {
        key: 'damages',
        label: 'Damage reports',
        icon: AlertTriangle,
        tone: 'text-orange-600',
        getValue: (summary: ReportSummary) => summary.damageReports,
    },
    {
        key: 'users',
        label: 'Active users',
        icon: Users,
        tone: 'text-violet-600',
        getValue: (summary: ReportSummary) => summary.activeUsers,
    },
] as const;

export function ReportStatsCards({ summary, topGearName, loading = false }: ReportStatsCardsProps) {
    return (
        <div className="space-y-3">
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
                                        {loading || !summary ? '—' : tile.getValue(summary)}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Card className="border-border/50">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                    <div>
                        <p className="text-muted-foreground">Most requested gear</p>
                        <p className="font-medium">{loading ? '—' : topGearName || 'No requests in this period'}</p>
                    </div>
                    <div className="flex flex-wrap gap-4 text-muted-foreground">
                        <span>
                            Inventory: {loading || !summary ? '—' : `${summary.inventoryAvailable} available / ${summary.inventoryTotal} total`}
                        </span>
                        <span>
                            Utilization: {loading || !summary ? '—' : `${summary.utilizationRate}%`}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
