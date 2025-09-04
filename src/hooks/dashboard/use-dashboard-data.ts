/**
 * Centralized Dashboard Data Hook
 * 
 * Optimizes dashboard performance by:
 * - Fetching all data in parallel
 * - Caching gear details to avoid redundant calls
 * - Providing a single source of truth for dashboard data
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import { createSupabaseSubscription } from '@/utils/supabase-subscription';
import { apiGet } from '@/lib/apiClient';

export interface DashboardData {
    // User stats
    userStats: {
        checkedOut: number;
        overdue: number;
        available: number;
    };

    // Popular gear
    popularGear: Array<{
        gear_id: string;
        name: string;
        full_name: string;
        request_count: number;
        category?: string;
        image_url?: string | null;
        status?: string;
    }>;

    // Upcoming events
    events: Array<{
        id: string;
        title: string;
        date: string;
        type: "return" | "pickup" | "maintenance";
        status: "upcoming" | "overdue" | "today";
        gear_id?: string;
        user_id?: string;
    }>;

    // Recent activity
    activities: Array<{
        id: string;
        type: "checkout" | "return" | "request";
        item: string;
        gear_id?: string;
        user_id?: string;
        timestamp: string;
        status: string;
    }>;

    // Gear details cache
    gearDetails: Record<string, { name: string; category?: string; image_url?: string; status?: string }>;

    // Loading states
    loading: {
        stats: boolean;
        popularGear: boolean;
        events: boolean;
        activities: boolean;
    };
}

export function useDashboardData() {
    const supabase = createClient();
    const [data, setData] = useState<DashboardData>({
        userStats: { checkedOut: 0, overdue: 0, available: 0 },
        popularGear: [],
        events: [],
        activities: [],
        gearDetails: {},
        loading: { stats: true, popularGear: true, events: true, activities: true }
    });

    // Memoized gear details fetcher to avoid redundant calls
    const fetchGearDetails = useCallback(async (gearIds: string[]) => {
        if (gearIds.length === 0) return {};

        try {
            const { data: gears, error } = await apiGet<{ data: any[]; error: string | null }>(
                `/api/gears?ids=${gearIds.join(',')}&fields=id,name,category,image_url,status`
            );

            if (error) throw new Error(error);

            return (gears || []).reduce((acc, gear) => {
                acc[gear.id] = {
                    name: gear.name,
                    category: gear.category,
                    image_url: gear.image_url,
                    status: gear.status
                };
                return acc;
            }, {} as Record<string, any>);
        } catch (error) {
            logger.error('Error fetching gear details:', error);
            return {};
        }
    }, []);

    // Fetch all dashboard data in parallel
    const fetchAllData = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            // Start all data fetching in parallel
            const [
                statsPromise,
                popularGearPromise,
                eventsPromise,
                activitiesPromise
            ] = await Promise.allSettled([
                // User stats
                (async () => {
                    // Fetch gears with different statuses
                    const [checkoutsRes, partiallyCheckedOutRes, availableRes, allGearsRes] = await Promise.all([
                        apiGet<{ data: any[]; error: string | null }>(`/api/gears?status=Checked%20Out`),
                        apiGet<{ data: any[]; error: string | null }>(`/api/gears?status=Partially%20Checked%20Out`),
                        apiGet<{ data: any[]; error: string | null }>(`/api/gears?status=Available&pageSize=1000`),
                        apiGet<{ data: any[]; error: string | null }>(`/api/gears?pageSize=1000`)
                    ]);

                    const checkouts = checkoutsRes.data || [];
                    const partiallyCheckedOut = partiallyCheckedOutRes.data || [];
                    const available = availableRes.data || [];
                    const allGears = allGearsRes.data || [];
                    const now = new Date();

                    // Combine both statuses and filter by user
                    const allCheckedOutGears = [...checkouts, ...partiallyCheckedOut];
                    const checkedOutGears = allCheckedOutGears.filter((gear: any) => gear.checked_out_to === session.user.id);
                    const overdueGears = checkedOutGears.filter((gear: any) => gear.due_date && new Date(gear.due_date) < now);

                    return {
                        checkedOut: checkedOutGears.reduce((sum: number, g: any) => {
                            // Calculate how many of this gear are checked out
                            const totalQuantity = g.quantity ?? 1;
                            const availableQuantity = g.available_quantity ?? 0;
                            const checkedOutQuantity = totalQuantity - availableQuantity;
                            return sum + Math.max(0, checkedOutQuantity);
                        }, 0),
                        overdue: overdueGears.length,
                        available: allGears.reduce((sum: number, g: any) => sum + Math.max(0, g.available_quantity ?? 0), 0)
                    };
                })(),

                // Popular gear
                (async () => {
                    const endDate = new Date();
                    const startDate = new Date();
                    startDate.setDate(endDate.getDate() - 7);

                    const { data: directData, error } = await supabase.rpc('get_popular_gears', {
                        start_date: startDate.toISOString(),
                        end_date: endDate.toISOString(),
                        limit_count: 10
                    });

                    if (error) throw error;
                    return directData || [];
                })(),

                // Upcoming events
                (async () => {
                    const { data: checkoutRequests } = await supabase
                        .from('gear_requests')
                        .select('id, gear_ids, created_at, status, due_date, approved_at')
                        .eq('user_id', session.user.id)
                        .in('status', ['Approved', 'Pending', 'CheckedOut']);

                    const { data: maintenanceEvents } = await supabase
                        .from('gear_maintenance')
                        .select('id, gear_id, performed_at, maintenance_type, performed_by, status')
                        .eq('performed_by', session.user.id);

                    // Process events (simplified for brevity)
                    const now = new Date();
                    const today = new Date(now);
                    today.setHours(0, 0, 0, 0);
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);

                    const events = [];
                    // Process checkout events
                    (checkoutRequests || []).forEach((req: any) => {
                        if (req.status === 'CheckedOut') {
                            const gearIdList = Array.isArray(req.gear_ids) ? req.gear_ids : [req.gear_ids];
                            gearIdList.filter(Boolean).forEach((gearId: string) => {
                                const eventDate = new Date(req.due_date);
                                let status: "upcoming" | "overdue" | "today" = "upcoming";
                                if (eventDate < now) status = "overdue";
                                else if (eventDate >= today && eventDate < tomorrow) status = "today";

                                events.push({
                                    id: `${req.id}-${gearId}`,
                                    title: `Equipment Return`,
                                    date: req.due_date,
                                    type: "return" as const,
                                    status,
                                    gear_id: gearId,
                                    user_id: session.user.id
                                });
                            });
                        }
                    });

                    return events;
                })(),

                // Recent activity
                (async () => {
                    const [requestsResponse, checkinsResponse] = await Promise.all([
                        supabase
                            .from('gear_requests')
                            .select('id, gear_ids, user_id, created_at, status')
                            .eq('user_id', session.user.id)
                            .order('created_at', { ascending: false })
                            .limit(5),
                        supabase
                            .from('checkins')
                            .select('id, gear_id, user_id, checkin_date, condition')
                            .eq('user_id', session.user.id)
                            .order('checkin_date', { ascending: false })
                            .limit(5)
                    ]);

                    const activities = [];

                    // Process requests
                    (requestsResponse.data || []).forEach((req: any) => {
                        const gearIdList = Array.isArray(req.gear_ids) ? req.gear_ids : [req.gear_ids];
                        gearIdList.filter(Boolean).forEach((gearId: string) => {
                            activities.push({
                                id: `request-${req.id}-${gearId}`,
                                type: req.status === 'CheckedOut' ? 'checkout' : 'request',
                                item: 'Equipment',
                                gear_id: gearId,
                                user_id: req.user_id,
                                timestamp: req.created_at,
                                status: req.status === 'CheckedOut' ? 'Checked out successfully' : `Request ${req.status?.toLowerCase() || 'pending'}`
                            });
                        });
                    });

                    // Process checkins
                    (checkinsResponse.data || []).forEach((checkin: any) => {
                        activities.push({
                            id: `checkin-${checkin.id}`,
                            type: 'return',
                            item: 'Equipment',
                            gear_id: checkin.gear_id,
                            user_id: checkin.user_id,
                            timestamp: checkin.checkin_date,
                            status: `Returned in ${checkin.condition?.toLowerCase() || 'unknown'} condition`
                        });
                    });

                    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
                })()
            ]);

            // Collect all gear IDs from all sources
            const allGearIds = new Set<string>();

            if (statsPromise.status === 'fulfilled') {
                // Add gear IDs from popular gear
                (popularGearPromise.status === 'fulfilled' ? popularGearPromise.value : []).forEach((gear: any) => {
                    allGearIds.add(gear.gear_id);
                });
            }

            if (eventsPromise.status === 'fulfilled') {
                // Add gear IDs from events
                eventsPromise.value.forEach((event: any) => {
                    if (event.gear_id) allGearIds.add(event.gear_id);
                });
            }

            if (activitiesPromise.status === 'fulfilled') {
                // Add gear IDs from activities
                activitiesPromise.value.forEach((activity: any) => {
                    if (activity.gear_id) allGearIds.add(activity.gear_id);
                });
            }

            // Fetch all gear details in one call
            const gearDetails = await fetchGearDetails(Array.from(allGearIds));

            // Update data with all fetched information
            setData(prev => ({
                ...prev,
                userStats: statsPromise.status === 'fulfilled' ? statsPromise.value : prev.userStats,
                popularGear: popularGearPromise.status === 'fulfilled' ? popularGearPromise.value : prev.popularGear,
                events: eventsPromise.status === 'fulfilled' ? eventsPromise.value : prev.events,
                activities: activitiesPromise.status === 'fulfilled' ? activitiesPromise.value : prev.activities,
                gearDetails,
                loading: { stats: false, popularGear: false, events: false, activities: false }
            }));

        } catch (error) {
            logger.error('Error fetching dashboard data:', error);
            setData(prev => ({
                ...prev,
                loading: { stats: false, popularGear: false, events: false, activities: false }
            }));
        }
    }, [supabase, fetchGearDetails]);

    useEffect(() => {
        fetchAllData();

        // Single subscription for all dashboard changes
        const subscription = createSupabaseSubscription({
            supabase,
            channel: 'dashboard-all-changes',
            config: { event: '*', schema: 'public', table: 'gears' },
            callback: fetchAllData,
            pollingInterval: 30000
        });

        return () => subscription.unsubscribe();
    }, [fetchAllData]);

    return data;
} 