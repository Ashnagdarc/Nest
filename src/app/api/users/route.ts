import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAdminRouteUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
    try {
        const adminContext = await requireActiveAdminRouteUser();
        if ('errorResponse' in adminContext) {
            const body = await adminContext.errorResponse.json();
            return NextResponse.json({ data: null, total: 0, error: body.error }, { status: adminContext.errorResponse.status });
        }

        const adminSupabase = adminContext.adminSupabase;
        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role');
        const ids = searchParams.get('ids');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = adminSupabase.from('profiles').select('*', { count: 'exact' });

        // Filter by role if specified
        if (role && role !== 'all') {
            query = query.eq('role', role);
        }

        // Filter by specific IDs if provided
        if (ids) {
            const idArray = ids.split(',');
            query = query.in('id', idArray);
        }

        // Server-side search (case-insensitive partial match)
        if (search) {
            // Use ilike for partial match on full_name, email, or role
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,role.ilike.%${search}%`);
        }

        const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);

        if (error) {
            console.error('Database error fetching users:', error);
            return NextResponse.json({ data: null, total: 0, error: `Database error: ${error.message}` }, { status: 500 });
        }

        return NextResponse.json({ data, total: count ?? 0, error: null });
    } catch (error) {
        console.error('Unexpected error in /api/users:', error);
        return NextResponse.json({ data: null, error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const adminContext = await requireActiveAdminRouteUser();
        if ('errorResponse' in adminContext) {
            const body = await adminContext.errorResponse.json();
            return NextResponse.json({ data: null, error: body.error }, { status: adminContext.errorResponse.status });
        }

        const adminSupabase = adminContext.adminSupabase;
        const { data, error } = await adminSupabase.from('profiles').insert(body).select().single();

        if (error) {
            console.error('Error creating user:', error);
            return NextResponse.json({ data: null, error: `Failed to create user: ${error.message}` }, { status: 500 });
        }

        return NextResponse.json({ data, error: null });
    } catch (error) {
        console.error('Unexpected error creating user:', error);
        return NextResponse.json({ data: null, error: 'Failed to create user' }, { status: 500 });
    }
} 
