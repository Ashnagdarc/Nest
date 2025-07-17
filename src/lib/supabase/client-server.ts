'use client';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Client-side version of createSupabaseServerClient
 * This is for use in client components that need to access server-like functions
 * but can't import from server.ts due to Next.js restrictions
 */
export const createClientServerClient = () => {
    if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase URL or Anon Key is missing. Check environment variables.');
        throw new Error('Supabase configuration missing');
    }

    return createClient<Database>(supabaseUrl, supabaseKey);
}; 