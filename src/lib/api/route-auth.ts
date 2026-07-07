import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type AuthenticatedContext = {
    authSupabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
    user: NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof createSupabaseServerClient>>['auth']['getUser']>>['data']['user']>;
};

type ActiveAdminContext = AuthenticatedContext & {
    adminSupabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
};

type AuthFailure = {
    errorResponse: NextResponse;
};

export async function requireAuthenticatedRouteUser(): Promise<AuthenticatedContext | AuthFailure> {
    const authSupabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
        return {
            errorResponse: NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
        };
    }

    return { authSupabase, user };
}

export async function requireActiveAdminRoute(): Promise<ActiveAdminContext | AuthFailure> {
    const authContext = await requireAuthenticatedRouteUser();
    if ('errorResponse' in authContext) {
        return authContext;
    }

    const adminSupabase = await createSupabaseServerClient(true);
    const { data: profile, error: profileError } = await adminSupabase
        .from('profiles')
        .select('role, status')
        .eq('id', authContext.user.id)
        .maybeSingle();

    const isActiveAdmin = !profileError && profile?.role === 'Admin' && profile?.status === 'Active';

    if (!isActiveAdmin) {
        return {
            errorResponse: NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
        };
    }

    return { ...authContext, adminSupabase };
}
