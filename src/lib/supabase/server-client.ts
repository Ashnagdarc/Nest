import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Creates a Supabase client that can be used in client components
 * This is a simplified version that doesn't use cookies from next/headers
 * Use this only when you need server capabilities in a client component
 */
export const createSupabaseClientSafe = (isAdmin = false) => {
    const key = isAdmin ? supabaseServiceRoleKey : supabaseKey;

    if (!supabaseUrl || !key) {
        console.error(`Supabase ${isAdmin ? 'Service Role' : 'Anon'} Key or URL is missing. Check environment variables.`);
        throw new Error(`Supabase ${isAdmin ? 'Service Role' : 'Anon'} Key or URL is missing.`);
    }

    return createClient<Database>(supabaseUrl, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        }
    });
};

// Function specifically for creating a client with admin privileges (service role key)
export const createSupabaseAdminClientSafe = () => {
    return createSupabaseClientSafe(true);
}; 