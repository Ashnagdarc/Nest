/**
 * Recent Activity Data Hook
 * 
 * Manages data fetching, processing, and real-time subscriptions for recent user activity.
 * Handles gear requests, check-ins, and activity processing logic.
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import { createSupabaseSubscription } from '@/utils/supabase-subscription';
import { apiGet } from '@/lib/apiClient';
import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

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
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Memoize fetchActivity to prevent effect from re-running on every render
    const fetchActivity = useCallback(async () => {
        try {
            setLoading(true);

            // Get current user
            const { data: { session } } = await createClient().auth.getSession();
            if (!session?.user) {
                setLoading(false);
                return;
            }

            // Fetch latest activity from various tables
            const promises = [
                // Gear requests (checkout/returns)
                createClient()
                    .from('gear_requests')
                    .select('id, gear_ids, user_id, created_at, status, due_date')
                    .eq('user_id', session.user.id)
                    .order('created_at', { ascending: false })
                    .limit(5),

                // Check-ins (returns)
                createClient()
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
                ...(requestsResponse.data?.flatMap((req: unknown) =>
                    Array.isArray((req as { gear_ids?: unknown }).gear_ids) ? (req as { gear_ids: unknown[] }).gear_ids : [(req as { gear_ids?: unknown }).gear_ids]).filter(Boolean) || []),
                ...(checkinsResponse.data?.map((checkin: unknown) => (checkin as { gear_id?: unknown }).gear_id) || [])
            ].filter(Boolean);

            // Fetch gear details if there are any IDs
            let gearDetails: Record<string, { name: string }> = {};

            if (gearIds.length > 0) {
                const { data: gears, error: gearError } = await apiGet<{ data: unknown[]; error: string | null }>(`/api/gears?ids=${gearIds.join(',')}`);
                if (gearError) {
                    throw gearError;
                }
                gearDetails = (gears || []).reduce((acc: Record<string, { name: string }>, gear: unknown) => {
                    const g = gear as { id: string; name: string };
                    acc[g.id] = { name: g.name };
                    return acc;
                }, {} as Record<string, { name: string }>);
            }

            // Process request activities
            const requestActivities = (requestsResponse.data || []).flatMap((request: unknown) => {
                const req = request as { id: string; gear_ids: unknown[]; user_id: string; created_at: string; status: string };
                const gearIdList = Array.isArray(req.gear_ids) ? req.gear_ids : [req.gear_ids];

                return gearIdList.filter(Boolean).map((gearId) => {
                    const gearIdStr = String(gearId);
                    let type: ActivityItem["type"];
                    let status: string;
                    const timestamp: string = req.created_at;

                    if (req.status === 'CheckedOut') {
                        type = 'checkout';
                        status = 'Checked out successfully';
                    } else {
                        type = 'request';
                        status = `Request ${req.status?.toLowerCase() || 'pending'}`;
                    }

                    return {
                        id: `request-${req.id}-${gearIdStr}`,
                        type,
                        item: gearDetails[gearIdStr]?.name || 'Equipment',
                        gear_id: gearIdStr,
                        user_id: req.user_id,
                        timestamp,
                        status
                    };
                });
            });

            // Process checkin activities
            const checkinActivities = (checkinsResponse.data || []).map((checkin: unknown) => {
                const c = checkin as { id: string; gear_id: string; user_id: string; checkin_date: string; condition?: string };
                return {
                    id: `checkin-${c.id}`,
                    type: 'return' as const,
                    item: gearDetails[c.gear_id]?.name || 'Equipment',
                    gear_id: c.gear_id,
                    user_id: c.user_id,
                    timestamp: c.checkin_date,
                    status: `Returned in ${c.condition?.toLowerCase() || 'unknown'} condition`
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
    }, []);

    useEffect(() => {
        fetchActivity();

        // Set up real-time subscriptions
        const subscriptions = [
            createSupabaseSubscription({
                supabase: createClient() as unknown as SupabaseClient<Database>,
                channel: 'activity-requests-changes',
                config: { event: '*', schema: 'public', table: 'gear_requests' },
                callback: fetchActivity,
                pollingInterval: 30000
            }),
            createSupabaseSubscription({
                supabase: createClient() as unknown as SupabaseClient<Database>,
                channel: 'activity-checkins-changes',
                config: { event: '*', schema: 'public', table: 'checkins' },
                callback: fetchActivity,
                pollingInterval: 30000
            })
        ];

        return () => {
            subscriptions.forEach(sub => sub.unsubscribe());
        };
    }, [fetchActivity]);

    return {
        activities,
        loading,
        refetch: fetchActivity
    };
} 