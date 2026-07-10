import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

type UnauthorizedResult = {
    errorResponse: NextResponse;
};

type AuthenticatedContext = {
    authSupabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
    user: User;
};

type Profile = {
    role: string | null;
    status: string | null;
};

type ActiveAdminContext = AuthenticatedContext & {
    adminSupabase: Awaited<ReturnType<typeof createSupabaseAdminClient>>;
    profile: Profile | null;
    isActiveAdmin: true;
};

export async function requireAuthenticatedRouteUser(): Promise<AuthenticatedContext | UnauthorizedResult> {
    const authSupabase = await createSupabaseServerClient();
    const { data: { user }, error } = await authSupabase.auth.getUser();

    if (error || !user) {
        return {
            errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }

    return { authSupabase, user };
}

export async function getRouteAuthContext(): Promise<
    | (AuthenticatedContext & { profile: Profile | null; isActiveAdmin: boolean })
    | UnauthorizedResult
> {
    const authContext = await requireAuthenticatedRouteUser();
    if ('errorResponse' in authContext) {
        return authContext;
    }

    const { data: profile } = await authContext.authSupabase
        .from('profiles')
        .select('role, status')
        .eq('id', authContext.user.id)
        .maybeSingle();

    const isActiveAdmin = profile?.role === 'Admin' && profile?.status === 'Active';

    return {
        ...authContext,
        profile: profile ?? null,
        isActiveAdmin,
    };
}

export async function requireActiveAdminRouteUser(): Promise<ActiveAdminContext | UnauthorizedResult> {
    const authContext = await getRouteAuthContext();
    if ('errorResponse' in authContext) {
        return authContext;
    }

    if (!authContext.isActiveAdmin) {
        return {
            errorResponse: NextResponse.json({ error: 'Unauthorized: Active admin access required' }, { status: 403 }),
        };
    }

    const adminSupabase = await createSupabaseAdminClient();

    return {
        authSupabase: authContext.authSupabase,
        user: authContext.user,
        adminSupabase,
        profile: authContext.profile,
        isActiveAdmin: true,
    };
}

export function hasValidCronSecret(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    return Boolean(process.env.CRON_SECRET) && authHeader === `Bearer ${process.env.CRON_SECRET}`;
}
