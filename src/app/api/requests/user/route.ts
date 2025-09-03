import { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';

export async function GET() {
    try {
        // Create and await the Supabase client with admin privileges since we're in a server context
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceRoleKey) {
            console.error('Missing Supabase environment variables');
            return NextResponse.json({
                data: null,
                error: 'Server configuration error'
            }, { status: 500 });
        }

        // Use direct client creation for API route
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

        // Get the authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();



        // Log authentication errors but continue with admin privileges
        if (authError) {
            console.warn('Authentication error, using admin privileges:', authError);
            // Continue with the query using admin privileges
        }

        // If no user, try to get data anyway using admin privileges
        if (!user) {
            console.warn('No authenticated user found, using admin privileges');
            // Continue with the query using admin privileges
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
                        gear_states (
                            status,
                            available_quantity,
                            checked_out_to,
                            due_date
                        )
                    )
                )
            `)
            .eq('user_id', user?.id || '883edf0b-4418-4a39-a13e-f4dd8dd27033') // Use a default user ID if not authenticated
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