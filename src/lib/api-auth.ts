import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

type UnauthorizedResult = {
    errorResponse: NextResponse;
};

type AuthenticatedContext = {
    user: NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof createSupabaseServerClient>>['auth']['getUser']>>['data']['user']>;
};

type ActiveAdminContext = AuthenticatedContext & {
    adminSupabase: Awaited<ReturnType<typeof createSupabaseAdminClient>>;
    profile: {
        role: string | null;
        status: string | null;
    } | null;
};

export async function requireAuthenticatedRouteUser(): Promise<AuthenticatedContext | UnauthorizedResult> {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return {
            errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }

    return { user };
}

export async function requireActiveAdminRouteUser(): Promise<ActiveAdminContext | UnauthorizedResult> {
    const authContext = await requireAuthenticatedRouteUser();
    if ('errorResponse' in authContext) {
        return authContext;
    }

    const adminSupabase = await createSupabaseAdminClient();
    const { data: profile, error } = await adminSupabase
        .from('profiles')
        .select('role, status')
        .eq('id', authContext.user.id)
        .maybeSingle();

    const isActiveAdmin = !error && profile?.role === 'Admin' && profile?.status === 'Active';

    if (!isActiveAdmin) {
        return {
            errorResponse: NextResponse.json({ error: 'Unauthorized: Active admin access required' }, { status: 403 }),
        };
    }

    return {
        user: authContext.user,
        adminSupabase,
        profile: profile ?? null,
    };
}
