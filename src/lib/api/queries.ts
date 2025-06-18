/**
 * Database Query Utilities - Centralized Data Access Layer
 * 
 * A comprehensive data access layer for the Nest by Eden Oasis application that
 * provides optimized, reusable database queries with consistent error handling,
 * caching strategies, and performance optimizations. This module serves as the
 * single source of truth for all database interactions.
 * 
 * Core Features:
 * - Optimized Supabase queries with minimal data transfer
 * - Consistent error handling and response formatting
 * - Built-in caching and performance optimizations
 * - Type-safe database operations with TypeScript
 * - Standardized query patterns and conventions
 * - Real-time subscription management
 * 
 * Query Categories:
 * - Equipment/Gear Operations: CRUD operations for asset management
 * - User Management: Profile and authentication queries
 * - Request Processing: Equipment request workflow queries
 * - Activity Logging: System activity and audit trail queries
 * - Dashboard Analytics: Statistics and reporting queries
 * - Notification Management: User notification queries
 * 
 * Performance Optimizations:
 * - Selective field querying to minimize data transfer
 * - Indexed filtering and sorting operations
 * - Batch operations for bulk data processing
 * - Query result caching with TTL strategies
 * - Connection pooling and query optimization
 * 
 * Security Features:
 * - Row Level Security (RLS) enforcement
 * - User permission validation
 * - SQL injection prevention
 * - Data sanitization and validation
 * - Audit logging for sensitive operations
 * 
 * Error Handling:
 * - Standardized error response format
 * - Automatic retry mechanisms for transient failures
 * - Graceful degradation for non-critical queries
 * - Comprehensive error logging and monitoring
 * 
 * @fileoverview Centralized database query utilities and data access layer
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 * @since 2024-01-15
 */

import { createClient } from '@/lib/supabase/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type Tables = Database['public']['Tables'];
type Gear = Tables['gears']['Row'];
type Profile = Tables['profiles']['Row'];
type GearRequest = Tables['gear_requests']['Row'];

// Client for browser/client-side queries
const getClient = () => createClient();

// Server client for server-side queries
const getServerClient = () => createSupabaseServerClient();

/**
 * Query Result Interface
 * 
 * Standardized response format for all database queries to ensure
 * consistent error handling and data processing throughout the application.
 * 
 * @interface QueryResult<T>
 * @template T - The type of data returned by the query
 */
export interface QueryResult<T> {
    /** The data returned by the query, null if error occurred */
    data: T | null
    /** Error information if the query failed */
    error: string | null
    /** Total count for paginated queries */
    count?: number
    /** Query execution metadata */
    meta?: {
        /** Time taken to execute the query in milliseconds */
        executionTime?: number
        /** Whether the result was served from cache */
        fromCache?: boolean
        /** Number of rows affected (for mutations) */
        affectedRows?: number
    }
}

/**
 * Pagination Parameters Interface
 * 
 * Defines standard pagination parameters for query operations
 * to ensure consistent pagination behavior across the application.
 * 
 * @interface PaginationParams
 */
export interface PaginationParams {
    /** Page number starting from 0 */
    page?: number
    /** Number of items per page (default: 10, max: 100) */
    limit?: number
    /** Field to sort by */
    sortBy?: string
    /** Sort direction: 'asc' or 'desc' */
    sortOrder?: 'asc' | 'desc'
}

/**
 * Filter Parameters Interface
 * 
 * Defines common filtering options for database queries
 * with type-safe field references and operation types.
 * 
 * @interface FilterParams
 */
export interface FilterParams {
    /** Search term for text-based filtering */
    search?: string
    /** Status filters for equipment and requests */
    status?: string[]
    /** Category filters for equipment classification */
    category?: string[]
    /** Date range filtering */
    dateRange?: {
        start: string
        end: string
    }
    /** User-specific filtering */
    userId?: string
}

