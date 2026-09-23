import { useEffect, useState, useRef, useCallback } from 'react';
import {createClient} from '@/lib/supabase/client';
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Calendar, User, ArrowRight, Activity} from 'lucide-react';
import {useToast} from "@/hooks/use-toast";
import {Badge} from '@/components/ui/badge';
import {formatDistanceToNow} from 'date-fns';

type UserActivity = {
    id: string;
    user: string;
    action: string;
    time: string;
    icon?: any;
    type?: 'profile' | 'gear' | 'system';
    timestamp?: Date;
};

export function ActivitiesSection() {
    const supabase = createClient();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [, setError] = useState<string | null>(null);
    const [activities, setActivities] = useState<UserActivity[]>([]);
    const [, setPage] = useState(1);
    const [, setHasMore] = useState(false);
    const [isCollapsed] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [isAutoScrolling] = useState(true);
    const [isPaused] = useState(false);
    const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const ITEMS_PER_PAGE = 8;

    // Auto-scroll functionality
    const startAutoScroll = useCallback(() => {
        if (autoScrollIntervalRef.current) {
            clearInterval(autoScrollIntervalRef.current);
        }

        autoScrollIntervalRef.current = setInterval(() => {
            if (!isPaused && !isCollapsed && activities.length > 0) {
                const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
                if (scrollElement) {
                    const { scrollTop, scrollHeight, clientHeight } = scrollElement;
                    const maxScroll = scrollHeight - clientHeight;

                    // If we're at the bottom, scroll back to top smoothly
                    if (scrollTop >= maxScroll - 10) {
                        scrollElement.scrollTo({
                            top: 0,
                            behavior: 'smooth'
                        });
                    } else {
                        // Scroll down by one activity height (approximately 40px)
                        scrollElement.scrollTo({
                            top: scrollTop + 40,
                            behavior: 'smooth'
                        });
                    }
                }
            }
        }, 2000); // Scroll every 2 seconds
    }, [isPaused, isCollapsed, activities.length]);

    const stopAutoScroll = useCallback(() => {
        if (autoScrollIntervalRef.current) {
            clearInterval(autoScrollIntervalRef.current);
            autoScrollIntervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        fetchActivities(true);
    }, []);

    // Start auto-scroll when component mounts and activities are loaded
    useEffect(() => {
        if (activities.length > 0 && isAutoScrolling && !isCollapsed) {
            startAutoScroll();
        } else {
            stopAutoScroll();
        }

        return () => stopAutoScroll();
    }, [activities.length, isAutoScrolling, isCollapsed, startAutoScroll, stopAutoScroll]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (autoScrollIntervalRef.current) {
                clearInterval(autoScrollIntervalRef.current);
            }
        };
    }, []);

    async function fetchActivities(reset = false, pageNum = 1) {
        if (reset) {
            setIsLoading(true);
            setPage(1);
            setActivities([]);
        }

        setError(null);

        try {
            // Get recent profile updates as activity
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, email, updated_at, created_at')
                .order('updated_at', { ascending: false })
                .range((pageNum - 1) * ITEMS_PER_PAGE, pageNum * ITEMS_PER_PAGE - 1);

            if (profilesError) {
                console.warn(`Profile data error: ${profilesError.message}`);
                // Don't throw error, continue with other data sources
            }

            // Check if we have more data
            const { count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            setHasMore(count !== null && count > pageNum * ITEMS_PER_PAGE);

            let activityList: UserActivity[] = [];

            if (profiles && profiles.length > 0) {
                activityList = profiles.map((profile) => {
                    const updatedAt = profile.updated_at ? new Date(profile.updated_at) : new Date();
                    const createdAt = profile.created_at ? new Date(profile.created_at) : updatedAt;
                    // Check if this is a new profile (created_at and updated_at are close)
                    const isNewProfile = updatedAt.getTime() - createdAt.getTime() < 1000 * 60 * 5; // 5 minutes difference

                    return {
                        id: profile.id,
                        user: profile.full_name || profile.email || 'User',
                        action: isNewProfile ? 'account was created' : 'profile was updated',
                        time: profile.updated_at ? timeAgo(updatedAt) : '',
                        icon: isNewProfile ? User : Activity,
                        type: 'profile' as const,
                        timestamp: updatedAt
                    };
                });
            }

            // Also get recent gear activity to supplement
            const { data: gears, error: gearsError } = await supabase
                .from('gears')
                .select('id, name, created_at')
                .order('created_at', { ascending: false })
                .limit(Math.ceil(ITEMS_PER_PAGE / 2));

            if (!gearsError && gears && gears.length > 0 && pageNum === 1) {
                const gearActivities = gears.map((gear) => ({
                    id: gear.id,
                    user: 'Admin',
                    action: `added ${gear.name || 'equipment'}`,
                    time: gear.created_at ? timeAgo(new Date(gear.created_at)) : '',
                    icon: ArrowRight,
                    type: 'gear' as const,
                    timestamp: gear.created_at ? new Date(gear.created_at) : new Date()
                }));

                activityList = [...activityList, ...gearActivities];
            }

            // Sort by timestamp for proper chronological order
            activityList.sort((a, b) => {
                if (a.timestamp && b.timestamp) {
                    return b.timestamp.getTime() - a.timestamp.getTime();
                }
                return 0;
            });

            // Take only the required number of items
            activityList = activityList.slice(0, ITEMS_PER_PAGE);

            if (reset) {
                setActivities(activityList);
            } else {
                // For infinite scroll, add to the beginning (since we're loading older items)
                setActivities(prev => [...activityList, ...prev]);
            }
        } catch (error: any) {
            console.error("Error fetching activities:", error.message);
            setError(error.message);
            setActivities([]);

            toast({
                title: "Connection issue",
                description: "Unable to load activities. Please check your connection.",
                variant: "destructive",
            });
        } finally {
            if (reset) setIsLoading(false);
        }
    }

    function timeAgo(date: Date) {
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diff < 60) return `${diff} secs ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
        return `${Math.floor(diff / 86400)} days ago`;
    }

    if (isLoading) {
        return (
            <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                    <CardTitle className="text-white">Recent Activities</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center p-4">
                        <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activities
                </CardTitle>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
                {activities.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No recent activities</p>
                        <p className="text-sm mt-2">Activities will appear here once users interact with the system</p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => fetchActivities(true)}
                        >
                            Refresh
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activities.map((activity, index) => (
                            <div key={`${activity.type}-${index}`} className="p-3 rounded-lg bg-gray-700/50 border border-gray-600/50">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-full bg-blue-500/20">
                                        <Activity className="h-4 w-4 text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium text-white truncate">
                                                {activity.user}
                                            </h4>
                                            <Badge variant="outline" className="text-xs">
                                                {activity.type}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-300 mt-1">
                                            {activity.action}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                            <Calendar className="h-3 w-3" />
                                            <span>{activity.timestamp ? formatDistanceToNow(activity.timestamp, { addSuffix: true }) : 'recently'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 