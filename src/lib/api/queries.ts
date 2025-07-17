/**
 * Database Query Utilities - Centralized data access layer with optimized Supabase queries,
 * consistent error handling, and type-safe operations for equipment management.
 * 
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 */

import { createClient } from '@/lib/supabase/client';
import { createClientServerClient } from '@/lib/supabase/client-server';
import type { Database } from '@/types/supabase';
import { apiGet } from '@/lib/apiClient';

type Tables = Database['public']['Tables'];
type Gear = Tables['gears']['Row'];
type Profile = Tables['profiles']['Row'];

// Client for browser/client-side queries
const getClient = () => createClient();

// Server client for server-side queries (client-safe version)
const getServerClient = () => createClientServerClient();

/**
 * Standardized response format for all database queries
 */
export interface QueryResult<T> {
    data: T | null
    error: string | null
    count?: number
    meta?: {
        executionTime?: number
        fromCache?: boolean
        affectedRows?: number
    }
}

/**
 * Standard pagination parameters for query operations
 */
export interface PaginationParams {
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

/**
 * Common filtering options for database queries
 */
export interface FilterParams {
    search?: string
    status?: string[]
    category?: string[]
    dateRange?: {
        start: string
        end: string
    }
    userId?: string
}

/**
 * Execute query with standardized error handling and response formatting
 */
async function executeQuery<T>(
    queryFn: () => Promise<any>,
    operation: string
): Promise<QueryResult<T>> {
    const startTime = Date.now()

    try {
        const response = await queryFn()
        const executionTime = Date.now() - startTime

        if (response.error) {
            console.error(`Database query failed [${operation}]:`, response.error)
            return {
                data: null,
                error: response.error.message || 'Database query failed',
                meta: { executionTime }
            }
        }

        return {
            data: response.data,
            error: null,
            count: response.count,
            meta: {
                executionTime,
                fromCache: false,
                affectedRows: response.data?.length
            }
        }
    } catch (error) {
        const executionTime = Date.now() - startTime
        console.error(`Database query exception [${operation}]:`, error)

        return {
            data: null,
            error: error instanceof Error ? error.message : 'Unknown database error',
            meta: { executionTime }
        }
    }
}

/**
 * Optimized gear queries with proper indexing and minimal data fetching
 */
export const gearQueries = {
    // Get available gears with minimal required fields
    getAvailableGears: async () => {
        return await apiGet<{ data: Gear[]; error: string | null }>(`/api/gears?status=Available`);
    },

    // Get gear with full details (for editing/viewing)
    getGearById: async (id: string) => {
        return await apiGet<{ data: Gear | null; error: string | null }>(`/api/gears/${id}`);
    },

    // Get gears with pagination for admin management
    getGearsWithPagination: async (
        page = 1,
        pageSize = 50,
        filters?: { status?: string; category?: string; search?: string }
    ): Promise<{ data: Gear[]; total: number; error: string | null }> => {
        const params = new URLSearchParams();
        if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
        if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
        if (filters?.search) params.append('search', filters.search);
        params.append('page', String(page));
        params.append('pageSize', String(pageSize));
        const response = await apiGet<{ data: Gear[]; total?: number; error: string | null }>(`/api/gears?${params.toString()}`);
        return {
            data: response.data || [],
            total: typeof response.total === 'number' ? response.total : 0,
            error: response.error || null
        };
    },

    // Get gear utilization stats (optimized for dashboard)
    getGearUtilizationStats: async () => {
        return await apiGet<{ data: { category: string; status: string }[]; error: string | null }>(`/api/gears?fields=category,status`);
    }
};

/**
 * Optimized profile queries
 */
export const profileQueries = {
    // Get user profile with minimal fields
    getUserProfile: async (userId: string, isServer = false) => {
        return await apiGet<{ data: Profile | null; error: string | null }>(`/api/users/${userId}`);
    },

    // Get all users for admin management (paginated)
    getUsersWithPagination: async (
        page = 1,
        pageSize = 50,
        search?: string,
        isServer = false
    ) => {
        const params = new URLSearchParams();
        params.append('page', String(page));
        params.append('pageSize', String(pageSize));
        if (search) params.append('search', search);
        return await apiGet<{ data: Profile[]; error: string | null }>(`/api/users?${params.toString()}`);
    },

    // Get admin users for notifications
    getAdminUsers: async (isServer = false) => {
        return await apiGet<{ data: Profile[]; error: string | null }>(`/api/users?role=admin`);
    }
};

/**
 * Optimized request queries
 */
export const requestQueries = {
    // Get requests with proper joins and minimal data
    getRequestsWithDetails: async (
        filters?: {
            status?: string;
            userId?: string;
            dateRange?: { from: Date; to: Date };
        }
    ) => {
        const params = new URLSearchParams();

        // Apply filters
        if (filters?.status && filters.status !== 'all') {
            params.append('status', filters.status);
        }
        if (filters?.userId) {
            params.append('userId', filters.userId);
        }
        if (filters?.dateRange) {
            params.append('from', filters.dateRange.from.toISOString());
            params.append('to', filters.dateRange.to.toISOString());
        }

        // Use centralized API client and RESTful endpoint
        return await apiGet<{ data: unknown[]; error: string | null }>(`/api/requests?${params.toString()}`);
    },

    // Get request statistics for dashboard
    getRequestStats: async (isServer = false) => {
        // Use centralized API client and RESTful endpoint
        return await apiGet<{ data: unknown[]; error: string | null }>(`/api/requests?fields=id,status,due_date,checkout_date,created_at`);
    },

    // Get user's own requests
    getUserRequests: async (userId: string, isServer = false) => {
        // Use centralized API client and RESTful endpoint
        return await apiGet<{ data: unknown[]; error: string | null }>(`/api/requests?userId=${userId}`);
    }
};

/**
 * Optimized notification queries
 */
export const notificationQueries = {
    // Get user notifications with pagination
    getUserNotifications: async (
        userId: string,
        page = 1,
        pageSize = 20,
        isServer = false
    ) => {
        const params = new URLSearchParams();
        params.append('userId', userId);
        params.append('page', String(page));
        params.append('pageSize', String(pageSize));
        return await apiGet<{ data: unknown[]; error: string | null }>(`/api/notifications?${params.toString()}`);
    },

    // Get unread notification count
    getUnreadCount: async (userId: string, isServer = false) => {
        const params = new URLSearchParams();
        params.append('userId', userId);
        params.append('unreadOnly', 'true');
        const { data, error } = await apiGet<{ data: unknown[]; error: string | null }>(`/api/notifications?${params.toString()}`);
        if (error) return 0;
        return data ? data.length : 0;
    }
};

/**
 * Batch operations for better performance
 */
export const batchQueries = {
    // Get dashboard data in a single optimized call
    getDashboardData: async (userId: string, isAdmin: boolean, isServer = false) => {
        if (isAdmin) {
            const [profile, notifications, unreadCount, gearStats, requestStats] = await Promise.all([
                profileQueries.getUserProfile(userId, isServer),
                notificationQueries.getUserNotifications(userId, 1, 5, isServer),
                notificationQueries.getUnreadCount(userId, isServer),
                gearQueries.getGearUtilizationStats(),
                requestQueries.getRequestStats(isServer)
            ]);

            return {
                profile,
                notifications,
                unreadCount,
                gearStats,
                requestStats
            };
        } else {
            const [profile, notifications, unreadCount, userRequests] = await Promise.all([
                profileQueries.getUserProfile(userId, isServer),
                notificationQueries.getUserNotifications(userId, 1, 5, isServer),
                notificationQueries.getUnreadCount(userId, isServer),
                requestQueries.getUserRequests(userId, isServer)
            ]);

            return {
                profile,
                notifications,
                unreadCount,
                userRequests
            };
        }
    }
};

// Announcement API functions
export async function fetchAnnouncements({
    limit = 10,
    page = 1,
    userId = null
}: {
    limit?: number;
    page?: number;
    userId?: string | null;
} = {}) {
    try {
        const params = new URLSearchParams();
        params.append('limit', String(limit));
        params.append('page', String(page));
        if (userId) params.append('userId', userId);

        const response = await apiGet<{
            announcements: unknown[];
            count: number;
            error: string | null;
        }>(`/api/announcements?${params.toString()}`);

        return response;
    } catch (error) {
        console.error('Error fetching announcements:', error);
        return {
            announcements: [],
            count: 0,
            error: error instanceof Error ? error.message : 'Unknown error fetching announcements'
        };
    }
}

export async function createAnnouncement({
    title,
    content,
    author_id
}: {
    title: string;
    content: string;
    author_id: string;
}) {
    try {
        const response = await fetch('/api/announcements', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, content, author_id }),
        });

        if (!response.ok) {
            throw new Error(`Error creating announcement: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to create announcement:', error);
        throw error;
    }
}

// Check-in API functions
export async function fetchCheckins({
    limit = 10,
    page = 1,
    userId = null,
    status = null
}: {
    limit?: number;
    page?: number;
    userId?: string | null;
    status?: string | null;
} = {}) {
    try {
        const params = new URLSearchParams();
        params.append('limit', limit.toString());
        params.append('page', page.toString());
        if (userId) params.append('userId', userId);
        if (status) params.append('status', status);

        const response = await fetch(`/api/checkins?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Error fetching check-ins: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to fetch check-ins:', error);
        throw error;
    }
}

