import { type NextRequest, NextResponse } from 'next/server';
// import { updateSession } from '@/lib/supabase/middleware'; // Removed Supabase import

export async function middleware(request: NextRequest) {
  // Firebase authentication state is typically managed client-side or with server-side cookies/tokens
  // This middleware might be used for other purposes like redirecting based on path or headers,
  // but not directly for Firebase session updates in the same way Supabase SSR helpers work.

  // Example: Basic logging
  console.log(`Middleware processing: ${request.nextUrl.pathname}`);

  // Just pass the request through for now
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Previous Supabase session update logic:
  // return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
