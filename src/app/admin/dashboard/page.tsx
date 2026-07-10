"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    ArrowUpRight,
    Clock,
    Package,
    Users,
    type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingState } from "@/components/ui/loading-state";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { AdminQuickActions } from "@/components/admin/dashboard/AdminQuickActions";
import {
    AdminAttentionCard,
    AdminOverviewCard,
} from "@/components/admin/dashboard/AdminAttentionCard";
import { buildAdminAttentionItems } from "@/components/admin/dashboard/admin-attention";
import { useUnifiedDashboard } from "@/hooks/dashboard/use-unified-dashboard";
import { apiGet } from "@/lib/apiClient";

interface AdminProfile {
    full_name: string | null;
    department: string | null;
}

interface StatCardConfig {
    title: string;
    value: number;
    icon: LucideIcon;
    iconClass: string;
    badgeClass: string;
    link: string;
    description: string;
}

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" as const },
    }),
};

export default function AdminDashboardPage() {
    const { data, loading, error, refetch } = useUnifiedDashboard();
    const [mounted, setMounted] = useState(false);
    const [profile, setProfile] = useState<AdminProfile | null>(null);

    useEffect(() => {
        setMounted(true);
        void apiGet<{ data: AdminProfile | null }>("/api/users/profile").then((response) => {
            if (response.data) setProfile(response.data);
        });
    }, []);

    const stats = data?.stats;
    const pendingCarBookings = stats?.pending_car_bookings ?? 0;
    const pendingActions =
        (stats?.pending_requests ?? 0) +
        (stats?.pending_checkins ?? 0) +
        pendingCarBookings;

    const attentionItems = useMemo(() => buildAdminAttentionItems(data), [data]);

    const mainStats: StatCardConfig[] = [
        {
            title: "Equipment",
            value: stats?.total_equipment ?? 0,
            icon: Package,
            iconClass: "text-blue-500",
            badgeClass: "bg-blue-600 text-white",
            link: "/admin/manage-gears",
            description: `${stats?.available_equipment ?? 0} available, ${stats?.checked_out_equipment ?? 0} checked out`,
        },
        {
            title: "Users",
            value: stats?.total_users ?? 0,
            icon: Users,
            iconClass: "text-green-500",
            badgeClass: "bg-green-600 text-white",
            link: "/admin/manage-users",
            description: `${stats?.active_users ?? 0} active users`,
        },
        {
            title: "Pending actions",
            value: pendingActions,
            icon: Clock,
            iconClass: "text-orange-500",
            badgeClass: "bg-orange-600 text-white",
            link: "/admin/manage-requests",
            description: `${stats?.pending_requests ?? 0} requests, ${stats?.pending_checkins ?? 0} check-ins, ${pendingCarBookings} car bookings`,
        },
    ];

    return (
        <ErrorBoundary>
            <div className="mx-auto w-full max-w-7xl space-y-6 sm:space-y-8">
                <motion.header
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
                >
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                            Admin dashboard
                        </h1>
                        <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
                            {profile?.full_name
                                ? `Welcome back, ${profile.full_name}. Monitor operations and clear pending work.`
                                : "Monitor equipment, users, and pending approvals from one place."}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/admin/manage-requests">
                                Review requests
                                <ArrowUpRight className="h-4 w-4" />
                            </Link>
                        </Button>
                        <Button asChild className="gap-2">
                            <Link href="/admin/manage-checkins">
                                Review check-ins
                                <ArrowUpRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </motion.header>

                {error ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {error}
                    </div>
                ) : null}

                <motion.section
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <AdminQuickActions onRefresh={() => refetch?.()} />
                </motion.section>

                {loading ? (
                    <LoadingState variant="cards" count={3} />
                ) : (
                    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
                        {mainStats.map((stat, index) => (
                            <motion.div
                                key={stat.title}
                                custom={index}
                                initial="hidden"
                                animate="visible"
                                variants={cardVariants}
                            >
                                <Card className="h-full border-border/50 transition-shadow hover:shadow-lg">
                                    <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                                        <CardTitle className="flex min-w-0 items-center gap-2.5 text-sm font-semibold sm:text-base">
                                            <stat.icon className={`h-5 w-5 shrink-0 ${stat.iconClass}`} />
                                            <span className="truncate">{stat.title}</span>
                                        </CardTitle>
                                        <Badge
                                            className={`shrink-0 rounded-lg px-3 py-1 text-sm font-bold shadow-none ${stat.badgeClass}`}
                                        >
                                            {stat.value}
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                                            {stat.description}
                                        </p>
                                        <Link
                                            href={stat.link}
                                            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                                        >
                                            View details
                                            <ArrowUpRight className="h-4 w-4" />
                                        </Link>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </section>
                )}

                <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 xl:grid-cols-2">
                    <AdminAttentionCard items={attentionItems} isLoading={loading} />
                    <RecentActivityCard
                        activity={data?.recent_activity ?? []}
                        isLoading={loading}
                        mounted={mounted}
                    />
                </div>

                <AdminOverviewCard
                    available={stats?.available_equipment ?? 0}
                    checkedOut={stats?.checked_out_equipment ?? 0}
                    approvedRequests={stats?.approved_requests ?? 0}
                    rejectedRequests={stats?.rejected_requests ?? 0}
                    unreadNotifications={stats?.unread_notifications ?? 0}
                    pendingActions={pendingActions}
                />
            </div>
        </ErrorBoundary>
    );
}
