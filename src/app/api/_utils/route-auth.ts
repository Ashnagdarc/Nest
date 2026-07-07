import { type User } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

type Profile = {
    role: string | null;
    status: string | null;
};

export type RouteAuthContext = {
    authSupabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
    user: User;
    profile: Profile | null;
    isActiveAdmin: boolean;
};

export async function getRouteAuthContext() {
    const authSupabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
        return {
            errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        };
    }

    const { data: profile } = await authSupabase
        .from('profiles')
        .select('role, status')
        .eq('id', user.id)
        .maybeSingle();

    return {
        authSupabase,
        user,
        profile: profile ?? null,
        isActiveAdmin: profile?.role === 'Admin' && profile?.status === 'Active'
    };
}

export async function requireActiveAdmin() {
    const authContext = await getRouteAuthContext();
    if ('errorResponse' in authContext) {
        return authContext;
    }

    if (!authContext.isActiveAdmin) {
        return {
            errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        };
    }

    return {
        ...authContext,
        adminSupabase: await createSupabaseAdminClient()
    };
}

export function hasValidCronSecret(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    return Boolean(process.env.CRON_SECRET) && authHeader === `Bearer ${process.env.CRON_SECRET}`;
}
