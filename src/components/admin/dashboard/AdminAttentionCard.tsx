"use client";

import Link from "next/link";
import { AlertTriangle, Bell, Car, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/dashboard/ListSkeleton";
import {
    type AdminAttentionItem,
    formatRelativeTime,
} from "@/components/admin/dashboard/admin-attention";

const typeConfig = {
    request: {
        icon: Clock,
        className: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
    checkin: {
        icon: CheckCircle2,
        className: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    },
    car_booking: {
        icon: Car,
        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
} as const;

interface AdminAttentionCardProps {
    items: AdminAttentionItem[];
    isLoading: boolean;
}

export function AdminAttentionCard({ items, isLoading }: AdminAttentionCardProps) {
    return (
        <Card className="flex h-full max-h-[32rem] flex-col border-border/50">
            <CardHeader className="flex shrink-0 flex-row items-center justify-between gap-3 pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <AlertTriangle className="h-5 w-5" />
                    Needs attention
                </CardTitle>
                <Badge variant="secondary">{items.length}</Badge>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto pt-0">
                {isLoading ? (
                    <ListSkeleton rows={4} />
                ) : items.length === 0 ? (
                    <div className="py-10 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                            <CheckCircle2 className="h-6 w-6 text-primary" />
                        </div>
                        <p className="text-sm font-medium">You&apos;re all caught up</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            No pending requests, check-ins, or car bookings.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {items.map((item) => {
                            const config = typeConfig[item.type];
                            const Icon = config.icon;

                            return (
                                <Link
                                    key={`${item.type}-${item.id}`}
                                    href={item.href}
                                    className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3 transition-colors hover:bg-accent/40"
                                >
                                    <div
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.className}`}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="line-clamp-2 text-sm font-medium leading-snug">
                                                {item.title}
                                            </p>
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {formatRelativeTime(item.createdAt)}
                                            </span>
                                        </div>
                                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                                            {item.subtitle}
                                        </p>
                                        <p className="mt-1 text-xs font-medium text-foreground/80">
                                            {item.userName}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

interface AdminOverviewCardProps {
    available: number;
    checkedOut: number;
    approvedRequests: number;
    rejectedRequests: number;
    unreadNotifications: number;
    pendingActions: number;
}

export function AdminOverviewCard({
    available,
    checkedOut,
    approvedRequests,
    rejectedRequests,
    unreadNotifications,
    pendingActions,
}: AdminOverviewCardProps) {
    const tiles = [
        { label: "Available gear", value: available, tone: "text-blue-600" },
        { label: "Checked out", value: checkedOut, tone: "text-orange-600" },
        { label: "Approved requests", value: approvedRequests, tone: "text-green-600" },
        { label: "Rejected requests", value: rejectedRequests, tone: "text-red-600" },
        { label: "Pending actions", value: pendingActions, tone: "text-amber-600" },
        { label: "Unread alerts", value: unreadNotifications, tone: "text-purple-600" },
    ];

    return (
        <Card className="border-border/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Bell className="h-5 w-5" />
                    System overview
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    {tiles.map((tile) => (
                        <div key={tile.label} className="rounded-lg border border-border/60 p-3">
                            <p className={`text-2xl font-semibold ${tile.tone}`}>{tile.value}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{tile.label}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
