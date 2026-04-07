"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Package,
    Users,
    Clock,
    AlertTriangle,
    Bell,
    Activity,
    Plus,
    ArrowUpRight,
    RefreshCcw,
    CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { logError } from '@/lib/logger';
import { useToast } from "@/hooks/use-toast";
import { useUnifiedDashboard } from '@/hooks/dashboard/use-unified-dashboard';
import React from 'react';
import AddGearForm from "@/components/admin/add-gear-form";

// Types for dashboard data
interface DashboardStats {
    total_equipment: number;
    available_equipment: number;
    checked_out_equipment: number;
    total_users: number;
    active_users: number;
    pending_requests: number;
    approved_requests: number;
    rejected_requests: number;
    pending_checkins: number;
    total_notifications: number;
    unread_notifications: number;
}

interface PendingItem {
    id: string;
    type: 'request' | 'checkin' | 'notification';
    title: string;
    description: string;
    user_name: string;
    created_at: string;
    status: string;
    priority: 'high' | 'medium' | 'low';
}

interface RecentActivity {
    id: string;
    type: string;
    action: string;
    item: string;
    user_name: string;
    timestamp: string;
    status: string;
}

/**
 * Simplified Admin Dashboard following Apple's Human Interface Guidelines
 * Clean, focused design with clear priorities and easy navigation
 */
