import { NextResponse } from 'next/server';
import {
    requireAuthenticatedRouteUser as requireAuthenticatedBase,
    requireActiveAdminRouteUser as requireActiveAdminBase,
} from '@/lib/api-auth';

type AuthenticatedContext = {
    authSupabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createSupabaseServerClient>>;
    user: NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof import('@/lib/supabase/server').createSupabaseServerClient>>['auth']['getUser']>>['data']['user']>;
};

type ActiveAdminContext = AuthenticatedContext & {
    adminSupabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createSupabaseAdminClient>>;
};

type AuthFailure = {
    errorResponse: NextResponse;
};

export async function requireAuthenticatedRouteUser(): Promise<AuthenticatedContext | AuthFailure> {
    const authContext = await requireAuthenticatedBase();
    if ('errorResponse' in authContext) {
        return {
            errorResponse: NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
        };
    }

    return {
        authSupabase: authContext.authSupabase,
        user: authContext.user,
    };
}

export async function requireActiveAdminRoute(): Promise<ActiveAdminContext | AuthFailure> {
    const authContext = await requireActiveAdminBase();
    if ('errorResponse' in authContext) {
        return {
            errorResponse: NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
        }
    }

    return {
        authSupabase: authContext.authSupabase,
        user: authContext.user,
        adminSupabase: authContext.adminSupabase,
    };
}
