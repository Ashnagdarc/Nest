// User dashboard for Nest by Eden Oasis. Provides real-time asset stats, notifications, and activity.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    ArrowUpDown,
    ArrowUpRight,
    Box,
    Clock,
    PackageCheck,
    Search,
    type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { NotificationsCard } from "@/components/dashboard/NotificationsCard";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { logError } from "@/lib/logger";
import { useUnifiedDashboard } from "@/hooks/dashboard/use-unified-dashboard";
import { apiGet } from "@/lib/apiClient";

interface Profile {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    department: string | null;
    email: string | null;
    role: "Admin" | "User";
    status: "Active" | "Inactive" | "Suspended";
}

interface StatCard {
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

export default function UserDashboardPage() {
    const { data: dashboardData, loading: isLoading, refetch } = useUnifiedDashboard();
    const [mounted, setMounted] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);

    useEffect(() => {
        setMounted(true);

        const fetchUserProfile = async () => {
            try {
                const { data, error } = await apiGet<{ data: Profile | null; error: string | null }>(
                    "/api/users/profile"
                );
                if (error) {
                    logError(error, "fetchUserProfile");
                } else if (data) {
                    setProfile(data);
                }
            } catch (error) {
                if (error instanceof Error || typeof error === "string") {
                    logError(error, "fetchUserProfile");
                }
            }
        };

        fetchUserProfile();
    }, []);

    const handleMarkAllRead = async () => {
        try {
            await fetch("/api/notifications/mark-read", { method: "PUT", credentials: "include" });
            refetch?.();
        } catch (error) {
            logError(error, "markAllNotificationsRead");
        }
    };

    const stats: StatCard[] = [
        {
            title: "Checked Out Gears",
            value: dashboardData?.stats.checked_out_equipment ?? 0,
            icon: PackageCheck,
            iconClass: "text-blue-500",
            badgeClass: "bg-blue-600 text-white",
            link: "/user/my-requests",
            description: "Currently in your possession",
        },
        {
            title: "Overdue Gears",
            value: dashboardData?.overdue_items?.length ?? 0,
            icon: Clock,
            iconClass: "text-red-500",
            badgeClass: "bg-red-600 text-white",
            link: "/user/check-in",
            description: "Past due date - please return",
        },
        {
            title: "Available Gears",
            value: dashboardData?.stats.available_equipment ?? 0,
            icon: Box,
            iconClass: "text-green-500",
            badgeClass: "bg-green-600 text-white",
            link: "/user/browse",
            description: "Ready for checkout",
        },
    ];

    return (
        <ErrorBoundary>
            <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8">
                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6"
                >
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight truncate">
                            Welcome back, {profile?.full_name || "User"}
                        </h1>
                        <p className="text-muted-foreground mt-1.5 text-sm sm:text-base lg:text-lg">
                            {profile?.department ? `${profile.department} Department` : "Here's what's happening with your gear"}
                        </p>
                    </div>
                    <div className="flex flex-col xs:flex-row items-stretch gap-3 w-full md:w-auto shrink-0">
                        <Button asChild className="gap-2 min-h-[44px]">
                            <Link href="/user/browse">
                                <Search className="h-4 w-4" />
                                Browse Gear
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="gap-2 min-h-[44px]">
                            <Link href="/user/check-in">
                                <ArrowUpDown className="h-4 w-4" />
                                Check-in Gear
                            </Link>
                        </Button>
                    </div>
                </motion.header>

                {/* Quick Actions */}
                <motion.section
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    aria-label="Quick actions"
                >
                    <QuickActions />
                </motion.section>

                {/* Stats */}
                {isLoading ? (
                    <LoadingState variant="cards" count={3} />
                ) : (
                    <section aria-label="Your stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {stats.map((stat, i) => (
                            <motion.div
                                key={stat.title}
                                custom={i}
                                initial="hidden"
                                animate="visible"
                                variants={cardVariants}
                            >
                                <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-border/50">
                                    <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                                        <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2.5 min-w-0">
                                            <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 shrink-0 ${stat.iconClass}`} />
                                            <span className="truncate">{stat.title}</span>
                                        </CardTitle>
                                        <Badge className={`text-sm px-3 py-1 font-bold shadow-none shrink-0 rounded-lg ${stat.badgeClass}`}>
                                            {stat.value}
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{stat.description}</p>
                                        <Link
                                            href={stat.link}
                                            className="text-primary hover:underline text-sm inline-flex items-center gap-1.5"
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

                {/* Notifications & Activity */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                    <NotificationsCard
                        notifications={dashboardData?.notifications ?? []}
                        isLoading={isLoading}
                        onMarkAllRead={handleMarkAllRead}
                    />
                    <RecentActivityCard
                        activity={dashboardData?.recent_activity ?? []}
                        isLoading={isLoading}
                        mounted={mounted}
                    />
                </div>
            </div>
        </ErrorBoundary>
    );
}
