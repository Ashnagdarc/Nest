import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        // Use server client tied to cookies/session
        const supabase = await createSupabaseServerClient();

        // Get the authenticated user (robust to API route context)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        const { data: { session } } = await supabase.auth.getSession();
        const userId = user?.id || session?.user?.id;
        if (authError || !userId) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch user's requests with gear details and current states
        const { data, error } = await supabase
            .from('gear_requests')
            .select(`
                *,
                gear_request_gears (
                    id,
                    quantity,
                    gear_id,
                    gears (
                        id,
                        name,
                        category,
                        description,
                        serial_number,
                        quantity,
                        available_quantity,
                        status,
                        checked_out_to,
                        due_date
                    )
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        // Handle database query errors
        if (error) {
            console.error('Database error:', error);
            return NextResponse.json({ data: null, error: `Database error: ${error.message}` }, { status: 500 });
        }



        // Return successful response
        return NextResponse.json({ data, error: null });
    } catch (error) {
        console.error('Unexpected error in /api/requests/user:', error);
        return NextResponse.json({ data: null, error: 'Failed to fetch user requests' }, { status: 500 });
    }
}
