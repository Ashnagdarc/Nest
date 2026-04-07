/**
 * Supabase Server Client Configuration - Nest by Eden Oasis
 * 
 * This module provides server-side Supabase client instances for Next.js App Router.
 * Handles server components, server actions, and API routes with proper cookie management.
 * 
 * Key Features:
 * - Dual-mode authentication (anon key for users, service role for admin)
 * - Cookie-based session management for App Router
 * - Fallback handling for API routes without cookie access
 * - Type-safe database operations with generated types
 * 
 * When to use:
 * - Server Components: Use with default (isAdmin=false) for user context
 * - Admin Operations: Use with isAdmin=true to bypass RLS policies
 * - API Routes: Automatically handles cookie availability
 * 
 * @fileoverview Server-side Supabase client configuration
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 * @since 2024-01-15
 */
'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Creates a server-side Supabase client with proper authentication
 * 
 * Why two modes:
 * - isAdmin=false: Uses anon key + user session cookies (respects RLS)
 * - isAdmin=true: Uses service role key (bypasses RLS for admin operations)
 * 
 * Cookie handling:
 * - In App Router: Uses Next.js cookies() for session persistence
 * - In API routes: Falls back to cookieless mode when cookies() unavailable
 * 
 * @param isAdmin - Use service role key to bypass RLS (admin operations only)
 * @returns Configured Supabase client for server-side operations
 * 
 * @example
 * // In Server Component (user context)
 * const supabase = await createSupabaseServerClient();
 * 
 * @example
 * // In API Route (admin operations)
 * const supabase = await createSupabaseServerClient(true);
 */
export async function createSupabaseServerClient(isAdmin = false) {
  const key = isAdmin ? supabaseServiceRoleKey : supabaseKey;

  if (!supabaseUrl || !key) {
    console.error(`Supabase ${isAdmin ? 'Service Role' : 'Anon'} Key or URL is missing. Check environment variables.`);
    console.error('Supabase URL:', supabaseUrl ? 'Present' : 'Missing');
    console.error('Supabase Key:', key ? 'Present' : 'Missing');
    throw new Error(`Supabase ${isAdmin ? 'Service Role' : 'Anon'} Key or URL is missing.`);
  }

  /**
   * Cookie handling for App Router
   * 
   * Why: Next.js App Router uses cookies() for session management.
   * Try-catch handles API routes where cookies() might not be available.
   */
  if (typeof window === 'undefined') {
    try {
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
          global: {
            fetch: (url, options = {}) => {
              return fetch(url, {
                ...options,
                // Increase timeout from default 10s to 20s
                signal: AbortSignal.timeout(20000),
              });
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
