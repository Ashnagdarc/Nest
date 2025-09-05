import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
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

        // Fetch activities from checkins table (serves as activity log)
        const { data, error } = await supabase
            .from('checkins')
            .select(`
                *,
                profiles!inner (
                    id,
                    full_name,
                    avatar_url
                ),
                gears!inner (
                    id,
                    name,
                    category
                )
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        // Handle database errors
        if (error) {
            console.error('Database error fetching activities:', error);
            return NextResponse.json({ data: null, error: `Database error: ${error.message}` }, { status: 500 });
        }

        // Return successful response
        return NextResponse.json({ data, error: null });
    } catch (error) {
        console.error('Unexpected error in /api/dashboard/activities:', error);
        return NextResponse.json({ data: null, error: 'Failed to fetch activities' }, { status: 500 });
    }
} 