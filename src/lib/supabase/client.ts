import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

// Get environment variables with fallback values for development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lkgxzrvcozfxydpmbtqq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export class SupabaseConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SupabaseConfigError';
    }
}

// Create a singleton instance with proper typing
let supabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Creates or returns a Supabase client instance.
 * Includes mechanisms to handle schema cache issues.
 */
export const createClient = () => {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new SupabaseConfigError('Supabase URL and anon key must be provided');
    }

    if (supabaseInstance) {
        return supabaseInstance;
    }

    try {
        supabaseInstance = createBrowserClient<Database>(
            supabaseUrl,
            supabaseAnonKey,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                },
                db: {
                    schema: 'public'
                },
                global: {
                    headers: {
                        'x-client-info': '@supabase/ssr'
                    }
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
    supabaseInstance = null;
    return createClient();
}
