import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'; // Import your generated types

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Use anon key for server components by default
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role key for admin actions

// Function to create a server client for server components/actions
export const createSupabaseServerClient = (isAdmin = false) => {
  const key = isAdmin ? supabaseServiceRoleKey : supabaseKey;

  if (!supabaseUrl || !key) {
    console.error(`Supabase ${isAdmin ? 'Service Role' : 'Anon'} Key or URL is missing. Check environment variables.`);
    // Handle the error appropriately, maybe throw or return a specific error state
    throw new Error(`Supabase ${isAdmin ? 'Service Role' : 'Anon'} Key or URL is missing.`);
  }

  return createServerClient<Database>(
    supabaseUrl,
    key,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies();
          return cookieStore.get(name)?.value
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            const cookieStore = await cookies();
            cookieStore.set({ name, value, ...options })
          } catch (error) {
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
export const createSupabaseAdminClient = () => {
  return createSupabaseServerClient(true);
}
