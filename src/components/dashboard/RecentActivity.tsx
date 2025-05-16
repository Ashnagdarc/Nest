import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Package, ArrowUpDown } from "lucide-react";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow, format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./EmptyState";
import { logger } from "@/utils/logger";
import { createSupabaseSubscription } from "@/utils/supabase-subscription";

interface ActivityItem {
    id: string;
    type: "checkout" | "return" | "request";
    item: string;
    gear_id?: string;
    user_id?: string;
    timestamp: string;
    status: string;
}

interface RecentActivityProps {
    embedded?: boolean;
}

export function RecentActivity({ embedded = false }: RecentActivityProps) {
    const supabase = createClient();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchActivity = async () => {
        try {
            setLoading(true);

            // Get current user
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                setLoading(false);
                return;
            }

            // Fetch latest activity from various tables
            const promises = [
                // Gear requests (checkout/returns)
                supabase
                    .from('gear_requests')
                    .select('id, gear_ids, user_id, created_at, status, due_date')
                    .eq('user_id', session.user.id)
                    .order('created_at', { ascending: false })
                    .limit(5),

                // Check-ins (returns)
                supabase
                    .from('checkins')
                    .select('id, gear_id, user_id, checkin_date, status, condition')
                    .eq('user_id', session.user.id)
                    .order('checkin_date', { ascending: false })
                    .limit(5)
            ];

            const [requestsResponse, checkinsResponse] = await Promise.all(promises);

            if (requestsResponse.error) {
                throw requestsResponse.error;
            }

            if (checkinsResponse.error) {
                throw checkinsResponse.error;
            }

            // Get unique gear IDs from both sources
            const gearIds = [
                // Handle gear_ids as an array in requests
                ...(requestsResponse.data?.flatMap((req: any) =>
                    Array.isArray(req.gear_ids) ? req.gear_ids : [req.gear_ids]).filter(Boolean) || []),
                // For checkins, gear_id is a single value
                ...(checkinsResponse.data?.map((checkin: any) => checkin.gear_id) || [])
            ].filter(Boolean);

            // Fetch gear details if there are any IDs
            let gearDetails: Record<string, { name: string }> = {};

            if (gearIds.length > 0) {
                const { data: gears, error: gearError } = await supabase
                    .from('gears')
                    .select('id, name')
                    .in('id', gearIds);

                if (gearError) {
                    throw gearError;
                }

                gearDetails = (gears || []).reduce((acc: Record<string, { name: string }>, gear: any) => {
                    acc[gear.id] = { name: gear.name };
                    return acc;
                }, {} as Record<string, { name: string }>);
            }

            // Process request activities - handle multiple gear items per request
            const requestActivities = (requestsResponse.data || []).flatMap((request: any) => {
                // Handle gear_ids as an array
                const gearIdList = Array.isArray(request.gear_ids) ? request.gear_ids : [request.gear_ids];

                // Create an activity for each gear item in the request
                return gearIdList.filter(Boolean).map((gearId: string) => {
                    let type: ActivityItem["type"];
                    let status: string;
                    let timestamp: string = request.created_at;

                    if (request.status === 'CheckedOut') {
                        type = 'checkout';
                        status = 'Checked out successfully';
                    } else {
                        type = 'request';
                        status = `Request ${request.status?.toLowerCase() || 'pending'}`;
                    }

                    return {
                        id: `request-${request.id}-${gearId}`,
                        type,
                        item: gearDetails[gearId]?.name || 'Equipment',
                        gear_id: gearId,
                        user_id: request.user_id,
                        timestamp,
                        status
                    };
                });
            });

            // Process checkin activities
            const checkinActivities = (checkinsResponse.data || []).map((checkin: any) => {
                return {
                    id: `checkin-${checkin.id}`,
                    type: 'return' as const,
                    item: gearDetails[checkin.gear_id]?.name || 'Equipment',
                    gear_id: checkin.gear_id,
                    user_id: checkin.user_id,
                    timestamp: checkin.checkin_date,
                    status: `Returned in ${checkin.condition?.toLowerCase() || 'unknown'} condition`
                };
            });

            // Combine and sort by timestamp (most recent first)
            const allActivities = [...requestActivities, ...checkinActivities]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 10); // Just show the 10 most recent

            setActivities(allActivities);
        } catch (error) {
            logger.error("Error fetching activity:", {
                context: 'RecentActivity',
                error,
                stack: error instanceof Error ? error.stack : undefined
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivity();

        // Set up real-time subscriptions to relevant tables
        const requestsSubscription = createSupabaseSubscription({
            supabase,
            channel: 'activity-requests-changes',
            config: {
                event: '*',
                schema: 'public',
                table: 'gear_requests'
            },
            callback: () => {
                fetchActivity();
            }
        });

        const checkinsSubscription = createSupabaseSubscription({
            supabase,
            channel: 'activity-checkins-changes',
            config: {
                event: '*',
                schema: 'public',
                table: 'checkins'
            },
            callback: () => {
                fetchActivity();
            }
        });

        return () => {
            requestsSubscription.unsubscribe();
            checkinsSubscription.unsubscribe();
        };
    }, [supabase]);

    const getActivityIcon = (type: ActivityItem["type"]) => {
        switch (type) {
            case "checkout":
                return <Package className="h-4 w-4 text-blue-500" />;
            case "return":
                return <ArrowUpDown className="h-4 w-4 text-green-500" />;
            case "request":
                return <Activity className="h-4 w-4 text-orange-500" />;
            default:
                return <Activity className="h-4 w-4" />;
        }
    };

    const formatTimestamp = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            return {
                absolute: format(date, 'h:mm a'),
                relative: formatDistanceToNow(date, { addSuffix: true })
            };
        } catch (error) {
            return {
                absolute: 'Invalid date',
                relative: 'Unknown time'
            };
        }
    };

    // If embedded, render just the content
    if (embedded) {
        return (
            <div className="space-y-3">
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((_, index) => (
                            <div key={index} className="flex items-start gap-2 py-2">
                                <Skeleton className="h-6 w-6 rounded-full" />
                                <div className="space-y-1 flex-1">
                                    <Skeleton className="h-3 w-4/5" />
                                    <Skeleton className="h-2 w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activities.length > 0 ? (
                    activities.slice(0, 4).map((activity, index) => (
                        <div
                            key={activity.id}
                            className="flex items-start gap-2 py-1"
                        >
                            <div className="p-1 rounded-full bg-background">
                                {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-xs truncate">{activity.item}</h4>
                                    <span
                                        className="text-xs text-muted-foreground"
                                        title={formatTimestamp(activity.timestamp).absolute}
                                    >
                                        {formatTimestamp(activity.timestamp).relative}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {activity.status}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-2 text-center">
                        <p className="text-xs text-muted-foreground">No recent activity</p>
                    </div>
                )}
            </div>
        );
    }

    // If not embedded, render with card container
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((_, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                    <Skeleton className="h-4 w-16" />
                                </div>
                            ))}
                        </div>
                    ) : activities.length > 0 ? (
                        <div className="space-y-4">
                            {activities.map((activity, index) => (
                                <motion.div
                                    key={activity.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                                >
                                    <div className="p-2 rounded-full bg-background">
                                        {getActivityIcon(activity.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-medium text-sm truncate">{activity.item}</h4>
                                            <span
                                                className="text-xs text-muted-foreground"
                                                title={formatTimestamp(activity.timestamp).absolute}
                                            >
                                                {formatTimestamp(activity.timestamp).relative}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {activity.status}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon="📋"
                            title="No recent activity"
                            description="Your recent actions will appear here"
                            actionLink="/user/browse"
                            actionText="Browse Equipment"
                        />
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
} 