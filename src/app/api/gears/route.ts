import { createSupabaseApiClient } from '@/lib/supabase/api-client';
import { NextRequest, NextResponse } from 'next/server';
import { getRouteAuthContext, requireActiveAdminRouteUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
    try {
        const authContext = await getRouteAuthContext();
        if ('errorResponse' in authContext) {
            return NextResponse.json(
                { data: null, error: (await authContext.errorResponse.json()).error },
                { status: authContext.errorResponse.status }
            );
        }

        // Active admins may use service-role for full inventory; others stay on RLS-scoped auth client.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let supabase: any;
        try {
            supabase = authContext.isActiveAdmin
                ? createSupabaseApiClient(true)
                : authContext.authSupabase;
        } catch (error) {
            console.error('[Gears API] Failed to create Supabase client:', error);
            return NextResponse.json({ data: null, error: 'Failed to create database connection' }, { status: 500 });
        }
        const { searchParams } = new URL(request.url);

        // Extract query parameters
        const status = searchParams.get('status');
        const category = searchParams.get('category');
        const excludeCategories = searchParams.get('excludeCategories');
        const ids = searchParams.get('ids');
        const fields = searchParams.get('fields');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
        const hasExplicitPagination = searchParams.has('page') || searchParams.has('pageSize');
        const isFieldProjectionOnly = Boolean(fields) && !hasExplicitPagination;
        const offset = (page - 1) * pageSize;
        const limit = pageSize;

        // Helper to build query with search (now only name and serial_number)
        type SearchQueryable = { or: (filters: string) => SearchQueryable };
        type ExclusionQueryable = {
            neq: (column: string, value: string) => ExclusionQueryable;
            not: (column: string, operator: string, value: string) => ExclusionQueryable;
        };
        type StatusQueryable = {
            in: (column: string, values: string[]) => StatusQueryable;
            eq: (column: string, value: string) => StatusQueryable;
            gt: (column: string, value: number) => StatusQueryable;
        };

        function applySearch<T extends SearchQueryable>(query: T, search: string | null): T {
            if (search && search.trim() !== '') {
                const searchTerm = `%${search.trim()}%`;
                return query.or(`name.ilike.${searchTerm},serial_number.ilike.${searchTerm}`) as T;
            }
            return query;
        }

        const applyExclusions = <T extends ExclusionQueryable>(query: T): T => {
            if (excludeCategories) {
                const list = excludeCategories.split(',').map(s => s.trim()).filter(Boolean);
                if (list.length === 1) {
                    return query.neq('category', list[0]) as T;
                }
                const tuple = `(${list.join(',')})`;
                return query.not('category', 'in', tuple) as T;
            }
            return query;
        };

        /** Apply status filter consistently to both count and data queries. */
        const applyStatusFilter = <T extends StatusQueryable>(query: T): T => {
            if (!status || status === 'all') {
                return query;
            }
            if (status === 'Available') {
                return query.in('status', ['Available', 'Partially Available']).gt('available_quantity', 0) as T;
            }
            return query.eq('status', status) as T;
        };

        /** Exclude soft-deleted inventory from default listings and stats. */
        const applyActiveInventoryFilter = <T extends ExclusionQueryable>(query: T): T => {
            if (!status || status === 'all') {
                return query.neq('status', 'Deleted') as T;
            }
            return query;
        };

        // Build the base query for filters
        let baseQuery;
        if (fields) {
            const fieldList = fields.split(',');
            baseQuery = supabase.from('gears').select(fieldList.join(','), { count: 'exact' });
        } else {
            baseQuery = supabase.from('gears').select('*', { count: 'exact' });
        }
        baseQuery = applyStatusFilter(baseQuery);
        baseQuery = applyActiveInventoryFilter(baseQuery);
        if (category && category !== 'all') {
            baseQuery = baseQuery.eq('category', category);
        }
        baseQuery = applyExclusions(baseQuery);
        if (ids) {
            const idArray = ids.split(',');
            baseQuery = baseQuery.in('id', idArray);
        }
        baseQuery = applySearch(baseQuery, search);

        // Get total count after filters (before pagination)

        const { count: total, error: countError } = await baseQuery.range(0, 0);
        if (countError) {
            console.error('[Gears API] Count error:', countError);
            return NextResponse.json({ data: null, error: 'Search failed. Try searching by name or serial number.' }, { status: 200 });
        }

        // Now fetch paginated data
        let dataQuery;
        if (fields) {
            const fieldList = fields.split(',');
            dataQuery = supabase.from('gears').select(fieldList.join(','));
        } else {
            dataQuery = supabase.from('gears').select('*');
        }
        dataQuery = applyStatusFilter(dataQuery);
        dataQuery = applyActiveInventoryFilter(dataQuery);
        if (category && category !== 'all') {
            dataQuery = dataQuery.eq('category', category);
        }
        dataQuery = applyExclusions(dataQuery);
        if (ids) {
            const idArray = ids.split(',');
            dataQuery = dataQuery.in('id', idArray);
        }
        dataQuery = applySearch(dataQuery, search);
        dataQuery = dataQuery.order('name');
        if (!isFieldProjectionOnly) {
            dataQuery = dataQuery.range(offset, offset + limit - 1);
        }

        const { data, error } = await dataQuery;

        if (error) {
            console.error('[Gears API] Data fetch error:', error);
            return NextResponse.json({ data: null, error: 'Search failed. Try searching by name or serial number.' }, { status: 200 });
        }


        return NextResponse.json({
            data,
            total: total ?? 0,
            page,
            pageSize,
            error: null
        });
    } catch (error) {
        console.error('[Gears API] Unexpected error:', error);
        return NextResponse.json({ data: null, error: 'Unexpected error. Please try again.' }, { status: 200 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = createSupabaseApiClient(true);
        const authContext = await requireActiveAdminRouteUser();
        if ('errorResponse' in authContext) {
            return NextResponse.json({ data: null, error: (await authContext.errorResponse.json()).error }, { status: authContext.errorResponse.status });
        }

        const body = await request.json();
        const normalizedQuantity = Math.max(1, Number(body?.quantity ?? 1));
        const payload = {
            ...body,
            quantity: normalizedQuantity,
            available_quantity: body?.available_quantity ?? normalizedQuantity,
        };
        const { data, error } = await supabase.from('gears').insert(payload).select().single();

        if (error) {
            return NextResponse.json({ data: null, error: `Failed to create gear: ${error.message}` }, { status: 500 });
        }

        return NextResponse.json({ data, error: null });
    } catch {
        return NextResponse.json({ data: null, error: 'Failed to create gear' }, { status: 500 });
    }
}
