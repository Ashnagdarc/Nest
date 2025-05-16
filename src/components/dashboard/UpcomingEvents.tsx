import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./EmptyState";
import { logger } from "@/utils/logger";
import { createSupabaseSubscription } from "@/utils/supabase-subscription";

interface Event {
    id: string;
    title: string;
    date: string;
    type: "return" | "pickup" | "maintenance";
    status: "upcoming" | "overdue" | "today";
    gear_id?: string;
    user_id?: string;
}

export function UpcomingEvents() {
    const supabase = createClient();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEvents = async () => {
        try {
            setLoading(true);

            // Get current user
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                setLoading(false);
                return;
            }

            // Fetch checkout requests for the user
            const { data: checkoutRequests, error: checkoutError } = await supabase
                .from('gear_requests')
                .select('id, gear_ids, created_at, status, due_date')
                .eq('user_id', session.user.id)
                .in('status', ['Approved', 'Pending', 'CheckedOut']);

            if (checkoutError) {
                throw checkoutError;
            }

            // Fetch gear maintenance events - with adjusted column names to match the table
            let maintenanceEvents = [];
            try {
                // Try with column names we expect based on the table schema
                const { data, error } = await supabase
                    .from('gear_maintenance')
                    .select('id, gear_id, performed_at, maintenance_type, performed_by, status')
                    .eq('performed_by', session.user.id);

                if (error) {
                    logger.warn(`Could not fetch maintenance with performed_by: ${error.message}`, {
                        context: 'UpcomingEvents'
                    });
                } else {
                    maintenanceEvents = data || [];
                }
            } catch (maintenanceError) {
                // Log but don't throw - we'll continue with empty maintenance events
                logger.warn(`Error fetching maintenance events: ${maintenanceError instanceof Error ? maintenanceError.message : String(maintenanceError)}`, {
                    context: 'UpcomingEvents'
                });
            }

            // Fetch gear details to get names
            // Extract gear IDs from both sources - handle gear_ids as array in requests
            const gearIds = [
                // Handle gear_ids as an array in gear_requests
                ...(checkoutRequests?.flatMap((req: any) => Array.isArray(req.gear_ids) ? req.gear_ids : [req.gear_ids]).filter(Boolean) || []),
                // For maintenance, gear_id is a single value
                ...(maintenanceEvents?.map((event: any) => event.gear_id) || [])
            ].filter(Boolean);

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

            // Process events
            const now = new Date();
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Process checkout requests as events - handle multiple gear items per request
            const checkoutEvents = (checkoutRequests || []).flatMap((request: any) => {
                const date = request.status === 'CheckedOut'
                    ? request.due_date  // For checked out items, show due date
                    : request.created_at; // For pending/approved, show request date

                // Handle gear_ids as an array
                const gearIdList = Array.isArray(request.gear_ids) ? request.gear_ids : [request.gear_ids];

                // Create an event for each gear item in the request
                return gearIdList.filter(Boolean).map((gearId: string) => {
                    const eventDate = new Date(date);
                    let status: Event["status"] = "upcoming";
                    let type: Event["type"] = "return";
                    let title = "";

                    if (eventDate < now) {
                        status = "overdue";
                    } else if (eventDate >= today && eventDate < tomorrow) {
                        status = "today";
                    }

                    if (request.status === 'CheckedOut') {
                        type = "return";
                        title = `${gearDetails[gearId]?.name || 'Equipment'} Return`;
                    } else {
                        type = "pickup";
                        title = `${gearDetails[gearId]?.name || 'Equipment'} Pickup`;
                    }

                    return {
                        id: `${request.id}-${gearId}`,
                        title,
                        date,
                        type,
                        status,
                        gear_id: gearId,
                        user_id: session.user.id
                    };
                });
            });

            // Process maintenance events
            const maintenanceEventsFormatted = (maintenanceEvents || []).map((event: any) => {
                const eventDate = new Date(event.performed_at);
                let status: Event["status"] = "upcoming";

                if (eventDate < now) {
                    status = "overdue";
                } else if (eventDate >= today && eventDate < tomorrow) {
                    status = "today";
                }

                return {
                    id: event.id,
                    title: `${gearDetails[event.gear_id]?.name || 'Equipment'} ${event.maintenance_type || 'Maintenance'}`,
                    date: event.performed_at,
                    type: "maintenance" as const,
                    status,
                    gear_id: event.gear_id,
                    user_id: session.user.id
                };
            });

            // Combine and sort events by date
            const allEvents = [...checkoutEvents, ...maintenanceEventsFormatted]
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            setEvents(allEvents);
        } catch (error) {
            // Fix error handling - ensure we have a proper error object
            if (error instanceof Error) {
                logger.error(`Error fetching events: ${error.message}`, {
                    context: 'UpcomingEvents',
                    stack: error.stack
                });
            } else if (error === null || error === undefined) {
                logger.error("Error fetching events: Unknown error (null or undefined)", {
                    context: 'UpcomingEvents'
                });
            } else {
                // Convert any other type to string or object representation
                const errorMessage = typeof error === 'object'
                    ? JSON.stringify(error)
                    : String(error);
                logger.error(`Error fetching events: ${errorMessage}`, {
                    context: 'UpcomingEvents',
                    rawError: error
                });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();

        // Set up real-time subscription to gear_requests
        const requestsSubscription = createSupabaseSubscription({
            supabase,
            channel: 'requests-changes',
            config: {
                event: '*',
                schema: 'public',
                table: 'gear_requests'
            },
            callback: () => {
                fetchEvents();
            }
        });

        // Set up real-time subscription to gear_maintenance
        const maintenanceSubscription = createSupabaseSubscription({
            supabase,
            channel: 'maintenance-changes',
            config: {
                event: '*',
                schema: 'public',
                table: 'gear_maintenance'
            },
            callback: () => {
                fetchEvents();
            },
            onError: (error) => {
                logger.warn(`Subscription error from gear_maintenance: ${error instanceof Error ? error.message : String(error)}`, {
                    context: 'UpcomingEvents'
                });
            }
        });

        return () => {
            requestsSubscription.unsubscribe();
            maintenanceSubscription.unsubscribe();
        };
    }, [supabase]);

    const getStatusColor = (status: Event["status"]) => {
        switch (status) {
            case "upcoming":
                return "bg-blue-500/10 text-blue-500";
            case "today":
                return "bg-green-500/10 text-green-500";
            case "overdue":
                return "bg-red-500/10 text-red-500";
            default:
                return "bg-gray-500/10 text-gray-500";
        }
    };

    const getTypeIcon = (type: Event["type"]) => {
        switch (type) {
            case "return":
                return "↩️";
            case "pickup":
                return "📦";
            case "maintenance":
                return "🔧";
            default:
                return "📅";
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return {
            formatted: date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit"
            }),
            raw: date
        };
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Events
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((_, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                    <Skeleton className="h-6 w-16 rounded-full" />
                                </div>
                            ))}
                        </div>
                    ) : events.length > 0 ? (
                        <div className="space-y-4">
                            {events.map((event, index) => (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                                >
                                    <div className="text-2xl">{getTypeIcon(event.type)}</div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-sm truncate">{event.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">
                                                {formatDate(event.date).formatted}
                                            </span>
                                        </div>
                                    </div>
                                    <Badge className={getStatusColor(event.status)}>
                                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                    </Badge>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon="📅"
                            title="No upcoming events"
                            description="You don't have any upcoming events scheduled"
                        />
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
} 