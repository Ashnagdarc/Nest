import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { Loader2, PackagePlus, Users, Activity } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import ErrorDisplay from '@/components/ui/error-display';
import { Button } from '@/components/ui/button';

type UserActivity = {
    id: string;
    user: string;
    action: string;
    time: string;
    icon?: any;
};

type ProfileData = {
    id: string;
    full_name?: string;
    email?: string;
    updated_at: string;
    created_at: string;
};

type GearActivityData = {
    id: string;
    name?: string;
    created_at: string;
    owner_id?: string;
    profiles?: {
        full_name?: string;
        email?: string;
    };
};

export function ActivitiesSection() {
    const supabase = createClient();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activities, setActivities] = useState<UserActivity[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const ITEMS_PER_PAGE = 5;

    useEffect(() => {
        fetchActivities();
    }, [page]);

    async function fetchActivities(reset = false) {
        if (reset) {
            setPage(1);
        }

        setIsLoading(true);
        setError(null);

        try {
            // Get recent profile updates as activity
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, email, updated_at, created_at')
                .order('updated_at', { ascending: false })
                .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

            if (profilesError) {
                throw new Error(`Profile data error: ${profilesError.message}`);
            }

            // Check if we have more data
            const { count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            setHasMore(count !== null && count > page * ITEMS_PER_PAGE);

            let activityList: UserActivity[] = [];

            if (profiles) {
                activityList = profiles.map((profile: ProfileData) => {
                    // Check if this is a new profile (created_at and updated_at are close)
                    const isNewProfile = new Date(profile.updated_at).getTime() - new Date(profile.created_at).getTime() < 1000 * 60 * 5; // 5 minutes difference

                    return {
                        id: profile.id,
                        user: profile.full_name || profile.email || 'User',
                        action: isNewProfile ? 'account was created' : 'profile was updated',
                        time: profile.updated_at ? timeAgo(new Date(profile.updated_at)) : '',
                        icon: isNewProfile ? Users : Activity
                    };
                });
            }

            // Also get recent gear activity to supplement
            const { data: gears, error: gearsError } = await supabase
                .from('gears')
                .select('id, name, created_at, created_by')
                .order('created_at', { ascending: false })
                .limit(5);

            if (!gearsError && gears) {
                const gearActivities = gears.map((gear: GearActivityData) => ({
                    id: gear.id,
                    user: 'Admin',
                    action: `added ${gear.name}`,
                    time: gear.created_at ? timeAgo(new Date(gear.created_at)) : '',
                    icon: PackagePlus
                }));

                // Combine and sort by time
                activityList = [...activityList, ...gearActivities]
                    .sort((a, b) => {
                        // Extract numbers and units for comparison
                        const [numA, unitA] = a.time.split(' ');
                        const [numB, unitB] = b.time.split(' ');

                        if (unitA === unitB) {
                            return parseInt(numB) - parseInt(numA);
                        } else {
                            // Priority: secs < mins < hours < days
                            const units = ['secs', 'mins', 'hours', 'days'];
                            return units.indexOf(unitA) - units.indexOf(unitB);
                        }
                    })
                    .slice(0, ITEMS_PER_PAGE);
            }

            setActivities(reset ? activityList : [...activities, ...activityList]);
        } catch (error: any) {
            console.error("Error fetching activities:", error.message);
            setError(error.message);
            toast({
                title: "Error fetching activity data",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
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

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl">Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
                {error ? (
                    <ErrorDisplay error={error} onRetry={() => fetchActivities(true)} />
                ) : (
                    <ScrollArea className="h-[300px]">
                        {activities.length === 0 && !isLoading ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No recent activities found
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {activities.map((activity, index) => (
                                    <motion.div
                                        key={`${activity.id}-${index}`}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="flex items-start space-x-4"
                                    >
                                        <div className="bg-primary/10 p-2 rounded-full">
                                            {activity.icon && (
                                                <activity.icon className="h-4 w-4 text-primary" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium">{activity.user}</p>
                                            <p className="text-sm text-muted-foreground">{activity.action}</p>
                                            <p className="text-xs text-muted-foreground">{activity.time}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                        {isLoading && (
                            <div className="flex justify-center items-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
                                <span>Loading activities...</span>
                            </div>
                        )}
                        {hasMore && !isLoading && (
                            <div className="text-center pt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(page + 1)}
                                >
                                    Load More
                                </Button>
                            </div>
                        )}
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
} 