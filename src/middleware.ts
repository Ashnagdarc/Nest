// Nest by Eden Oasis: Next.js Middleware for Authentication & Route Protection
// Author: Daniel Chinonso Samuel | v1.0.0 | 2024-01-15

import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Anon Key missing in middleware. Check environment variables.');
    return response;
  }

  // SSR-compatible Supabase client with cookie handling
  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Check user authentication
  const { data: { user } } = await supabase.auth.getUser();

  // Define protected routes
  const adminRoutes = ['/admin'];
  const userRoutes = ['/user'];

  if (adminRoutes.some(route => pathname.startsWith(route))) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  if (userRoutes.some(route => pathname.startsWith(route))) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  return response;
}

export const config = {
  matcher: [
    // Match all except static, image, favicon, api, and public assets
    '/((?!_next/static|_next/image|favicon.ico|api|.*.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
