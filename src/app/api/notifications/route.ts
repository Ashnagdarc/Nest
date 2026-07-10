import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
            console.error('[API/notifications] Authentication error:', authError.message);
            return NextResponse.json({ data: null, error: 'Authentication failed' }, { status: 401 });
        }

        if (!user) {
            return NextResponse.json({ data: null, error: 'Unauthorized: No authenticated user found' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const unreadOnly = searchParams.get('unreadOnly') === 'true';
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
        const userIdParam = searchParams.get('userId');

        // Users may only read their own notifications; reject requests for other users.
        if (userIdParam && userIdParam !== user.id) {
            return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
        }

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