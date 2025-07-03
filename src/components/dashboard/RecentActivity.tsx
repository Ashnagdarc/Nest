/**
 * Recent Activity Widget Component
 * 
 * Clean, focused component that displays recent user activity.
 * Simplified to prevent React rendering errors.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./EmptyState";
import { useRecentActivity } from '@/hooks/user-dashboard/use-recent-activity';

interface RecentActivityProps {
    embedded?: boolean;
}

export function RecentActivity({ embedded = false }: RecentActivityProps) {
    const { activities, loading, refetch } = useRecentActivity();

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-3">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-3 w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity ({activities.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                {activities.length === 0 ? (
                    <EmptyState
                        icon={<Activity className="h-12 w-12 text-muted-foreground" />}
                        title="No recent activity"
                        description="Your activity will appear here as you use equipment."
                    />
                ) : (
                    <div className="space-y-3">
                        {activities.map((activity, index) => (
                            <div
                                key={activity.id}
                                className="flex items-center space-x-3 p-2 rounded border hover:bg-muted/50 transition-colors"
                            >
                                <Activity className="h-5 w-5 flex-shrink-0 text-blue-500" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {activity.item}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {activity.status}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(activity.timestamp).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 