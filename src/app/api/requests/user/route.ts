import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Create and await the Supabase client with admin privileges since we're in a server context
        const supabase = await createSupabaseServerClient(true);

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

        // Fetch user's requests with gear_request_gears junction table data
        const { data, error } = await supabase
            .from('gear_requests')
            .select(`
                *,
                gear_request_gears (
                    quantity,
                    gears (
                        id,
                        name,
                        category,
                        description,
                        serial_number
                    )
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        // Handle database query errors
        if (error) {
            console.error('Database error:', error);
            return NextResponse.json({ data: null, error: `Database error: ${error.message}` }, { status: 500 });
        }

        // Debug logging
        console.log('🔍 API: Fetched requests data:', data);
        console.log('🔍 API: First request gear_request_gears:', data?.[0]?.gear_request_gears);

        // Return successful response
        return NextResponse.json({ data, error: null });
    } catch (error) {
        console.error('Unexpected error in /api/requests/user:', error);
        return NextResponse.json({ data: null, error: 'Failed to fetch user requests' }, { status: 500 });
    }
} 