export default function AdminDashboardPage() {
    const { toast } = useToast();
    const supabase = createClient();
    const router = useRouter();
    const [addGearOpen, setAddGearOpen] = useState(false);
    const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

    const markNotificationRead = async (id: string, redirectAfter: boolean = false) => {
        try {
            // Optimistic remove
            setPendingItems(prev => prev.filter(p => !(p.type === 'notification' && p.id === id)));
            const res = await fetch(`/api/admin/notifications/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_read: true })
            });
            if (!res.ok) {
                throw new Error(`Failed to mark read: ${res.status}`);
            }
            if (redirectAfter) {
                router.push('/admin/notifications');
            }
        } catch (e: any) {
            toast({ title: 'Could not dismiss', description: e?.message || 'Try again', variant: 'destructive' });
        }
    };

    // Use unified dashboard data
    const { data: dashboardData, loading: isLoading, error: dashboardError } = useUnifiedDashboard();

    // Fetch pending items that need admin attention
    useEffect(() => {
        const fetchPendingItems = async () => {
            try {
                console.log('🔍 Fetching pending items...');

                let requests: any[] = [];
                let checkins: any[] = [];
                let notifications: any[] = [];

                // Fetch pending gear requests (with individual error handling)
                try {
                    const { data: requestsData, error: requestsError } = await supabase
                        .from('gear_requests')
                        .select('id, created_at, status, reason, destination, user_id')
                        .eq('status', 'Pending')
                        .order('created_at', { ascending: false })
                        .limit(5);

                    if (requestsError) {
                        console.error('Error fetching pending requests:', requestsError);
                    } else {
                        requests = requestsData || [];
                    }
                } catch (error) {
                    console.error('Exception fetching pending requests:', error);
                }

                // Fetch pending check-ins (with individual error handling)
                try {
                    const { data: checkinsData, error: checkinsError } = await supabase
                        .from('checkins')
                        .select('id, created_at, status, notes, user_id, gear_id')
                        .eq('status', 'Pending Admin Approval')
                        .order('created_at', { ascending: false })
                        .limit(5);

                    if (checkinsError) {
                        console.error('Error fetching pending check-ins:', checkinsError);
                    } else {
                        checkins = checkinsData || [];
                    }
                } catch (error) {
                    console.error('Exception fetching pending check-ins:', error);
                }

                // Fetch unread notifications (with individual error handling)
                try {
                    const { data: notificationsData, error: notificationsError } = await supabase
                        .from('notifications')
                        .select('id, created_at, title, message, type, user_id')
                        .eq('is_read', false)
                        .order('created_at', { ascending: false })
                        .limit(5);

                    if (notificationsError) {
                        console.error('Error fetching unread notifications:', notificationsError);
                    } else {
                        notifications = notificationsData || [];
                    }
                } catch (error) {
                    console.error('Exception fetching unread notifications:', error);
                }

                // Transform data with fallbacks
                const pendingRequests: PendingItem[] = (requests || []).map(item => ({
                    id: item.id,
                    type: 'request',
                    title: `Request: ${item.reason || 'Gear Request'}`,
                    description: `Destination: ${item.destination || 'Not specified'}`,
                    user_name: `User ${item.user_id?.slice(0, 8) || 'Unknown'}`,
                    created_at: item.created_at,
                    status: item.status,
                    priority: 'high'
                }));

                const pendingCheckins: PendingItem[] = (checkins || []).map(item => ({
                    id: item.id,
                    type: 'checkin',
                    title: `Check-in: Gear ${item.gear_id?.slice(0, 8) || 'Unknown'}`,
                    description: item.notes || 'No notes provided',
                    user_name: `User ${item.user_id?.slice(0, 8) || 'Unknown'}`,
                    created_at: item.created_at,
                    status: item.status,
                    priority: 'high'
                }));

                const pendingNotifications: PendingItem[] = (notifications || []).map(item => ({
                    id: item.id,
                    type: 'notification',
                    title: item.title,
                    description: item.message,
                    user_name: `User ${item.user_id?.slice(0, 8) || 'Unknown'}`,
                    created_at: item.created_at,
                    status: item.type,
                    priority: 'medium'
                }));

                console.log('🔍 Pending items fetched:', {
                    requests: pendingRequests.length,
                    checkins: pendingCheckins.length,
                    notifications: pendingNotifications.length,
                    total: pendingRequests.length + pendingCheckins.length + pendingNotifications.length
                });

                console.log('🔍 Raw data:', {
                    requestsData: requests,
                    checkinsData: checkins,
                    notificationsData: notifications
                });

                // Combine and deduplicate items
                const allItems = [...pendingRequests, ...pendingCheckins, ...pendingNotifications];

                // Deduplicate by id and type
                const uniqueItems = allItems.filter((item, index, self) =>
                    index === self.findIndex(t => t.id === item.id && t.type === item.type)
                );

                console.log('🔍 Deduplicated items:', {
                    before: allItems.length,
                    after: uniqueItems.length
                });

                setPendingItems(uniqueItems);
            } catch (error) {
                // Only log if it's a real error, not an empty object
                if (error && (typeof error === 'string' || error instanceof Error || (typeof error === 'object' && Object.keys(error).length > 0))) {
                    logError(error, 'fetchPendingItems');
                }
            }
        };

        fetchPendingItems();
    }, []); // Remove supabase dependency to prevent multiple runs

    // Fetch recent activity
    useEffect(() => {
        const fetchRecentActivity = async () => {
            try {
                // Simplified query without joins
                const { data: activities, error } = await supabase
                    .from('checkins')
                    .select('id, action, created_at, status, user_id, gear_id')
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (error) {
                    console.error('Error fetching recent activity:', error);
                    // Don't throw, just log and continue
                }

                // Build human-friendly labels by looking up user and gear names
                const gearIds = Array.from(new Set((activities || []).map(a => a.gear_id).filter(Boolean)));
                const userIds = Array.from(new Set((activities || []).map(a => a.user_id).filter(Boolean)));

                const [gearsRes, usersRes] = await Promise.all([
                    gearIds.length > 0
                        ? supabase.from('gears').select('id, name').in('id', gearIds as any)
                        : Promise.resolve({ data: [], error: null } as any),
                    userIds.length > 0
                        ? supabase.from('profiles').select('id, full_name').in('id', userIds as any)
                        : Promise.resolve({ data: [], error: null } as any),
                ]);

                const gearMap = new Map<string, string>();
                (gearsRes.data || []).forEach((g: any) => { if (g?.id) gearMap.set(g.id, g.name || 'Gear'); });
                const userMap = new Map<string, string>();
                (usersRes.data || []).forEach((u: any) => { if (u?.id) userMap.set(u.id, u.full_name || `User`); });

                const transformedActivities: RecentActivity[] = (activities || []).map(item => ({
                    id: item.id,
                    type: 'checkin',
                    action: item.action,
                    item: gearMap.get(item.gear_id as any) || 'Gear',
                    user_name: userMap.get(item.user_id as any) || 'User',
                    timestamp: item.created_at,
                    status: item.status
                }));

                setRecentActivity(transformedActivities);
            } catch (error) {
                // Only log if it's a real error, not an empty object
                if (error && (typeof error === 'string' || error instanceof Error || (typeof error === 'object' && Object.keys(error).length > 0))) {
                    logError(error, 'fetchRecentActivity');
                }
            }
        };

        fetchRecentActivity();
    }, [supabase]);

    // Transform dashboard data into simplified stats
    const stats: DashboardStats = {
        total_equipment: dashboardData?.stats?.total_equipment || 0,
        available_equipment: dashboardData?.stats?.available_equipment || 0,
        checked_out_equipment: dashboardData?.stats?.checked_out_equipment || 0,
        total_users: dashboardData?.stats?.total_users || 0,
        active_users: dashboardData?.stats?.active_users || 0,
        pending_requests: dashboardData?.stats?.pending_requests || 0,
        approved_requests: dashboardData?.stats?.approved_requests || 0,
        rejected_requests: dashboardData?.stats?.rejected_requests || 0,
        pending_checkins: pendingItems.filter(item => item.type === 'checkin').length,
        total_notifications: dashboardData?.notifications?.length || 0,
        unread_notifications: pendingItems.filter(item => item.type === 'notification').length,
    };

    const pendingCarBookings = (dashboardData as any)?.stats?.pending_car_bookings || 0;

    // Main dashboard stats (3 key metrics like user dashboard)
    const mainStats = [
        {
            title: 'Equipment',
            value: stats.total_equipment,
            icon: Package,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
            link: '/admin/manage-gears',
            description: `${stats.available_equipment} available, ${stats.checked_out_equipment} checked out`
        },
        {
            title: 'Users',
            value: stats.total_users,
            icon: Users,
            color: 'text-green-500',
            bgColor: 'bg-green-500/10',
            link: '/admin/manage-users',
            description: `${stats.active_users} active users`
        },
        {
            title: 'Pending Actions',
            value: stats.pending_checkins + stats.pending_requests + pendingCarBookings,
            icon: Clock,
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10',
            link: '/admin/manage-requests',
            description: `${stats.pending_checkins} check-ins, ${stats.pending_requests} requests, ${pendingCarBookings} car bookings`
        },
    ];

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: i * 0.1,
                duration: 0.4,
                ease: "easeOut",
            },
        }),
    };


    const formatTimeAgo = (timestamp: string) => {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    return (
        <ErrorBoundary>
            <div className="container mx-auto px-6 sm:px-8 lg:px-12 py-8 sm:py-12 lg:py-16 space-y-8 sm:space-y-12">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-2"
                >
                    <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground">
                        Admin Dashboard
                    </h1>
                    <p className="text-muted-foreground text-base sm:text-lg max-w-2xl">
                        Monitor equipment status, oversee user activity, and manage system operations from a single view.
                    </p>
                </motion.div>
                {/* Error Display */}
                {dashboardError && (
                    <div className="text-red-500 font-bold text-center py-4 px-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        {dashboardError}
                    </div>
                )}

                {/* Main Stats Cards */}
                {isLoading ? (
                    <LoadingState variant="cards" count={3} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {mainStats.map((stat, i) => (
                            <motion.div
                                key={stat.title}
                                custom={i}
                                initial="hidden"
                                animate="visible"
                                variants={cardVariants}
                            >
                                <Card className="relative overflow-hidden border-none bg-accent/10 hover:bg-accent/20 transition-all duration-300 rounded-2xl group">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <div className={`p-2 rounded-xl ${stat.bgColor}`}>
                                            {React.createElement(stat.icon, { className: `h-5 w-5 ${stat.color}` })}
                                        </div>
                                        <span className="text-2xl font-semibold tracking-tight">{stat.value}</span>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-1">
                                            <h3 className="font-medium text-sm text-foreground">{stat.title}</h3>
                                            <p className="text-sm text-muted-foreground/70">{stat.description}</p>
                                        </div>
                                        <Link
                                            href={stat.link}
                                            className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:gap-2 transition-all"
                                        >
                                            View details
                                            <ArrowUpRight className="h-4 w-4 ml-1" />
                                        </Link>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <Card className="border-none bg-accent/5 rounded-2xl">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Quick Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-3">
                                <Dialog open={addGearOpen} onOpenChange={setAddGearOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="h-12 px-6 rounded-full bg-primary text-primary-foreground shadow-sm hover:scale-105 transition-all gap-2 text-sm font-semibold">
                                            <Plus className="h-5 w-5" />
                                            Add Equipment
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md rounded-3xl border-none">
                                        <DialogHeader>
                                            <DialogTitle className="text-2xl font-semibold tracking-tight">Add New Equipment</DialogTitle>
                                        </DialogHeader>
                                        <AddGearForm onSubmit={() => setAddGearOpen(false)} />
                                    </DialogContent>
                                </Dialog>
                                <Button asChild variant="secondary" className="h-12 px-6 rounded-full transition-all gap-2 bg-background hover:bg-background/80 text-sm font-semibold">
                                    <Link href="/admin/manage-requests">
                                        <CheckCircle2 className="h-5 w-5 text-primary" />
                                        Manage Requests
                                    </Link>
                                </Button>
                                <Button asChild variant="secondary" className="h-12 px-6 rounded-full transition-all gap-2 bg-background hover:bg-background/80 text-sm font-semibold">
                                    <Link href="/admin/manage-checkins">
                                        <RefreshCcw className="h-5 w-5 text-primary" />
                                        Manage Check-ins
                                    </Link>
                                </Button>
                                <Button asChild variant="secondary" className="h-12 px-6 rounded-full transition-all gap-2 bg-background hover:bg-background/80 text-sm font-semibold">
                                    <Link href="/admin/manage-users">
                                        <Users className="h-5 w-5 text-primary" />
                                        User Management
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
                    {/* Left Column - Pending Items */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="space-y-6 sm:space-y-8"
                    >
                        <Card className="border-none bg-accent/5 rounded-2xl h-full">
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Needs Attention
                                </CardTitle>
                                <div className="px-3 py-1 rounded-full bg-primary/10 text-[10px] font-bold text-primary tracking-widest uppercase">
                                    {pendingItems.length} items
                                </div>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-4">
                                        {[...Array(3)].map((_, i) => (
                                            <div key={i} className="h-16 w-full bg-accent/20 rounded-xl animate-pulse" />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {pendingItems.length === 0 ? (
                                            <div className="text-center py-12">
                                                <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-4">
                                                    <CheckCircle2 className="h-8 w-8 text-primary/40" />
                                                </div>
                                                <p className="text-sm text-muted-foreground">Everything looks good!</p>
                                            </div>
                                        ) : (
                                            pendingItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="group relative flex items-center gap-4 p-5 rounded-xl bg-background/40 hover:bg-background transition-all cursor-pointer border border-transparent hover:border-border/40 hover:shadow-sm"
                                                    onClick={() => { if (item.type === 'notification') markNotificationRead(item.id, true); }}
                                                >
                                                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${item.type === 'checkin' ? 'bg-orange-500/10' :
                                                        item.type === 'request' ? 'bg-purple-500/10' :
                                                            'bg-blue-500/10'
                                                        }`}>
                                                        {item.type === 'checkin' ? <CheckCircle2 className="h-5 w-5 text-orange-500" /> :
                                                            item.type === 'request' ? <Clock className="h-5 w-5 text-purple-500" /> :
                                                                <Bell className="h-5 w-5 text-blue-500" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <h4 className="text-sm font-semibold text-foreground truncate">{item.title}</h4>
                                                            <span className="text-xs text-muted-foreground font-medium shrink-0">
                                                                {formatTimeAgo(item.created_at)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs text-muted-foreground/80 font-medium">{item.user_name}</span>
                                                            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${item.priority === 'high' ? 'text-red-500' :
                                                                item.priority === 'medium' ? 'text-orange-500' :
                                                                    'text-green-500'
                                                                }`}>{item.priority}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Right Column - Recent Activity */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="space-y-6 sm:space-y-8"
                    >
                        <Card className="border-none bg-accent/5 rounded-2xl h-full">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                    <Activity className="h-4 w-4" />
                                    Recent Activity
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-4">
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className="h-12 w-full bg-accent/20 rounded-xl animate-pulse" />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        {(() => {
                                            if (recentActivity.length === 0) return <p className="text-sm text-muted-foreground py-10 text-center">No recent activity detected.</p>;
                                            const groups = new Map<string, RecentActivity[]>();
                                            for (const a of recentActivity) {
                                                const d = new Date(a.timestamp);
                                                const key = d.toISOString().slice(0, 10);
                                                const arr = groups.get(key) || [];
                                                arr.push(a);
                                                groups.set(key, arr);
                                            }
                                            const ordered = Array.from(groups.entries()).sort((a, b) => a[0] > b[0] ? -1 : 1);
                                            const pretty = (k: string) => {
                                                const today = new Date().toISOString().slice(0, 10);
                                                const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
                                                if (k === today) return 'Today';
                                                if (k === y) return 'Yesterday';
                                                const d = new Date(k); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                            };
                                            return ordered.map(([k, arr]) => (
                                                <div key={k} className="space-y-3">
                                                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 px-2">{pretty(k)}</h5>
                                                    <div className="space-y-1">
                                                        {arr.slice(0, 5).map((activity) => (
                                                            <div key={activity.id} className="flex items-center gap-4 p-4 rounded-xl bg-background/40 hover:bg-background transition-all hover:shadow-sm group">
                                                                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary/5 group-hover:bg-primary/10 transition-colors">
                                                                    <Activity className="h-4 w-4 text-primary/60" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm text-foreground/80 font-medium leading-tight">
                                                                        <span className="text-muted-foreground font-normal">{activity.user_name}</span> {activity.action.toLowerCase()} <span className="text-primary/70">{activity.item}</span>
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground/40 mt-1 font-medium">{formatTimeAgo(activity.timestamp)}</p>
                                                                </div>
                                                                <div className="px-3 py-1 rounded-full bg-accent/30 text-[10px] font-bold text-muted-foreground/60 tracking-tight uppercase">
                                                                    {activity.status}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Additional Stats Row */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                >
                    <Card className="border-none bg-accent/5 rounded-2xl">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">System Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
                                <div className="space-y-2">
                                    <div className="text-2xl font-semibold text-blue-500 tracking-tight">{stats.available_equipment}</div>
                                    <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/40 px-0.5">Available</div>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-2xl font-semibold text-orange-500 tracking-tight">{stats.checked_out_equipment}</div>
                                    <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/40 px-0.5">Checked Out</div>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-2xl font-semibold text-green-500 tracking-tight">{stats.approved_requests}</div>
                                    <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/40 px-0.5">Approved</div>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-2xl font-semibold text-red-500 tracking-tight">{stats.rejected_requests}</div>
                                    <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/40 px-0.5">Rejected</div>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-2xl font-semibold text-purple-500 tracking-tight">{stats.total_notifications}</div>
                                    <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/40 px-0.5">Alerts</div>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-2xl font-semibold text-yellow-500 tracking-tight">{stats.unread_notifications}</div>
                                    <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/40 px-0.5">Unread</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </ErrorBoundary>
    );
}
