import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./EmptyState";

interface OptimizedUpcomingEventsProps {
    events: Array<{
        id: string;
        title: string;
        date: string;
        type: "return" | "pickup" | "maintenance";
        status: "upcoming" | "overdue" | "today";
        gear_id?: string;
        user_id?: string;
    }>;
    gearDetails: Record<string, { name: string; category?: string; image_url?: string; status?: string }>;
    loading: boolean;
}

export function OptimizedUpcomingEvents({ events, gearDetails, loading }: OptimizedUpcomingEventsProps) {
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
                    {events.length === 0 ? (
                        <EmptyState
                            icon={<Calendar className="h-12 w-12 text-muted-foreground" />}
                            title="No upcoming events"
                            description="You have no pending returns, pickups, or maintenance scheduled."
                        />
                    ) : (
                        <div className="space-y-3">
                            {events.map((event) => {
                                const gearName = event.gear_id ? gearDetails[event.gear_id]?.name || 'Equipment' : 'Equipment';
                                const eventTitle = event.title === 'Equipment Return' || event.title === 'Equipment Pickup'
                                    ? `${gearName} ${event.type === 'return' ? 'Return' : 'Pickup'}`
                                    : event.title;

                                return (
                                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <Calendar className="h-5 w-5" />
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">
                                                    {eventTitle}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(event.date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {event.status}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
