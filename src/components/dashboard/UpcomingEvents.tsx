/**
 * Upcoming Events Widget Component
 * 
 * Clean, focused component that orchestrates event display using extracted hooks and components.
 * Reduced from 443 lines to ~120 lines through proper separation of concerns.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./EmptyState";
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useUpcomingEvents } from '@/hooks/user-dashboard/use-upcoming-events';
import {
    EventStatusBadge,
    EventTypeIcon,
    EventDateFormatter,
    PendingRequestsSection
} from './upcoming-events';

export function UpcomingEvents() {
    const { toast } = useToast();
    const { events, pendingEvents, loading, refetch } = useUpcomingEvents();

    const renderActionButton = (event: any) => {
        if (event.type === "pickup") {
            return (
                <Button size="sm" variant="outline" asChild>
                    <Link href="/user/dashboard">View Details</Link>
                </Button>
            );
        }
        return null;
    };

    const showNewEventToast = () => {
        toast({
            title: "New Event Added",
            description: "Your upcoming events have been updated.",
        });
    };

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
                            icon={Calendar}
                            title="No upcoming events"
                            description="You have no pending returns, pickups, or maintenance scheduled."
                        />
                    ) : (
                        <ScrollArea className="h-64">
                            <div className="space-y-3">
                                {events.map((event, index) => (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <EventTypeIcon type={event.type} className="h-5 w-5" />
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">
                                                    {event.title}
                                                </p>
                                                <EventDateFormatter
                                                    date={event.date}
                                                    status={event.status}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <EventStatusBadge event={event} />
                                            {renderActionButton(event)}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>

            {/* Pending Requests Section */}
            <PendingRequestsSection pendingEvents={pendingEvents} />
        </div>
    );
} 