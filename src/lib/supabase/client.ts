/**
 * Supabase Browser Client Configuration - Nest by Eden Oasis
 * 
 * This module provides a singleton Supabase client instance optimized for browser environments.
 * It handles client-side authentication, real-time subscriptions, and database operations
 * with proper error handling and configuration management.
 * 
 * Key Features:
 * - Singleton pattern to prevent multiple client instances
 * - Browser-optimized configuration with SSR compatibility
 * - Comprehensive error handling with custom error types
 * - Automatic session persistence and token refresh
 * - Schema cache management and refresh capabilities
 * 
 * Security Considerations:
 * - Uses public anon key (safe for client-side use)
 * - Row Level Security (RLS) enforced at database level
 * - Session tokens automatically managed and refreshed
 * 
 * @fileoverview Browser-side Supabase client configuration and management
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 * @since 2024-01-15
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { cleanCorruptedSupabaseSession } from './storage-recovery';
// Environment configuration with fallback for development
// Note: The URL fallback is for development only and should be replaced in production
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lkgxzrvcozfxydpmbtqq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Custom error class for Supabase configuration issues
 * 
 * This error type helps distinguish configuration problems from other application
 * errors, making debugging easier and enabling specific error handling logic.
 * 
 * @class SupabaseConfigError
 * @extends Error
 * 
 * @example
 * ```typescript
 * try {
 *   const client = createClient();
 * } catch (error) {
 *   if (error instanceof SupabaseConfigError) {
 *     console.error('Supabase configuration problem:', error.message);
 *   }
 * }
 * ```
 */
export class SupabaseConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SupabaseConfigError';
    }
}

// Singleton instance storage
// This ensures only one Supabase client exists throughout the application lifecycle
let supabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Creates or returns a singleton Supabase client instance
 * 
 * This function implements the singleton pattern to ensure consistent database
 * connections and prevent unnecessary client recreations. It's optimized for
 * browser environments with automatic session management and real-time capabilities.
 * 
 * Client Configuration:
 * - Persistent sessions across browser sessions
 * - Automatic token refresh to maintain authentication
 * - Public schema access with proper typing
 * - SSR-compatible headers for seamless server/client transitions
 * 
 * Error Handling:
 * - Validates environment variables before client creation
 * - Throws descriptive errors for configuration issues
 * - Gracefully handles client initialization failures
 * 
 * @function createClient
 * @returns {SupabaseClient<Database>} Configured Supabase client instance
 * @throws {SupabaseConfigError} When environment variables are missing or invalid
 * 
 * @example
 * ```typescript
 * // Basic usage in components
 * const supabase = createClient();
 * 
 * // Fetching data with full type safety
 * const { data: gears, error } = await supabase
 *   .from('gears')
 *   .select('*')
 *   .eq('status', 'Available');
 * 
 * // Real-time subscription
 * const subscription = supabase
 *   .channel('gear-changes')
 *   .on('postgres_changes', 
 *     { event: '*', schema: 'public', table: 'gears' },
 *     handleRealtimeUpdate
 *   )
 *   .subscribe();
 * ```
 */
export const createClient = () => {
    // Clean up any corrupted sessions before creating the client
    // This prevents TypeError from corrupted 'user' fields in localStorage
    if (typeof window !== 'undefined') {
        try {
            cleanCorruptedSupabaseSession();
        } catch (error) {
            console.warn('[Supabase Client] Error during session recovery:', error);
            // Continue anyway - recovery is non-critical
        }
    }

    // Critical environment validation
    // Both URL and anon key are required for client initialization
    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase configuration missing:', {
            hasUrl: !!supabaseUrl,
            hasAnonKey: !!supabaseAnonKey,
            url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'NOT_SET'
        });
        throw new SupabaseConfigError('Supabase URL and anon key must be provided');
    }

    // Return existing instance if already created (singleton pattern)
    // This prevents multiple clients and ensures consistent state management
    if (supabaseInstance) {

        return supabaseInstance;
    }



    try {
        /**
         * Create browser-optimized Supabase client with comprehensive configuration
         * 
         * This configuration optimizes the client for browser environments while
         * maintaining compatibility with server-side rendering (SSR).
         */
        supabaseInstance = createBrowserClient<Database>(
            supabaseUrl,
            supabaseAnonKey,
            {
                /**
                 * Authentication Configuration
                 * 
                 * - persistSession: Maintains user sessions across browser refreshes
                 * - autoRefreshToken: Automatically refreshes expired tokens
                 */
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                },
                /**
                 * Database Configuration
                 * 
                 * - schema: Specifies the PostgreSQL schema to use (public)
                 */
                db: {
                    schema: 'public'
                },
                /**
                 * Global Configuration
                 * 
                 * - headers: Identifies the client type for analytics and debugging
                 */
                global: {
                    headers: {
                        'x-client-info': '@supabase/ssr'
                    }
                }
            }
        );


        return supabaseInstance;
    } catch (error) {
        // Enhanced error logging for debugging client creation issues
        console.error("Error creating Supabase browser client:", error);
        throw new SupabaseConfigError(
            error instanceof Error ? error.message : "Failed to initialize Supabase client"
        );
    }
}

/**
 * Configuration validation helper
 * 
 * Provides a quick way to check if Supabase is properly configured before
 * attempting operations that require database access.
 * 
 * @constant {boolean} isSupabaseConfigured
 * 
 * @example
 * ```typescript
 * if (isSupabaseConfigured) {
 *   const supabase = createClient();
 *   // Proceed with database operations
 * } else {
 *   console.error('Supabase not configured properly');
 * }
 * ```
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Force refresh the Supabase client instance
 * 
 * This function clears the current singleton instance and creates a new one.
 * Useful for handling schema changes, configuration updates, or resolving
 * client state issues during development or maintenance operations.
 * 
 * Use Cases:
 * - Schema cache issues after database migrations
 * - Configuration changes requiring client restart
 * - Development environment troubleshooting
 * - Connection recovery after network issues
 * 
 * @function refreshSupabaseClient
 * @returns {SupabaseClient<Database>} New Supabase client instance
 * 
 * @example
 * ```typescript
 * // Handle schema cache issues
 * try {
 *   const data = await supabase.from('gears').select('*');
 * } catch (error) {
 *   if (error.message.includes('schema')) {
 *     const freshClient = refreshSupabaseClient();
 *     // Retry operation with fresh client
 *   }
 * }
 * 
 * // Force refresh during development
 * if (process.env.NODE_ENV === 'development') {
 *   const supabase = refreshSupabaseClient();
 * }
 * ```
 */
export const refreshSupabaseClient = () => {
    supabaseInstance = null;
    return createClient();
}
