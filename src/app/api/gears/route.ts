import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);

        // Extract query parameters
        const status = searchParams.get('status');
        const category = searchParams.get('category');
        const ids = searchParams.get('ids');
        const fields = searchParams.get('fields');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
        const offset = (page - 1) * pageSize;
        const limit = pageSize;

        // Helper to build query with search (now only name and serial_number)
        function applySearch(query: any, search: string | null) {
            if (search && search.trim() !== '') {
                const searchTerm = `%${search.trim()}%`;
                return query.or(`name.ilike.${searchTerm},serial_number.ilike.${searchTerm}`);
            }
            return query;
        }

        // Build the base query for filters
        let baseQuery;
        if (fields) {
            const fieldList = fields.split(',');
            baseQuery = supabase.from('gears').select(fieldList.join(','), { count: 'exact' });
        } else {
            baseQuery = supabase.from('gears').select('*', { count: 'exact' });
        }
        if (status && status !== 'all') {
            baseQuery = baseQuery.eq('status', status);
        }
        if (category && category !== 'all') {
            baseQuery = baseQuery.eq('category', category);
        }
        if (ids) {
            const idArray = ids.split(',');
            baseQuery = baseQuery.in('id', idArray);
        }
        baseQuery = applySearch(baseQuery, search);

        // Get total count after filters (before pagination)
        const { count: total, error: countError } = await baseQuery.range(0, 0);
        if (countError) {
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
        if (status && status !== 'all') {
            dataQuery = dataQuery.eq('status', status);
        }
        if (category && category !== 'all') {
            dataQuery = dataQuery.eq('category', category);
        }
        if (ids) {
            const idArray = ids.split(',');
            dataQuery = dataQuery.in('id', idArray);
        }
        dataQuery = applySearch(dataQuery, search);
        dataQuery = dataQuery.order('name').range(offset, offset + limit - 1);
        const { data, error } = await dataQuery;

        if (error) {
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
        return NextResponse.json({ data: null, error: 'Unexpected error. Please try again.' }, { status: 200 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();

        // Check for admin authorization
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
        }

        // Verify admin role before allowing gear creation
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || profile?.role !== 'Admin') {
            return NextResponse.json({ data: null, error: 'Unauthorized: Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { data, error } = await supabase.from('gears').insert(body).select().single();

        if (error) {
            return NextResponse.json({ data: null, error: `Failed to create gear: ${error.message}` }, { status: 500 });
        }

        return NextResponse.json({ data, error: null });
    } catch (error) {
        return NextResponse.json({ data: null, error: 'Failed to create gear' }, { status: 500 });
    }
} 