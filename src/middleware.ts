/**
 * Next.js Middleware - Authentication & Route Protection
 * 
 * This middleware handles authentication verification and route protection for the
 * Nest by Eden Oasis application. It ensures that protected routes (admin and user areas)
 * are only accessible to authenticated users, while allowing public access to
 * authentication pages and static assets.
 * 
 * Key Features:
 * - Server-side authentication verification using Supabase SSR
 * - Role-agnostic route protection (role checking happens at page level)
 * - Automatic redirects for unauthenticated users
 * - Cookie-based session management
 * - Static asset and API route exclusion
 * 
 * @fileoverview Authentication middleware for route protection
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 * @since 2024-01-15
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

/**
 * Middleware function that runs on every request to protected routes
 * 
 * This function creates a Supabase server client to verify user authentication
 * and protects admin/user routes from unauthorized access. It uses server-side
 * rendering (SSR) compatible Supabase client to maintain session state across
 * server and client environments.
 * 
 * Authentication Flow:
 * 1. Extract request pathname and create SSR-compatible response
 * 2. Initialize Supabase client with proper cookie handling
 * 3. Verify user session and authentication status
 * 4. Check if requested route requires authentication
 * 5. Redirect unauthenticated users to login page
 * 6. Allow authenticated users to proceed to their destination
 * 
 * @async
 * @function middleware
 * @param {NextRequest} request - The incoming Next.js request object
 * @returns {Promise<NextResponse>} Response object with potential redirects
 * 
 * @example
 * ```typescript
 * // Automatically called by Next.js for matching routes
 * // User visits /admin/dashboard
 * // → Middleware checks authentication
 * // → If authenticated: Allow access
 * // → If not authenticated: Redirect to /login
 * ```
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create a response object that preserves headers and cookies
  // This is essential for maintaining authentication state across requests
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Environment variables for Supabase configuration
  // These are required for server-side authentication verification
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Critical configuration check - ensure Supabase is properly configured
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Anon Key missing in middleware. Check environment variables.');
    return response;
  }

  /**
   * Create Supabase server client with SSR-compatible cookie handling
   * 
   * This client configuration ensures that:
   * - Cookies are properly read from the request
   * - Session state is maintained across server/client boundary
   * - Authentication tokens are correctly managed
   * - Cookie updates are reflected in the response
   */
  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        /**
         * Retrieve cookie value from the incoming request
         * @param {string} name - Cookie name to retrieve
         * @returns {string | undefined} Cookie value or undefined
         */
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        /**
         * Set cookie in both request and response objects
         * This ensures cookie state is consistent across the request lifecycle
         * @param {string} name - Cookie name
         * @param {string} value - Cookie value  
         * @param {CookieOptions} options - Cookie configuration options
         */
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        /**
         * Remove cookie from both request and response objects
         * Used during logout or session cleanup
         * @param {string} name - Cookie name to remove
         * @param {CookieOptions} options - Cookie removal options
         */
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Verify user authentication status
  // This call checks the validity of the current session and returns user data
  const { data: { user }, error } = await supabase.auth.getUser();

  /**
   * Protected Route Definitions
   * 
   * These arrays define which URL patterns require authentication:
   * - adminRoutes: Paths starting with /admin (admin dashboard, management pages)
   * - userRoutes: Paths starting with /user (user dashboard, requests, history)
   * 
   * Note: Role-based authorization (admin vs user) is handled at the page level,
   * not in middleware. This middleware only verifies authentication status.
   */
  const adminRoutes = ['/admin'];
  const userRoutes = ['/user'];

  // Check if the current path requires admin authentication
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    if (!user) {
      console.log('Admin route accessed without user, redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Check if the current path requires user authentication
  if (userRoutes.some(route => pathname.startsWith(route))) {
    if (!user) {
      console.log('User route accessed without user, redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Allow request to proceed if:
  // 1. Route doesn't require authentication (public pages)
  // 2. User is authenticated and accessing protected routes
  return response;
}

/**
 * Middleware Configuration
 * 
 * This configuration object tells Next.js which routes should be processed
 * by the middleware. The matcher uses a regex pattern to:
 * 
 * INCLUDED:
 * - All routes except those explicitly excluded
 * - Admin and user dashboard routes
 * - Authentication pages (to handle redirects)
 * 
 * EXCLUDED:
 * - _next/static (Next.js static files)
 * - _next/image (Next.js image optimization)
 * - favicon.ico (site favicon)
 * - api/* (API routes handle their own authentication)
 * - Static assets (svg, png, jpg, jpeg, gif, webp)
 * 
 * This configuration ensures optimal performance by avoiding unnecessary
 * middleware execution on static assets while maintaining security on
 * dynamic routes.
 */
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
