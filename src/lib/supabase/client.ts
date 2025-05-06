import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase'; // Import your generated types

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
let supabaseInitializationError: string | null = null;
let supabaseInitialized = false;

if (!supabaseUrl) {
    supabaseInitializationError = "Supabase URL is required. Check your .env.local file.";
    console.error(`Supabase Initialization Error: ${supabaseInitializationError}`);
} else if (!supabaseAnonKey) {
    supabaseInitializationError = "Supabase Anon Key is required. Check your .env.local file.";
    console.error(`Supabase Initialization Error: ${supabaseInitializationError}`);
} else {
    supabaseInitialized = true;
    console.log("Supabase configuration variables found.");
}

export const createClient = () => {
    if (!supabaseInitialized || !supabaseUrl || !supabaseAnonKey) {
        console.warn(`Supabase client creation skipped: ${supabaseInitializationError || 'Missing configuration.'}`);
        // Optionally throw an error or return a mock client if needed in error states
        // For now, throwing an error to make misconfiguration explicit
        throw new Error(supabaseInitializationError || 'Supabase configuration is missing.');
    }

    // Create and return the Supabase client
    try {
        const client = createBrowserClient<Database>(
            supabaseUrl,
            supabaseAnonKey
        );
        console.log("Supabase browser client created successfully.");
        return client;
    } catch (error) {
         console.error("Error creating Supabase browser client:", error);
         // Re-throw or handle as appropriate
         throw new Error(`Failed to create Supabase client: ${error instanceof Error ? error.message : error}`);
    }
}

// Export status flags and error message for potential use elsewhere (e.g., landing page check)
export { supabaseInitialized, supabaseInitializationError };
