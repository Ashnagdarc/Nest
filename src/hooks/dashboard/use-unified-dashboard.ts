/**
 * Unified Dashboard Hook
 * 
 * Replaces all complex dashboard data fetching with a single, efficient API call.
 * Uses the correct table relationships and eliminates redundant queries.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/apiClient';

export interface UnifiedDashboardData {
    stats: {
        // Equipment stats
        total_equipment: number;
        available_equipment: number;
        checked_out_equipment: number;
        under_repair_equipment: number;
        retired_equipment: number;

        // Request stats
        total_requests: number;
        pending_requests: number;
        approved_requests: number;
        rejected_requests: number;
        completed_requests: number;

        // User stats (admin only)
        total_users: number;
        active_users: number;
        admin_users: number;

        // Checkin stats
        total_checkins: number;
        pending_checkins: number;
        completed_checkins: number;

        // Notification stats
        unread_notifications: number;
        total_notifications: number;
    };

    gears: Array<{
        id: string;
        name: string;
        category: string;
        description: string | null;
        quantity: number;
        image_url: string | null;
        created_at: string;
        current_state: {
            status: string;
            available_quantity: number;
            checked_out_to: string | null;
            current_request_id: string | null;
            due_date: string | null;
            notes: string | null;
        };
    }>;

    requests: Array<{
        id: string;
        user_id: string;
        reason: string;
        destination: string | null;
        expected_duration: string | null;
        team_members: string | null;
        status: string;
        created_at: string;
        updated_at: string;
        due_date: string | null;
        approved_at: string | null;
        admin_notes: string | null;
        updated_by: string | null;
        profiles: {
            id: string;
            full_name: string | null;
            email: string | null;
            department: string | null;
        } | null;
    }>;

    checkins: Array<{
        id: string;
        user_id: string;
        gear_id: string;
        request_id: string | null;
        action: string;
        checkin_date: string;
        status: string;
        notes: string | null;
        condition: string | null;
        damage_notes: string | null;
        quantity: number;
        approved_by: string | null;
        approved_at: string | null;
        created_at: string;
        updated_at: string;
    }>;

    notifications: Array<{
        id: string;
        user_id: string;
        type: string;
        title: string;
        message: string;
        is_read: boolean;
        link: string | null;
        metadata: any;
        category: string | null;
        priority: string | null;
        expires_at: string | null;
        created_at: string;
        updated_at: string;
    }>;

    users: Array<{
        id: string;
        full_name: string | null;
        email: string | null;
        department: string | null;
        role: string | null;
        status: string | null;
        created_at: string;
    }>;

    recent_activity: Array<{
        id: string;
        type: string;
        action: string;
        item: string;
        user: string;
        timestamp: string;
        status: string;
        metadata: any;
    }>;

    popular_gear: Array<{
        id: string;
        name: string;
        category: string;
        description: string | null;
        quantity: number;
        image_url: string | null;
        created_at: string;
        request_count: number;
    }>;

    overdue_items: Array<{
        gear_id: string;
        gear_name: string;
        checked_out_to: string | null;
        due_date: string;
        status: string;
    }>;
}

export function useUnifiedDashboard() {
    const [data, setData] = useState<UnifiedDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Use the unified API (uses correct calculation logic)
            let response;
            try {
                response = await apiGet<{ data: UnifiedDashboardData; error: string | null }>('/api/dashboard/unified');
            } catch (unifiedError) {
                console.warn('Unified API failed, trying simple API:', unifiedError);
                try {
                    response = await apiGet<{ data: UnifiedDashboardData; error: string | null }>('/api/dashboard/simple');
                } catch (simpleError) {
                    console.warn('Simple API also failed:', simpleError);
                    throw simpleError;
                }
            }

            if (response.error) {
                throw new Error(response.error);
            }

            setData(response.data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
            setError(errorMessage);
            console.error('Dashboard data fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    return {
        data,
        loading,
        error,
        refetch: fetchDashboardData
    };
}
