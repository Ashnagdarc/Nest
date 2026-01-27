/**
 * Upcoming Events Data Hook
 * 
 * Manages data fetching, processing, and real-time subscriptions for upcoming events.
 * Handles gear requests, maintenance events, and pending requests separately.
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import { createSupabaseSubscription } from '@/utils/supabase-subscription';
import { apiGet } from '@/lib/apiClient';

export interface Event {
    id: string;
    title: string;
    date: string;
    type: "return" | "pickup" | "maintenance";
    status: "upcoming" | "overdue" | "today";
    gear_id?: string;
    user_id?: string;
}

interface MaintenanceEvent {
    id: string;
    gear_id: string;
    performed_at: string;
    maintenance_type: string;
    performed_by: string;
    status: string;
}

export function useUpcomingEvents() {
    const supabase = createClient();
    const [events, setEvents] = useState<Event[]>([]);
    const [pendingEvents, setPendingEvents] = useState<unknown[]>([]);
    const [loading, setLoading] = useState(true);

    // Memoize fetchEvents to prevent effect from re-running on every render
    const fetchEvents = useCallback(async () => {
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
                .select('id, created_at, status, due_date, approved_at, gear_request_gears(gear_id)')
                .eq('user_id', session.user.id)
                .in('status', ['Approved', 'Pending', 'CheckedOut']);

            if (checkoutError) {
                throw checkoutError;
            }

            // Fetch gear maintenance events (excluding status change events which are not actual maintenance)
            // Status change events are created when gear status is updated and should not appear as maintenance tasks
            let maintenanceEvents: MaintenanceEvent[] = [];
            try {
                const { data, error } = await supabase
                    .from('gear_maintenance')
                    .select('id, gear_id, performed_at, maintenance_type, performed_by, status')
                    .eq('performed_by', session.user.id)
                    .not('maintenance_type', 'eq', 'Status Change'); // Exclude status change events

                if (error) {
                    logger.warn(`Could not fetch maintenance with performed_by: ${error.message}`, {
                        context: 'UpcomingEvents'
                    });
                } else {
                    maintenanceEvents = data || [];
                }
            } catch (maintenanceError) {
                logger.warn(`Error fetching maintenance events: ${maintenanceError instanceof Error ? maintenanceError.message : String(maintenanceError)}`, {
                    context: 'UpcomingEvents'
                });
            }

            // Get gear details
            const gearIds = [
                ...(checkoutRequests?.flatMap((req: any) => req.gear_request_gears?.map((grg: any) => grg.gear_id) || []).filter(Boolean) || []),
                ...(maintenanceEvents?.map((event: MaintenanceEvent) => event.gear_id) || [])
            ].filter(Boolean);

            let gearDetails: Record<string, { name: string }> = {};

            if (gearIds.length > 0) {
                const { data: gears, error: gearError } = await apiGet<{ data: unknown[]; error: string | null }>(`/api/gears?ids=${gearIds.join(',')}`);
                if (gearError) {
                    throw new Error(gearError);
                }
                gearDetails = (gears || []).reduce((acc: Record<string, { name: string }>, gear: unknown) => {
                    const g = gear as { id: string; name: string };
                    acc[g.id] = { name: g.name };
                    return acc;
                }, {} as Record<string, { name: string }>);
            }

            // Process events
            const now = new Date();
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Separate pending requests
            const pendingRequests = (checkoutRequests || []).filter((r: unknown) => (r as { status?: string }).status === 'Pending');

            // Process checkout events
            const checkoutEvents = (checkoutRequests || []).flatMap((request: unknown) => {
                const req = request as { id: string; user_id: string; created_at: string; status: string; due_date: string; approved_at?: string; gear_request_gears?: Array<{ gear_id: string }> };
                if (req.status === 'CheckedOut') {
                    const gearIdList = req.gear_request_gears?.map(grg => grg.gear_id) || [];
                    return gearIdList.filter(Boolean).map((gearId) => {
                        const gearIdStr = String(gearId);
                        const eventDate = new Date(req.due_date);
                        let status: Event["status"] = "upcoming";
                        if (eventDate < now) status = "overdue";
                        else if (eventDate >= today && eventDate < tomorrow) status = "today";
                        return {
                            id: `${req.id}-${gearIdStr}`,
                            title: `${gearDetails[gearIdStr]?.name || 'Equipment'} Return`,
                            date: req.due_date,
                            type: "return" as const,
                            status,
                            gear_id: gearIdStr,
                            user_id: session.user.id
                        } as Event;
                    });
                } else if (req.status === 'Approved') {
                    const pickupDate = req.approved_at || req.created_at;
                    const gearIdList = req.gear_request_gears?.map(grg => grg.gear_id) || [];
                    return gearIdList.filter(Boolean).map((gearId) => {
                        const gearIdStr = String(gearId);
                        const eventDate = new Date(pickupDate);
                        let status: Event["status"] = "upcoming";
                        if (eventDate >= today && eventDate < tomorrow) status = "today";
                        return {
                            id: `${req.id}-${gearIdStr}`,
                            title: `${gearDetails[gearIdStr]?.name || 'Equipment'} Pickup`,
                            date: pickupDate,
                            type: "pickup" as const,
                            status,
                            gear_id: gearIdStr,
                            user_id: session.user.id
                        } as Event;
                    });
                }
                return [];
            });

            // Process maintenance events - exclude status change events
            const maintenanceEventsFormatted = maintenanceEvents
                .filter((event: MaintenanceEvent) => event.maintenance_type !== 'Status Change') // Additional safeguard
                .map((event: MaintenanceEvent) => {
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
            setPendingEvents(pendingRequests);
        } catch (error) {
            if (error instanceof Error) {
                logger.error(`Error fetching events: ${error.message}`, {
                    context: 'UpcomingEvents',
                    stack: error.stack
                });
            } else {
                logger.error("Error fetching events: Unknown error", {
                    context: 'UpcomingEvents'
                });
            }
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchEvents();
        // Set up real-time subscriptions
        const subscriptions = [
            createSupabaseSubscription({
                supabase,
                channel: 'events-gear-requests',
                config: { event: '*', schema: 'public', table: 'gear_requests' },
                callback: fetchEvents,
                pollingInterval: 30000
            }),
            createSupabaseSubscription({
                supabase,
                channel: 'events-maintenance',
                config: { event: '*', schema: 'public', table: 'gear_maintenance' },
                callback: fetchEvents,
                pollingInterval: 30000
            }),
            createSupabaseSubscription({
                supabase,
                channel: 'events-gears',
                config: { event: '*', schema: 'public', table: 'gears' },
                callback: fetchEvents,
                pollingInterval: 30000
            })
        ];
        return () => {
            subscriptions.forEach(sub => sub.unsubscribe());
        };
    }, [fetchEvents]);

    return {
        events,
        pendingEvents,
        loading,
        refetch: fetchEvents
    };
} 