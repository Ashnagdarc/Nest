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
        const unreadOnly = searchParams.get('unreadOnly') === 'true';
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

        // Build the query
        let query = supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id);

        // Apply filters
        if (unreadOnly) {
            query = query.eq('is_read', false);
        }

        // Apply limit if specified
        if (limit && !isNaN(limit)) {
            query = query.limit(limit);
        }

        // Execute the query with ordering
        const { data, error } = await query.order('created_at', { ascending: false });

        // Handle database query errors
        if (error) {
            console.error('Database error fetching notifications:', error);
            return NextResponse.json({ data: null, error: `Database error: ${error.message}` }, { status: 500 });
        }

        // Return successful response
        return NextResponse.json({ data, error: null });
    } catch (error) {
        console.error('Unexpected error in /api/notifications:', error);
        return NextResponse.json({ data: null, error: 'Failed to fetch notifications' }, { status: 500 });
    }
} 