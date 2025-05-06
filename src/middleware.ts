import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware'; // Import Supabase middleware

export async function middleware(request: NextRequest) {
  // Update Supabase session
  return await updateSession(request);

  // Previous Firebase/pass-through logic removed:
  // console.log(`Middleware processing: ${request.nextUrl.pathname}`);
  // return NextResponse.next({
  //   request: {
  //     headers: request.headers,
  //   },
  // });
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
