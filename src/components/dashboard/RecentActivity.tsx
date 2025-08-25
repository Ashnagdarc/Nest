/**
 * Recent Activity Widget Component
 * 
 * Clean, focused component that displays recent user activity.
 * Simplified to prevent React rendering errors.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ChevronDown, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./EmptyState";
import { useRecentActivity } from '@/hooks/user-dashboard/use-recent-activity';
import { useState } from "react";

interface RecentActivityProps {
    embedded?: boolean;
}

export function RecentActivity({ embedded = false }: RecentActivityProps) {
    const { activities, loading, refetch } = useRecentActivity();
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

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
                    <div className="space-y-4">
                        {Object.entries(
                            activities.reduce((acc: Record<string, typeof activities>, a) => {
                                const day = new Date(a.timestamp).toDateString();
                                (acc[day] ||= []).push(a);
                                return acc;
                            }, {})
                        ).map(([day, dayItems]) => {
                            const isExpanded = expandedDays.has(day);
                            const groupedItems = Object.values(
                                dayItems.reduce((acc: Record<string, { first: typeof dayItems[number]; count: number }>, a) => {
                                    const key = `${a.type}-${a.gear_id || a.item}`;
                                    if (!acc[key]) acc[key] = { first: a, count: 0 };
                                    acc[key].count += 1;
                                    return acc;
                                }, {})
                            );
                            
                            return (
                                <div key={day}>
                                    <button
                                        onClick={() => setExpandedDays(prev => {
                                            const newSet = new Set(prev);
                                            if (isExpanded) {
                                                newSet.delete(day);
                                            } else {
                                                newSet.add(day);
                                            }
                                            return newSet;
                                        })}
                                        className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-2 hover:text-foreground transition-colors w-full text-left"
                                    >
                                        {isExpanded ? (
                                            <ChevronDown className="h-3 w-3" />
                                        ) : (
                                            <ChevronRight className="h-3 w-3" />
                                        )}
                                        {day} ({groupedItems.length})
                                    </button>
                                    {isExpanded && (
                                        <div className="space-y-2">
                                            {groupedItems.map(({ first, count }) => (
                                                <div
                                                    key={first.id}
                                                    className="flex items-center space-x-3 p-2 rounded border hover:bg-muted/50 transition-colors"
                                                >
                                                    <Activity className="h-5 w-5 flex-shrink-0 text-blue-500" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">
                                                            {first.item}{count > 1 ? ` ×${count}` : ''}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {first.status}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(first.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}