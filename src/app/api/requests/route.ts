import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';
import { sendGearRequestEmail } from '@/lib/email';
import { enqueuePushNotification, triggerPushWorker } from '@/lib/push-queue';

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

        // Build the query - get requests first, then gear data separately.
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

        // Combine the data
        const enrichedRequests = requests.map(request => {
            const requestGears = gearRequestGears?.filter(grg => grg.gear_request_id === request.id) || [];

            // Add gear data to the request
            const gear_request_gears = requestGears.map(grg => ({
                ...grg,
                gears: grg.gears
            }));

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
        // Wrap in timeout to prevent hanging queries (30 second max)
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 30000);

        try {
            // Create Supabase client with admin privileges
            const supabase = await createSupabaseServerClient(true);

            // Parse the request body
            const body = await request.json();

            // Validate required fields
            if (!body.user_id || !body.reason) {
                return NextResponse.json(
                    { data: null, error: 'Missing required fields: user_id, reason' },
                    { status: 400 }
                );
            }

            const rawLines = Array.isArray(body.gear_request_gears)
                ? body.gear_request_gears
                    .map((line: { gear_id?: string; quantity?: number }) => ({
                        gear_id: String(line.gear_id || '').trim(),
                        quantity: Math.max(1, Number(line.quantity ?? 1))
                    }))
                    .filter((line: { gear_id: string; quantity: number }) => line.gear_id && Number.isFinite(line.quantity))
                : [];

            if (rawLines.length === 0) {
                return NextResponse.json(
                    { data: null, error: 'At least one equipment line is required' },
                    { status: 400 }
                );
            }

            // Aggregate repeated gear lines and validate availability upfront.
            const requestedByGear = new Map<string, number>();
            rawLines.forEach((line: { gear_id: string; quantity: number }) => {
                requestedByGear.set(line.gear_id, (requestedByGear.get(line.gear_id) || 0) + line.quantity);
            });
            const normalizedLines = Array.from(requestedByGear.entries()).map(([gear_id, quantity]) => ({ gear_id, quantity }));

            const uniqueGearIds = normalizedLines.map((line) => line.gear_id);
            const { data: gears, error: gearsError } = await supabase
                .from('gears')
                .select('id, name, quantity, available_quantity, status')
                .in('id', uniqueGearIds);

            if (gearsError) {
                clearTimeout(timeoutId);
                return NextResponse.json(
                    { data: null, error: `Failed to validate gear availability: ${gearsError.message}` },
                    { status: 500 }
                );
            }

            const gearMap = new Map((gears || []).map((g) => [g.id, g]));
            for (const line of normalizedLines) {
                const gear = gearMap.get(line.gear_id);
                if (!gear) {
                    clearTimeout(timeoutId);
                    return NextResponse.json(
                        { data: null, error: `Unknown gear item: ${line.gear_id}` },
                        { status: 400 }
                    );
                }
                const availableQty = Math.max(0, Number(gear.available_quantity ?? gear.quantity ?? 0));
                if (availableQty < line.quantity) {
                    clearTimeout(timeoutId);
                    return NextResponse.json(
                        {
                            data: null,
                            error: `Insufficient quantity for ${gear.name}. Requested ${line.quantity}, available ${availableQty}.`,
                            details: {
                                gear_id: line.gear_id,
                                requested: line.quantity,
                                available: availableQty,
                                status: gear.status
                            }
                        },
                        { status: 409 }
                    );
                }
            }

            // Insert the request - keep this simple and fast
            const { data: requestData, error: requestError } = await supabase
                .from('gear_requests')
                .insert({
                    user_id: body.user_id,
                    reason: body.reason,
                    destination: body.destination || null,
                    expected_duration: body.expected_duration || null,
                    team_members: body.team_members || null,
                    status: body.status || 'Pending',
                    due_date: body.due_date || null
                })
                .select('id, status, created_at, user_id')
                .single();

            // Handle database errors
            if (requestError) {
                console.error('Error creating request:', requestError);
                clearTimeout(timeoutId);
                return NextResponse.json(
                    { data: null, error: `Failed to create request: ${requestError.message}` },
                    { status: 500 }
                );
            }

            // Insert gear lines (validated above)
            if (normalizedLines.length > 0) {
                const gearLines = normalizedLines.map((line: { gear_id: string; quantity?: number }) => ({
                    gear_request_id: requestData.id,
                    gear_id: line.gear_id,
                    quantity: Math.max(1, line.quantity || 1) // Ensure quantity >= 1
                }));

                const { error: linesError } = await supabase
                    .from('gear_request_gears')
                    .insert(gearLines);

                if (linesError) {
                    console.error('Error inserting gear lines:', linesError);
                    clearTimeout(timeoutId);
                    // Delete the request if lines insertion fails
                    await supabase
                        .from('gear_requests')
                        .delete()
                        .eq('id', requestData.id)
                        .catch(err => console.error('Failed to rollback request:', err));

                    return NextResponse.json(
                        { data: null, error: `Failed to add equipment to request: ${linesError.message}` },
                        { status: 500 }
                    );
                }
            }

            clearTimeout(timeoutId);

            // Send notifications asynchronously without blocking the response
            // This prevents timeout issues from slow email delivery
            process.nextTick(async () => {
                try {
                    const notificationSupabase = await createSupabaseServerClient(true);

                    // Fetch simplified admin data
                    const { data: admins } = await notificationSupabase
                        .from('profiles')
                        .select('id, email, full_name')
                        .eq('role', 'Admin')
                        .eq('status', 'Active');

                    if (admins && Array.isArray(admins) && admins.length > 0) {
                        // Get user and gear data for the email  
                        const { data: userData } = await notificationSupabase
                            .from('profiles')
                            .select('full_name, email')
                            .eq('id', body.user_id)
                            .single();

                        const totalRequestedUnits = normalizedLines.reduce((sum, line) => sum + line.quantity, 0);
                        const gearSummary = totalRequestedUnits > 0
                            ? `${totalRequestedUnits} equipment unit(s)`
                            : 'Equipment requested';

                        const userName = userData?.full_name || 'User';
                        const userEmail = userData?.email || '';

                        // Send emails to all admins in parallel
                        const emailPromises = admins.map(admin => {
                            if (!admin.email) return Promise.resolve();

                            return sendGearRequestEmail({
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
                                                            ${userEmail ? `<tr><td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Email:</td><td style="padding: 8px 0; color: #1f2937;">${userEmail}</td></tr>` : ''}
                                                            <tr>
                                                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Equipment:</td>
                                                                <td style="padding: 8px 0; color: #1f2937;">${gearSummary}</td>
                                                            </tr>
                                                            ${body.reason ? `<tr><td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Reason:</td><td style="padding: 8px 0; color: #1f2937;">${body.reason}</td></tr>` : ''}
                                                            ${body.destination ? `<tr><td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Destination:</td><td style="padding: 8px 0; color: #1f2937;">${body.destination}</td></tr>` : ''}
                                                            ${body.expected_duration ? `<tr><td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Duration:</td><td style="padding: 8px 0; color: #1f2937;">${body.expected_duration}</td></tr>` : ''}
                                                        </table>
                                                    </div>
                                                    <div style="text-align: center; margin: 32px 0;">
                                                        <a href="https://nestbyeden.app/admin/manage-requests" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">Review Request</a>
                                                    </div>
                                                    <p style="margin-top: 32px; font-size: 14px; color: #6b7280; line-height: 1.6;">Please review this request and approve or reject it based on equipment availability.</p>
                                                </div>
                                                <div style="background-color: #f7fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                                                    <p style="margin: 0; font-size: 14px; color: #718096;">
                                                        This is an automated notification from Nest by Eden Oasis<br>
                                                        Equipment Management System
                                                    </p>
                                                </div>
                                            </div>
                                        </body>
                                    </html>
                                `
                            }).catch(err => {
                                console.error(`Failed to send email to ${admin.email}:`, err);
                            });
                        });

                        await Promise.allSettled(emailPromises);

                        const pushTitle = 'New Gear Request Submitted';
                        const pushMessage = `${userName} submitted a new gear request for ${gearSummary}.`;
                        const pushPromises = admins.map((admin) => {
                            if (!admin.id) return Promise.resolve();
                            return enqueuePushNotification(
                                notificationSupabase,
                                {
                                    userId: admin.id,
                                    title: pushTitle,
                                    body: pushMessage,
                                    data: {
                                        type: 'gear_request_created',
                                        request_id: requestData.id,
                                        requester_id: body.user_id,
                                    },
                                },
                                {
                                    requestUrl: request.url,
                                    triggerWorker: false,
                                    context: 'Gear Request Create',
                                }
                            );
                        });

                        await Promise.allSettled(pushPromises);
                        await triggerPushWorker({ requestUrl: request.url, context: 'Gear Request Create' });
                    }
                } catch (notificationError) {
                    console.error('Error sending notifications:', notificationError);
                }
            });

            // Return immediately with the created request ID
            return NextResponse.json(
                { 
                    data: {
                        id: requestData.id,
                        status: requestData.status,
                        created_at: requestData.created_at,
                        user_id: requestData.user_id
                    },
                    error: null 
                },
                { status: 201 }
            );
        } finally {
            clearTimeout(timeoutId);
        }
    } catch (error) {
        console.error('Unexpected error creating request:', error);
        return NextResponse.json(
            { 
                data: null, 
                error: error instanceof Error ? error.message : 'Failed to create request'
            },
            { status: 500 }
        );
    }
}
