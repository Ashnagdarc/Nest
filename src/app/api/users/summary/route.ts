import { NextResponse } from 'next/server';
import { requireActiveAdminRouteUser } from '@/lib/api-auth';

export async function GET() {
    try {
        const adminContext = await requireActiveAdminRouteUser();
        if ('errorResponse' in adminContext) {
            return adminContext.errorResponse;
        }

        const { adminSupabase } = adminContext;
        const [totalResult, adminsResult, activeResult, inactiveResult] = await Promise.all([
            adminSupabase.from('profiles').select('*', { count: 'exact', head: true }),
            adminSupabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'Admin'),
            adminSupabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
            adminSupabase.from('profiles').select('*', { count: 'exact', head: true }).neq('status', 'Active'),
        ]);

        const queryError = [totalResult, adminsResult, activeResult, inactiveResult].find(
            (result) => result.error,
        )?.error;
        if (queryError) throw queryError;

        return NextResponse.json({
            total: totalResult.count ?? 0,
            admins: adminsResult.count ?? 0,
            active: activeResult.count ?? 0,
            inactive: inactiveResult.count ?? 0,
            error: null,
        });
    } catch (error) {
        console.error('Unexpected error in /api/users/summary:', error);
        return NextResponse.json(
            { total: 0, admins: 0, active: 0, inactive: 0, error: 'Failed to fetch user summary' },
            { status: 500 }
        );
    }
}
