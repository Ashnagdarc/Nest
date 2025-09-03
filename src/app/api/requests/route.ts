import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Admin requests API called');

        // Create and await the Supabase client with admin privileges
        const supabase = await createSupabaseServerClient(true);

        // Extract query parameters
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const userId = searchParams.get('userId');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        console.log('🔍 Query params:', { status, userId, page, pageSize, from, to });

        // Build the query - with service role key, we can bypass RLS
        // Include gear details, states, and user profiles
        let query = supabase
            .from('gear_requests')
            .select(`
                *,
                profiles:user_id (
                    id,
                    full_name,
                    email
                ),
                gear_request_gears!inner (
                    quantity,
                    gears!inner (
                        id,
                        name,
                        category,
                        description,
                        serial_number,
                        quantity,
                        gear_states!inner (
                            status,
                            available_quantity,
                            checked_out_to,
                            due_date
                        )
                    )
                )
            `, { count: 'exact' });

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
            console.error('❌ Database error fetching requests:', error);
            return NextResponse.json({ data: null, total: 0, error: `Database error: ${error.message}` }, { status: 500 });
        }

        console.log('✅ Successfully fetched requests:', { count: data?.length || 0, total: count || 0, data: data });

        // Return successful response
        return NextResponse.json({ data, total: count ?? 0, error: null });
    } catch (error) {
        console.error('❌ Unexpected error in /api/requests:', error);
        return NextResponse.json({ data: null, error: 'Failed to fetch requests' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        // Create and await the Supabase client with admin privileges
        const supabase = await createSupabaseServerClient(true);

        // Parse the request body
        const body = await request.json();

        // Insert the request
        const { data: requestData, error: requestError } = await supabase
            .from('gear_requests')
            .insert(body)
            .select(`
                *,
                profiles:user_id (
                    id,
                    full_name,
                    email
                )
            `)
            .single();

        // Handle database errors
        if (requestError) {
            console.error('Error creating request:', requestError);
            return NextResponse.json({ data: null, error: `Failed to create request: ${requestError.message}` }, { status: 500 });
        }

        // If gear_request_gears data is provided, insert it
        if (body.gear_request_gears && Array.isArray(body.gear_request_gears)) {
            const gearLines = body.gear_request_gears.map((line: { gear_id: string; quantity?: number }) => ({
                gear_request_id: requestData.id,
                gear_id: line.gear_id,
                quantity: line.quantity || 1
            }));

            const { error: linesError } = await supabase
                .from('gear_request_gears')
                .insert(gearLines);

            if (linesError) {
                console.error('Error inserting gear lines:', linesError);
                // Delete the request if lines insertion fails
                await supabase
                    .from('gear_requests')
                    .delete()
                    .eq('id', requestData.id);
                return NextResponse.json({ data: null, error: `Failed to create gear lines: ${linesError.message}` }, { status: 500 });
            }

            // Fetch the complete request with all relationships
            const { data: fullRequest, error: fetchError } = await supabase
                .from('gear_requests')
                .select(`
                    *,
                    profiles:user_id (
                        id,
                        full_name,
                        email
                    ),
                    gear_request_gears!inner (
                        quantity,
                        gears!inner (
                            id,
                            name,
                            category,
                            description,
                            serial_number,
                            quantity,
                            gear_states!inner (
                                status,
                                available_quantity,
                                checked_out_to,
                                due_date
                            )
                        )
                    )
                `)
                .eq('id', requestData.id)
                .single();

            if (fetchError) {
                console.error('Error fetching complete request:', fetchError);
                return NextResponse.json({ data: requestData, error: null });
            }

            return NextResponse.json({ data: fullRequest, error: null });
        }

        // Return successful response with basic request data if no gear lines
        return NextResponse.json({ data: requestData, error: null });
    } catch (error) {
        console.error('Unexpected error creating request:', error);
        return NextResponse.json({ data: null, error: 'Failed to create request' }, { status: 500 });
    }
} 