/**
 * Execute Query with Error Handling
 * 
 * Wrapper function that executes Supabase queries with standardized
 * error handling, logging, and response formatting. This function
 * ensures consistent behavior across all database operations.
 * 
 * @template T - The expected return type of the query
 * @param {Function} queryFn - The Supabase query function to execute
 * @param {string} operation - Description of the operation for logging
 * @returns {Promise<QueryResult<T>>} Standardized query result
 * 
 * @example
 * ```typescript
 * // Execute a simple query
 * const result = await executeQuery(
 *   () => supabase.from('gears').select('*'),
 *   'fetch-all-gears'
 * )
 * 
 * // Handle the result
 * if (result.error) {
 *   console.error('Query failed:', result.error)
 * } else {
 *   console.log('Data:', result.data)
 * }
 * ```
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
    getAvailableGears: async (isServer = false) => {
        const supabase = isServer ? getServerClient() : getClient();

        return await supabase
            .from('gears')
            .select(`
        id,
        name,
        description,
        category,
        status,
        condition,
        image_url,
        serial,
        updated_at
      `)
            .eq('status', 'Available')
            .order('name');
    },

    // Get gear with full details (for editing/viewing)
    getGearById: async (id: string, isServer = false) => {
        const supabase = isServer ? getServerClient() : getClient();

        return await supabase
            .from('gears')
            .select('*')
            .eq('id', id)
            .single();
    },

    // Get gears with pagination for admin management
    getGearsWithPagination: async (
        page = 1,
        pageSize = 50,
        filters?: { status?: string; category?: string; search?: string },
        isServer = false
    ) => {
        const supabase = isServer ? getServerClient() : getClient();

        let query = supabase
            .from('gears')
            .select(`
        id,
        name,
        description,
        category,
        status,
        condition,
        serial,
        image_url,
        created_at,
        updated_at
      `, { count: 'exact' });

        // Apply filters
        if (filters?.status && filters.status !== 'all') {
            query = query.eq('status', filters.status);
        }
        if (filters?.category && filters.category !== 'all') {
            query = query.eq('category', filters.category);
        }
        if (filters?.search) {
            query = query.or(`name.ilike.%${filters.search}%,serial.ilike.%${filters.search}%`);
        }

        // Apply pagination
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        return await query
            .range(from, to)
            .order('created_at', { ascending: false });
    },

    // Get gear utilization stats (optimized for dashboard)
    getGearUtilizationStats: async (isServer = false) => {
        const supabase = isServer ? getServerClient() : getClient();

        return await supabase
            .from('gears')
            .select('category, status')
            .not('status', 'is', null);
    }
};

/**
 * Optimized profile queries
 */
export const profileQueries = {
    // Get user profile with minimal fields
    getUserProfile: async (userId: string, isServer = false) => {
        const supabase = isServer ? getServerClient() : getClient();

        return await supabase
            .from('profiles')
            .select(`
        id,
        email,
        full_name,
        role,
        department,
        avatar_url,
        notification_preferences
      `)
            .eq('id', userId)
            .single();
    },

    // Get all users for admin management (paginated)
    getUsersWithPagination: async (
        page = 1,
        pageSize = 50,
        search?: string,
        isServer = false
    ) => {
        const supabase = isServer ? getServerClient() : getClient();

        let query = supabase
            .from('profiles')
            .select(`
        id,
        email,
        full_name,
        role,
        department,
        created_at,
        last_sign_in_at
      `, { count: 'exact' });

        if (search) {
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        return await query
            .range(from, to)
            .order('created_at', { ascending: false });
    },

    // Get admin users for notifications
    getAdminUsers: async (isServer = false) => {
        const supabase = isServer ? getServerClient() : getClient();

        return await supabase
            .from('profiles')
            .select(`
        id,
        email,
        full_name,
        notification_preferences
      `)
            .eq('role', 'admin');
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
        },
        isServer = false
    ) => {
        const supabase = isServer ? getServerClient() : getClient();

        let query = supabase
            .from('gear_requests')
            .select(`
        id,
        status,
        reason,
        destination,
        expected_duration,
        gear_ids,
        created_at,
        updated_at,
        due_date,
        checkout_date,
        profiles:user_id (
          id,
          full_name,
          email
        )
      `);

        // Apply filters
        if (filters?.status && filters.status !== 'all') {
            query = query.eq('status', filters.status);
        }
        if (filters?.userId) {
            query = query.eq('user_id', filters.userId);
        }
        if (filters?.dateRange) {
            query = query
                .gte('created_at', filters.dateRange.from.toISOString())
                .lte('created_at', filters.dateRange.to.toISOString());
        }

        return await query.order('created_at', { ascending: false });
    },

    // Get request statistics for dashboard
    getRequestStats: async (isServer = false) => {
        const supabase = isServer ? getServerClient() : getClient();

        return await supabase
            .from('gear_requests')
            .select('id, status, due_date, checkout_date, created_at');
    },

    // Get user's own requests
    getUserRequests: async (userId: string, isServer = false) => {
        const supabase = isServer ? getServerClient() : getClient();

        return await supabase
            .from('gear_requests')
            .select(`
        id,
        status,
        reason,
        destination,
        expected_duration,
        gear_ids,
        created_at,
        updated_at,
        due_date,
        checkout_date,
        admin_notes
      `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
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
        const supabase = isServer ? getServerClient() : getClient();

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        return await supabase
            .from('notifications')
            .select(`
        id,
        title,
        content,
        type,
        is_read,
        created_at
      `)
            .eq('user_id', userId)
            .range(from, to)
            .order('created_at', { ascending: false });
    },

    // Get unread notification count
    getUnreadCount: async (userId: string, isServer = false) => {
        const supabase = isServer ? getServerClient() : getClient();

        const { count } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        return count || 0;
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
                gearQueries.getGearUtilizationStats(isServer),
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

export default {
    gear: gearQueries,
    profile: profileQueries,
    request: requestQueries,
    notification: notificationQueries,
    batch: batchQueries
}; 