export async function createCheckin({
    user_id,
    gear_id,
    condition,
    notes
}: {
    user_id: string;
    gear_id: string;
    condition?: string;
    notes?: string;
}) {
    try {
        const response = await fetch('/api/checkins', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id, gear_id, condition, notes }),
        });

        if (!response.ok) {
            throw new Error(`Error creating check-in: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to create check-in:', error);
        throw error;
    }
}

// Gear Utilization API function
export async function fetchGearUtilization(days = 30) {
    try {
        const params = new URLSearchParams();
        params.append('days', days.toString());

        const response = await fetch(`/api/gear/utilization?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Error fetching gear utilization: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to fetch gear utilization:', error);
        throw error;
    }
}

// Reports API functions
export async function fetchWeeklyReport(days = 7) {
    try {
        const params = new URLSearchParams();
        params.append('days', days.toString());

        const response = await fetch(`/api/reports/weekly?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Error fetching weekly report: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to fetch weekly report:', error);
        throw error;
    }
}

// Calendar Bookings API functions
export async function fetchCalendarBookings({
    startDate,
    endDate,
    userId = null,
    gearId = null
}: {
    startDate: string;
    endDate: string;
    userId?: string | null;
    gearId?: string | null;
}) {
    try {
        const params = new URLSearchParams();
        params.append('startDate', startDate);
        params.append('endDate', endDate);
        if (userId) params.append('userId', userId);
        if (gearId) params.append('gearId', gearId);

        const response = await fetch(`/api/calendar/bookings?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Error fetching calendar bookings: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to fetch calendar bookings:', error);
        throw error;
    }
}

export async function createCalendarBooking({
    user_id,
    gear_id,
    title,
    start_date,
    end_date,
    notes
}: {
    user_id: string;
    gear_id: string;
    title: string;
    start_date: string;
    end_date: string;
    notes?: string;
}) {
    try {
        const response = await fetch('/api/calendar/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id, gear_id, title, start_date, end_date, notes }),
        });

        if (!response.ok) {
            throw new Error(`Error creating calendar booking: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to create calendar booking:', error);
        throw error;
    }
}

// Activities API functions
export async function fetchActivities({
    limit = 10,
    page = 1,
    userId = null,
    type = null,
    days = 30
}: {
    limit?: number;
    page?: number;
    userId?: string | null;
    type?: string | null;
    days?: number;
} = {}) {
    try {
        const params = new URLSearchParams();
        params.append('limit', limit.toString());
        params.append('page', page.toString());
        params.append('days', days.toString());
        if (userId) params.append('userId', userId);
        if (type) params.append('type', type);

        const response = await fetch(`/api/activities?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Error fetching activities: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to fetch activities:', error);
        throw error;
    }
}

export default {
    gear: gearQueries,
    profile: profileQueries,
    request: requestQueries,
    notification: notificationQueries,
    batch: batchQueries
}; 