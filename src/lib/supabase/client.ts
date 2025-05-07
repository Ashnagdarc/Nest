import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase'; // Import your generated types

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export class SupabaseConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SupabaseConfigError';
    }
}

// Validate environment variables
let supabaseInitializationError: string | null = null;

if (!supabaseUrl) {
    supabaseInitializationError = "Supabase URL is required. Check your .env.local file.";
} else if (!supabaseAnonKey) {
    supabaseInitializationError = "Supabase Anon Key is required. Check your .env.local file.";
}

export const createClient = () => {
    if (supabaseInitializationError) {
        throw new SupabaseConfigError(supabaseInitializationError);
    }

    try {
        const client = createBrowserClient<Database>(
            supabaseUrl!,
            supabaseAnonKey!
        );
        return client;
    } catch (error) {
        console.error("Error creating Supabase browser client:", error);
        throw new SupabaseConfigError(
            error instanceof Error ? error.message : "Failed to initialize Supabase client"
        );
    }
}

// Export initialization status for components that need it
export const isSupabaseConfigured = !supabaseInitializationError;
