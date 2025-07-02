/**
 * Recent Activity Data Hook
 * 
 * Manages data fetching, processing, and real-time subscriptions for recent user activity.
 * Handles gear requests, check-ins, and activity processing logic.
 */

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import { createSupabaseSubscription } from '@/utils/supabase-subscription';

export interface ActivityItem {
    id: string;
    type: "checkout" | "return" | "request";
    item: string;
    gear_id?: string;
    user_id?: string;
    timestamp: string;
    status: string;
}

export function useRecentActivity() {
    const supabase = createClient();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchActivity = async () => {
        try {
            setLoading(true);

            // Get current user
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                setLoading(false);
                return;
            }

            // Fetch latest activity from various tables
            const promises = [
                // Gear requests (checkout/returns)
                supabase
                    .from('gear_requests')
                    .select('id, gear_ids, user_id, created_at, status, due_date')
                    .eq('user_id', session.user.id)
                    .order('created_at', { ascending: false })
                    .limit(5),

                // Check-ins (returns)
                supabase
                    .from('checkins')
                    .select('id, gear_id, user_id, checkin_date, status, condition')
                    .eq('user_id', session.user.id)
                    .order('checkin_date', { ascending: false })
                    .limit(5)
            ];

            const [requestsResponse, checkinsResponse] = await Promise.all(promises);

            if (requestsResponse.error) {
                throw requestsResponse.error;
            }

            if (checkinsResponse.error) {
                throw checkinsResponse.error;
            }

            // Get unique gear IDs from both sources
            const gearIds = [
                ...(requestsResponse.data?.flatMap((req: any) =>
                    Array.isArray(req.gear_ids) ? req.gear_ids : [req.gear_ids]).filter(Boolean) || []),
                ...(checkinsResponse.data?.map((checkin: any) => checkin.gear_id) || [])
            ].filter(Boolean);

            // Fetch gear details if there are any IDs
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

            // Process request activities
            const requestActivities = (requestsResponse.data || []).flatMap((request: any) => {
                const gearIdList = Array.isArray(request.gear_ids) ? request.gear_ids : [request.gear_ids];

                return gearIdList.filter(Boolean).map((gearId: string) => {
                    let type: ActivityItem["type"];
                    let status: string;
                    let timestamp: string = request.created_at;

                    if (request.status === 'CheckedOut') {
                        type = 'checkout';
                        status = 'Checked out successfully';
                    } else {
                        type = 'request';
                        status = `Request ${request.status?.toLowerCase() || 'pending'}`;
                    }

                    return {
                        id: `request-${request.id}-${gearId}`,
                        type,
                        item: gearDetails[gearId]?.name || 'Equipment',
                        gear_id: gearId,
                        user_id: request.user_id,
                        timestamp,
                        status
                    };
                });
            });

            // Process checkin activities
            const checkinActivities = (checkinsResponse.data || []).map((checkin: any) => {
                return {
                    id: `checkin-${checkin.id}`,
                    type: 'return' as const,
                    item: gearDetails[checkin.gear_id]?.name || 'Equipment',
                    gear_id: checkin.gear_id,
                    user_id: checkin.user_id,
                    timestamp: checkin.checkin_date,
                    status: `Returned in ${checkin.condition?.toLowerCase() || 'unknown'} condition`
                };
            });

            // Combine and sort by timestamp (most recent first)
            const allActivities = [...requestActivities, ...checkinActivities]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 10);

            setActivities(allActivities);
        } catch (error) {
            logger.error("Error fetching activity:", {
                context: 'RecentActivity',
                error,
                stack: error instanceof Error ? error.stack : undefined
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivity();

        // Set up real-time subscriptions
        const subscriptions = [
            createSupabaseSubscription({
                supabase,
                channel: 'activity-requests-changes',
                config: { event: '*', schema: 'public', table: 'gear_requests' },
                callback: fetchActivity,
                pollingInterval: 30000
            }),
            createSupabaseSubscription({
                supabase,
                channel: 'activity-checkins-changes',
                config: { event: '*', schema: 'public', table: 'checkins' },
                callback: fetchActivity,
                pollingInterval: 30000
            })
        ];

        return () => {
            subscriptions.forEach(sub => sub.unsubscribe());
        };
    }, []);

    return {
        activities,
        loading,
        refetch: fetchActivity
    };
} 