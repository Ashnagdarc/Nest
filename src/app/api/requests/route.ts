import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Admin requests API called');

        // Create direct Supabase client with service role key to bypass RLS
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase environment variables');
            return NextResponse.json({ data: null, error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Extract query parameters
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const userId = searchParams.get('userId');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        console.log('🔍 Query params:', { status, userId, page, pageSize, from, to });

        // Build the query - get requests first, then gear data separately
        // This avoids the multiple rows issue from gear_states
        let query = supabase
            .from('gear_requests')
            .select(`
                *,
                profiles:user_id (
                    id,
                    full_name,
                    email
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
        const { data: requests, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        // Handle database query errors
        if (error) {
            console.error('❌ Database error fetching requests:', error);
            return NextResponse.json({ data: null, total: 0, error: `Database error: ${error.message}` }, { status: 500 });
        }

        if (!requests || requests.length === 0) {
            return NextResponse.json({ data: [], total: 0, error: null });
        }

        // Get all request IDs to fetch gear data
        const requestIds = requests.map(req => req.id);

        // Fetch gear data for all requests
        const { data: gearRequestGears, error: gearError } = await supabase
            .from('gear_request_gears')
            .select(`
                gear_request_id,
                quantity,
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
                    current_request_id,
                    due_date
                )
            `)
            .in('gear_request_id', requestIds);

        if (gearError) {
            console.error('❌ Error fetching gear data:', gearError);
            return NextResponse.json({ data: null, total: 0, error: `Gear data error: ${gearError.message}` }, { status: 500 });
        }

        // Note: We no longer use gear_states table due to data integrity issues
        // All availability data now comes from the gears table directly

        // Combine the data
        const enrichedRequests = requests.map(request => {
            const requestGears = gearRequestGears?.filter(grg => grg.gear_request_id === request.id) || [];

            // Add gear data to the request
            const gear_request_gears = requestGears.map(grg => {
                return {
                    ...grg,
                    gears: {
                        ...grg.gears,
                        // No longer using gear_states due to data integrity issues
                        gear_states: []
                    }
                };
            });

            return {
                ...request,
                gear_request_gears
            };
        });

        console.log('✅ Successfully fetched requests with gear data:', { count: enrichedRequests.length, total: count || 0 });

        // Return successful response
        return NextResponse.json({ data: enrichedRequests, total: count ?? 0, error: null });
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