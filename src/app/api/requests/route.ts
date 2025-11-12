import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';
import { sendGearRequestEmail } from '@/lib/email';

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

            // Send notification email to all admins about the new gear request
            try {
                const { data: admins } = await supabase
                    .from('profiles')
                    .select('email, full_name')
                    .eq('role', 'Admin')
                    .eq('status', 'Active');
                
                console.log(`[Gear Request] Found ${admins?.length || 0} admins to notify`);
                
                if (admins && Array.isArray(admins)) {
                    // Get gear names for the email
                    const gearNames = fullRequest.gear_request_gears?.map((grg: any) => 
                        `${grg.gears?.name || 'Unknown'} (x${grg.quantity || 1})`
                    ).join(', ') || 'Gear items';

                    const userName = fullRequest.profiles?.full_name || 'User';
                    const userEmail = fullRequest.profiles?.email || '';

                    for (const admin of admins) {
                        console.log(`[Gear Request] Processing admin: ${admin.email}`);
                        if (admin.email) {
                            try {
                                console.log(`[Gear Request] Sending email to: ${admin.email}`);
                                await sendGearRequestEmail({
                                    to: admin.email,
                                    subject: `📦 New Gear Request - ${userName}`,
                                    html: `
                                        <!DOCTYPE html>
                                        <html>
                                            <head>
                                                <meta charset="utf-8">
                                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                            </head>
                                            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
                                                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                                                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 40px; text-align: center;">
                                                        <h1 style="margin: 0; font-size: 24px; font-weight: 600;">📦 New Gear Request</h1>
                                                        <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Action required - Review and approve</p>
                                                    </div>
                                                    <div style="padding: 40px; line-height: 1.6; color: #333;">
                                                        <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">Hello ${admin.full_name || 'Admin'},</h2>
                                                        <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151;">A new gear request has been submitted and requires your review.</p>
                                                        <div style="background-color: #f9fafb; border-left: 4px solid #667eea; padding: 16px; margin: 24px 0; border-radius: 4px;">
                                                            <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #5521b5;">Request Details</h3>
                                                            <table style="width: 100%; border-collapse: collapse;">
                                                                <tr>
                                                                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Requester:</td>
                                                                    <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${userName}</td>
                                                                </tr>
                                                                ${userEmail ? `
                                                                <tr>
                                                                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Email:</td>
                                                                    <td style="padding: 8px 0; color: #1f2937;">${userEmail}</td>
                                                                </tr>
                                                                ` : ''}
                                                                <tr>
                                                                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Equipment:</td>
                                                                    <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${gearNames}</td>
                                                                </tr>
                                                                ${fullRequest.reason ? `
                                                                <tr>
                                                                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Reason:</td>
                                                                    <td style="padding: 8px 0; color: #1f2937;">${fullRequest.reason}</td>
                                                                </tr>
                                                                ` : ''}
                                                                ${fullRequest.destination ? `
                                                                <tr>
                                                                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Destination:</td>
                                                                    <td style="padding: 8px 0; color: #1f2937;">${fullRequest.destination}</td>
                                                                </tr>
                                                                ` : ''}
                                                                ${fullRequest.expected_duration ? `
                                                                <tr>
                                                                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Duration:</td>
                                                                    <td style="padding: 8px 0; color: #1f2937;">${fullRequest.expected_duration}</td>
                                                                </tr>
                                                                ` : ''}
                                                            </table>
                                                        </div>
                                                        <div style="text-align: center; margin: 32px 0;">
                                                            <a href="https://nestbyeden.app/admin/manage-requests" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">Review Request</a>
                                                        </div>
                                                        <p style="margin-top: 32px; font-size: 14px; color: #6b7280; line-height: 1.6;">Please review this request and approve or reject it based on equipment availability.</p>
                                                    </div>
                                                    <div style="background-color: #f7fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                                                        <p style="margin: 0; font-size: 14px; color: #718096;">
                                                            This is an automated notification from <a href="https://nestbyeden.app" style="color: #667eea; text-decoration: none;"><strong>Nest by Eden Oasis</strong></a><br>
                                                            Equipment Management System
                                                        </p>
                                                    </div>
                                                </div>
                                            </body>
                                        </html>
                                    `
                                });
                                console.log(`[Gear Request] ✅ Email sent successfully to: ${admin.email}`);
                            } catch (emailError) {
                                console.error(`[Gear Request] ❌ Failed to send email to admin ${admin.email}:`, emailError);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('[Gear Request] Error fetching admins or sending notifications:', e);
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