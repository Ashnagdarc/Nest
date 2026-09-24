// Nest by Eden Oasis: Next.js Proxy for Authentication & Route Protection

import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { isAccountActive, normalizeAccountStatus } from '@/lib/auth/account-status';
import { adminRedirectUrl } from '@/lib/auth/role-routing';

function loginRedirect(request: NextRequest, preserveNext: boolean) {
    const loginUrl = new URL('/login', request.url);
    if (preserveNext) {
        const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
        if (next.startsWith('/user') || next.startsWith('/admin')) {
            loginUrl.searchParams.set('next', next);
        }
    }
    return NextResponse.redirect(loginUrl);
}

function buildBlockedLoginRedirect(
    request: NextRequest,
    status: string | null | undefined,
    fullName?: string | null
) {
    const blockedStatus = normalizeAccountStatus(status) ?? 'inactive';
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('accountStatus', blockedStatus);
    if (fullName?.trim()) {
        loginUrl.searchParams.set('name', fullName.trim());
    }
    return loginUrl;
}

async function getProfileAccess(
    supabase: ReturnType<typeof createServerClient<Database>>,
    userId: string
) {
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, status, full_name')
        .eq('id', userId)
        .maybeSingle();

    return profile;
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname === '/' && request.nextUrl.searchParams.has('code')) {
        const redirectUrl = new URL(`/reset-password${request.nextUrl.search}`, request.url);
        return NextResponse.redirect(redirectUrl);
    }
    if (pathname === '/reset-password' || pathname.startsWith('/reset-password/')) {
        return NextResponse.next({ request: { headers: request.headers } });
    }

    let response = NextResponse.next({ request: { headers: request.headers } });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase URL or Anon Key missing in proxy. Check environment variables.');
        return response;
    }

    const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
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
    });

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const adminRoutes = ['/admin'];
    const userRoutes = ['/user'];

    if (adminRoutes.some((route) => pathname.startsWith(route))) {
        if (!user) {
            return loginRedirect(request, true);
        }

        try {
            const profile = await getProfileAccess(supabase, user.id);

            if (!profile || profile.role !== 'Admin') {
                return loginRedirect(request, false);
            }

            if (!isAccountActive(profile.status)) {
                await supabase.auth.signOut();
                return NextResponse.redirect(
                    buildBlockedLoginRedirect(request, profile.status, profile.full_name)
                );
            }
        } catch (error) {
            console.error('[Proxy] Error checking admin access:', error);
            return loginRedirect(request, false);
        }
    }

    if (userRoutes.some((route) => pathname.startsWith(route))) {
        if (!user) {
            return loginRedirect(request, true);
        }

        try {
            const profile = await getProfileAccess(supabase, user.id);
            if (profile && !isAccountActive(profile.status)) {
                await supabase.auth.signOut();
                return NextResponse.redirect(
                    buildBlockedLoginRedirect(request, profile.status, profile.full_name)
                );
            }

            if (profile?.role === 'Admin' && isAccountActive(profile.status)) {
                const adminPath = adminRedirectUrl(pathname);
                if (adminPath) {
                    return NextResponse.redirect(new URL(adminPath, request.url));
                }
            }
        } catch (error) {
            console.error('[Proxy] Error checking user account status:', error);
            return loginRedirect(request, false);
        }
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|api|.*.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
