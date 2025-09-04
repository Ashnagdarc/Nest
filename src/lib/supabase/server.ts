'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'; // Import your generated types

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Use anon key for server components by default
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role key for admin actions

// Function to create a server client for server components/actions
export async function createSupabaseServerClient(isAdmin = false) {
  const key = isAdmin ? supabaseServiceRoleKey : supabaseKey;

  if (!supabaseUrl || !key) {
    console.error(`Supabase ${isAdmin ? 'Service Role' : 'Anon'} Key or URL is missing. Check environment variables.`);
    console.error('Supabase URL:', supabaseUrl ? 'Present' : 'Missing');
    console.error('Supabase Key:', key ? 'Present' : 'Missing');
    // Handle the error appropriately, maybe throw or return a specific error state
    throw new Error(`Supabase ${isAdmin ? 'Service Role' : 'Anon'} Key or URL is missing.`);
  }

  // For API routes, we need to handle cookies properly
  if (typeof window === 'undefined') {
    try {
      // Test if we're in an API route context
      const cookieStore = await cookies();

      // Create client with proper cookie handling for API routes
      return createServerClient<Database>(
        supabaseUrl,
        key,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              cookieStore.set({ name, value, ...options });
            },
            remove(name: string, options: CookieOptions) {
              cookieStore.set({ name, value: '', ...options });
            },
          },
        }
      );
    } catch (error) {
      // If cookies() fails, we're likely in an API route context without cookie access
      console.log('[Supabase Server] Creating client without cookie handling for API route');
      return createServerClient<Database>(
        supabaseUrl,
        key,
        {
          cookies: {
            get(name: string) {
              return undefined;
            },
            set(name: string, value: string, options: CookieOptions) {
              // No-op for API routes
            },
            remove(name: string, options: CookieOptions) {
              // No-op for API routes
            },
          },
        }
      );
    }
  }

  return createServerClient<Database>(
    supabaseUrl,
    key,
    {
      cookies: {
        async get(name: string) {
          try {
            const cookieStore = await cookies();
            return cookieStore.get(name)?.value
          } catch (error) {
            console.warn('[Supabase Server] Cookie get error:', error);
            return undefined;
          }
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            const cookieStore = await cookies();
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            console.warn('[Supabase Server] Cookie set error:', error);
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            const cookieStore = await cookies();
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            console.warn('[Supabase Server] Cookie remove error:', error);
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Function specifically for creating a client with admin privileges (service role key)
export async function createSupabaseAdminClient() {
  return createSupabaseServerClient(true);
}
