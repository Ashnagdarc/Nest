import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create Supabase server client
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Anon Key missing in middleware. Check environment variables.');
    return response;
  }

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

  // Get user from Supabase
  const { data: { user }, error } = await supabase.auth.getUser();

  // Define protected routes
  const adminRoutes = ['/admin'];
  const userRoutes = ['/user'];

  // Check if it's an admin route
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    if (!user) {
      console.log('Admin route accessed without user, redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Check if it's a user route
  if (userRoutes.some(route => pathname.startsWith(route))) {
    if (!user) {
      console.log('User route accessed without user, redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes (handled separately)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
