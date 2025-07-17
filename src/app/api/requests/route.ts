import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        // Create and await the Supabase client
        const supabase = await createSupabaseServerClient();

        // Get the authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        // Check for authentication errors
        if (authError) {
            console.error('Authentication error:', authError);
            return NextResponse.json({ data: null, error: 'Authentication failed' }, { status: 401 });
        }

        // Check if user exists
        if (!user) {
            return NextResponse.json({ data: null, error: 'Unauthorized: No authenticated user found' }, { status: 401 });
        }

        // Extract query parameters
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const userId = searchParams.get('userId');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // Build the query
        let query;

        // Always join profiles for user info
        query = supabase.from('gear_requests').select('*, profiles:user_id (full_name, email)', { count: 'exact' });

        // Apply filters
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        // Filter by user ID if specified
        if (userId) {
            query = query.eq('user_id', userId);
        }

        // Execute the paginated query
        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        // Handle database query errors
        if (error) {
            console.error('Database error fetching requests:', error);
            return NextResponse.json({ data: null, total: 0, error: `Database error: ${error.message}` }, { status: 500 });
        }

        // Return successful response
        return NextResponse.json({ data, total: count ?? 0, error: null });
    } catch (error) {
        console.error('Unexpected error in /api/requests:', error);
        return NextResponse.json({ data: null, error: 'Failed to fetch requests' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        // Create and await the Supabase client
        const supabase = await createSupabaseServerClient();

        // Get the authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        // Check for authentication errors
        if (authError) {
            console.error('Authentication error:', authError);
            return NextResponse.json({ data: null, error: 'Authentication failed' }, { status: 401 });
        }

        // Check if user exists
        if (!user) {
            return NextResponse.json({ data: null, error: 'Unauthorized: No authenticated user found' }, { status: 401 });
        }

        // Parse the request body
        const body = await request.json();

        // Add the user ID if not provided
        if (!body.user_id) {
            body.user_id = user.id;
        }

        // Insert the request
        const { data, error } = await supabase.from('gear_requests').insert(body).select().single();

        // Handle database errors
        if (error) {
            console.error('Error creating request:', error);
            return NextResponse.json({ data: null, error: `Failed to create request: ${error.message}` }, { status: 500 });
        }

        // Return successful response
        return NextResponse.json({ data, error: null });
    } catch (error) {
        console.error('Unexpected error creating request:', error);
        return NextResponse.json({ data: null, error: 'Failed to create request' }, { status: 500 });
    }
} 