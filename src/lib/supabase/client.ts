import { createBrowserClient } from '@supabase/ssr';
// Import your generated types - comment out if file doesn't exist yet
// import type { Database } from '@/types/supabase';

// Get environment variables with fallback values for development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ymtufeymduajgxsgebyr.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltdHVmZXltZHVhamd4c2dlYnlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5OTc3MTUsImV4cCI6MjA2MTU3MzcxNX0.2xc3M7x4mUuyZ8u3YTrOYmo627OKdC5BQIdEa2RFdGo';

export class SupabaseConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SupabaseConfigError';
    }
}

// Create a singleton instance
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Creates or returns a Supabase client instance.
 * Includes mechanisms to handle schema cache issues.
 */
export const createClient = () => {
    // Regenerate the client less frequently - only in dev or 1% of the time
    // to avoid constant reinitialization
    const forceRefresh = (process.env.NODE_ENV === 'development' && Math.random() < 0.05)
        || Math.random() < 0.01; // 1% chance in production, 5% in dev

    if (supabaseInstance && !forceRefresh) {
        return supabaseInstance;
    }

    // Only log reinit in development
    if (supabaseInstance && process.env.NODE_ENV === 'development') {
        console.log("Reinitializing Supabase client with fresh schema cache");
    }

    try {
        // Add custom headers to force schema refresh
        const customHeaders = {
            'x-schema-cache': 'reload'
        };

        if (supabaseInstance) {
            supabaseInstance = null;
        }

        // Use a simpler initialization for stability
        supabaseInstance = createBrowserClient(
            supabaseUrl,
            supabaseAnonKey,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                },
                global: {
                    headers: customHeaders
                }
            }
        );

        return supabaseInstance;
    } catch (error) {
        console.error("Error creating Supabase browser client:", error);
        throw new SupabaseConfigError(
            error instanceof Error ? error.message : "Failed to initialize Supabase client"
        );
    }
}

// Export initialization status for components that need it
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Helper function to clear schema cache - can be called when schema issues are detected
export const refreshSupabaseClient = () => {
    if (supabaseInstance) {
        supabaseInstance = null;
    }
    return createClient();
}
