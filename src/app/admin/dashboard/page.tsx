"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Package,
    Users,
    Clock,
    AlertTriangle,
    Bell,
    Activity,
    Settings,
    BarChart3,
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
    const { data: dashboardData, loading: isLoading, error: dashboardError, refetch } = useUnifiedDashboard();

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

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800 border-red-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending Admin Approval': return 'bg-orange-100 text-orange-800';
            case 'Completed': return 'bg-green-100 text-green-800';
            case 'System': return 'bg-blue-100 text-blue-800';
            case 'Request': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
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
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 sm:gap-8"
                >
                    <div className="flex-1 min-w-0">
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground truncate leading-tight">
                            Admin Dashboard
                        </h1>
                        <p className="text-muted-foreground mt-2 text-base sm:text-lg lg:text-xl leading-relaxed">
                            Manage equipment, users, and system operations
                        </p>
                    </div>
                    {/* Header actions removed as requested */}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {mainStats.map((stat, i) => (
                            <motion.div
                                key={stat.title}
                                custom={i}
                                initial="hidden"
                                animate="visible"
                                variants={cardVariants}
                                className="w-full"
                            >
                                <Card className="h-full hover:shadow-lg transition-all duration-300 border-border/50">
                                    <CardHeader className="flex flex-row items-center justify-between pb-3 p-6">
                                        <CardTitle className="text-base sm:text-lg lg:text-xl font-semibold flex items-center gap-3 truncate">
                                            {React.createElement(stat.icon, { className: `h-6 w-6 sm:h-7 sm:w-7 ${stat.color} flex-shrink-0` })}
                                            <span className="truncate">{stat.title}</span>
                                        </CardTitle>
                                        <Badge
                                            className={
                                                'text-sm sm:text-base px-3 sm:px-4 py-1.5 font-bold shadow-none flex-shrink-0 rounded-lg ' +
                                                (stat.title === 'Equipment' ? 'bg-blue-600 text-white' :
                                                    stat.title === 'Users' ? 'bg-green-600 text-white' :
                                                        stat.title === 'Pending Actions' ? 'bg-orange-600 text-white' :
                                                            'bg-gray-600 text-white')
                                            }
                                        >
                                            {stat.value}
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-0">
                                        <p className="text-sm sm:text-base text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                                            {stat.description}
                                        </p>
                                        {stat.value === 0 && (
                                            <div className="text-sm text-muted-foreground italic">No {stat.title.toLowerCase()}.</div>
                                        )}
                                        <Link href={stat.link} className="text-blue-500 hover:underline text-sm sm:text-base inline-flex items-center gap-2">
                                            View details
                                            <ArrowUpRight className="h-4 w-4" />
                                        </Link>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Plus className="h-5 w-5" />
                                Quick Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <Dialog open={addGearOpen} onOpenChange={setAddGearOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="gap-2 h-12">
                                            <Plus className="h-4 w-4" />
                                            Add Equipment
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>Add New Equipment</DialogTitle>
                                        </DialogHeader>
                                        <AddGearForm onSubmit={() => setAddGearOpen(false)} />
                                    </DialogContent>
                                </Dialog>

                                <Button asChild variant="outline" className="gap-2 h-12">
                                    <Link href="/admin/manage-requests">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Manage Requests
                                    </Link>
                                </Button>

                                <Button asChild variant="outline" className="gap-2 h-12">
                                    <Link href="/admin/manage-checkins">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Manage Check-ins
                                    </Link>
                                </Button>

                                <Button asChild variant="outline" className="gap-2 h-12">
                                    <Link href="/admin/manage-users">
                                        <Users className="h-4 w-4" />
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
                        <Card>
                            <CardHeader className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    Needs Attention
                                </CardTitle>
                                <Badge variant="secondary" className="text-xs">
                                    {pendingItems.length} items
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-3">
                                        {[...Array(3)].map((_, i) => (
                                            <div key={i} className="flex items-center space-x-3">
                                                <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                                                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {pendingItems.length === 0 ? (
                                            <div className="text-center py-8">
                                                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                                                <p className="text-muted-foreground">All caught up! No pending items.</p>
                                            </div>
                                        ) : (
                                            pendingItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center space-x-3 p-3 rounded-lg bg-card border hover:bg-accent cursor-pointer"
                                                    onClick={() => { if (item.type === 'notification') markNotificationRead(item.id, true); }}
                                                >
                                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${item.type === 'checkin' ? 'bg-orange-100' :
                                                        item.type === 'request' ? 'bg-purple-100' :
                                                            'bg-blue-100'
                                                        }`}>
                                                        {item.type === 'checkin' ? (
                                                            <CheckCircle2 className="h-4 w-4 text-orange-600" />
                                                        ) : item.type === 'request' ? (
                                                            <Clock className="h-4 w-4 text-purple-600" />
                                                        ) : (
                                                            <Bell className="h-4 w-4 text-blue-600" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{item.user_name}</p>
                                                        <p className="text-xs text-muted-foreground">{formatTimeAgo(item.created_at)}</p>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                                                            {item.priority}
                                                        </Badge>
                                                        <Badge
                                                            onClick={(e) => { e.stopPropagation(); if (item.type === 'notification') markNotificationRead(item.id, true); }}
                                                            className={`text-xs ${getStatusColor(item.status)} cursor-pointer`}
                                                        >
                                                            {item.status}
                                                        </Badge>
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
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5" />
                                    Recent Activity
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-3">
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className="flex items-center space-x-3">
                                                <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                                                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {(() => {
                                            if (recentActivity.length === 0) return <p className="text-muted-foreground text-sm">No recent activity</p>;
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
                                                const d = new Date(k); return d.toLocaleDateString();
                                            };
                                            return ordered.map(([k, arr]) => (
                                                <details key={k} className="rounded border">
                                                    <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold flex items-center justify-between">
                                                        <span>{pretty(k)}</span>
                                                        <span className="text-muted-foreground text-xs">{arr.length}</span>
                                                    </summary>
                                                    <div className="space-y-2 p-2 pt-0">
                                                        {arr.slice(0, 20).map((activity) => (
                                                            <div key={activity.id} className="flex items-center space-x-3 p-3 rounded-lg bg-card border">
                                                                <div className="h-8 w-8 rounded-full flex items-center justify-center bg-primary/15">
                                                                    <Activity className="h-4 w-4 text-primary" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-medium text-foreground">
                                                                        {activity.user_name} {activity.action.toLowerCase()} {activity.item}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">{formatTimeAgo(activity.timestamp)}</p>
                                                                </div>
                                                                <Badge variant="secondary" className="text-xs">{activity.status}</Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </details>
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
                    <Card>
                        <CardHeader>
                            <CardTitle>System Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">{stats.available_equipment}</div>
                                    <div className="text-sm text-muted-foreground">Available</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-orange-600">{stats.checked_out_equipment}</div>
                                    <div className="text-sm text-muted-foreground">Checked Out</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">{stats.approved_requests}</div>
                                    <div className="text-sm text-muted-foreground">Approved</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-red-600">{stats.rejected_requests}</div>
                                    <div className="text-sm text-muted-foreground">Rejected</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-purple-600">{stats.total_notifications}</div>
                                    <div className="text-sm text-muted-foreground">Notifications</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-yellow-600">{stats.unread_notifications}</div>
                                    <div className="text-sm text-muted-foreground">Unread</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </ErrorBoundary>
    );
}
