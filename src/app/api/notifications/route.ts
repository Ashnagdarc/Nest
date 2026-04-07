import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        // Create and await the Supabase client
        const supabase = await createSupabaseServerClient();

        // Try to get user from auth
        let { data: { user }, error: authError } = await supabase.auth.getUser();

        // If no user found, try to get from cookies directly
        if (!user && !authError) {
            try {
                const cookies = request.cookies;
                const sessionCookie = cookies.get('sb-access-token')?.value;
                const refreshCookie = cookies.get('sb-refresh-token')?.value;

                if (sessionCookie) {
                    // Set the session manually
                    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                        access_token: sessionCookie,
                        refresh_token: refreshCookie || '',
                    });

                    if (sessionData.user) {
                        user = sessionData.user;
                        authError = null;
                    } else {
                        console.log('[API/notifications] Manual session set failed:', sessionError);
                    }
                }
            } catch (cookieError) {
                console.log('[API/notifications] Cookie session extraction failed:', cookieError);
            }
        }

        // Debug logging
        console.log('[API/notifications] Auth check:', {
            hasUser: !!user,
            userId: user?.id,
            authError: authError?.message,
            url: request.url,
            hasSessionCookie: !!request.cookies.get('sb-access-token')?.value
        });

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
        const userIdParam = searchParams.get('userId');

        // Use userId from query param if provided, otherwise use authenticated user
        const targetUserId = userIdParam || user.id;

        // Build the query
        let query = supabase
            .from('notifications')
            .select('*')
            .eq('user_id', targetUserId);

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