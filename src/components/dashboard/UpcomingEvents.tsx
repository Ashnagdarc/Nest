/**
 * Upcoming Events Widget Component
 * 
 * Clean, focused component that orchestrates event display using extracted hooks and components.
 * Reduced from 443 lines to ~120 lines through proper separation of concerns.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./EmptyState";
import { useUpcomingEvents } from '@/hooks/user-dashboard/use-upcoming-events';

export function UpcomingEvents() {
    const { events, pendingEvents, loading } = useUpcomingEvents();

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Upcoming Events
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-3 w-3/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const hasEvents = events.length > 0 || pendingEvents.length > 0;

    return (
        <div>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Upcoming Events ({events.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!hasEvents ? (
                        <EmptyState
                            icon={<Calendar className="h-12 w-12 text-muted-foreground" />}
                            title="No upcoming events"
                            description="You have no pending returns, pickups, or maintenance scheduled."
                        />
                    ) : (
                        <div className="space-y-3">
                            {events.map((event) => (
                                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <Calendar className="h-5 w-5" />
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">
                                                {event.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {event.date}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {event.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {pendingEvents.length > 0 && (
                <Card className="mt-4">
                    <CardHeader>
                        <CardTitle>Pending Requests ({pendingEvents.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            You have {pendingEvents.length} requests awaiting approval
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
} 