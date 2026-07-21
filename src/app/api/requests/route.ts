import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendGearRequestEmail, sendEquipmentBookedForYouEmail, sendRequestReceivedEmail } from '@/lib/email';
import { enqueuePushNotification, triggerPushWorker } from '@/lib/push-queue';
import { createBookingAggregate } from '@/lib/bookings-v2/service';
import { randomUUID } from 'crypto';
import { sitePath } from '@/lib/site-url';

function toUserFriendlyRequestError(message?: string) {
    const raw = (message || '').toLowerCase();
    if (raw.includes('permission denied') && raw.includes('is_admin')) {
        return 'We could not complete your request right now due to a system permission issue. Our team has been notified. Please try again shortly.';
    }
    if (raw.includes('violates row-level security') || raw.includes('row-level security')) {
        return 'We could not complete your request due to an access policy issue. Please try again shortly.';
    }
    if (raw.includes('foreign key')) {
        return 'Some selected items are no longer available. Please review your selection and try again.';
    }
    return 'We could not complete your request right now. Please try again.';
}

async function requireAuthenticatedUser() {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            errorResponse: NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
        };
    }

    return { user };
}

async function requireAdminUser() {
    const authContext = await requireAuthenticatedUser();
    if ('errorResponse' in authContext) {
        return authContext;
    }

    const adminSupabase = await createSupabaseServerClient(true);
    const { data: profile, error: profileError } = await adminSupabase
        .from('profiles')
        .select('role, status')
        .eq('id', authContext.user.id)
        .maybeSingle();

    const isAdmin = !profileError && profile?.role === 'Admin' && profile?.status === 'Active';

    if (!isAdmin) {
        return {
            errorResponse: NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
        };
    }

    return { adminSupabase, user: authContext.user };
}

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Admin requests API called');
        const adminContext = await requireAdminUser();
        if ('errorResponse' in adminContext) {
            return adminContext.errorResponse;
        }

        const { adminSupabase: supabase } = adminContext;

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
                    email,
                    avatar_url
                ),
                submitted_by:submitted_by_user_id (
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
    const correlationId = randomUUID();
    const ok = (payload: { booking?: unknown; items?: unknown[]; warnings?: string[]; user_message?: string } = {}) =>
        NextResponse.json({
            success: true,
            booking: payload.booking ?? null,
            items: payload.items ?? [],
            warnings: payload.warnings ?? [],
            user_message: payload.user_message ?? null,
            error_code: null,
            correlation_id: correlationId,
        }, { status: 201 });
    const fail = (status: number, error: string, userMessage: string, errorCode: string) =>
        NextResponse.json({
            success: false,
            booking: null,
            items: [],
            warnings: [],
            user_message: userMessage,
            error_code: errorCode,
            correlation_id: correlationId,
            error,
        }, { status });

    try {
        // Wrap in timeout to prevent hanging queries (30 second max)
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 30000);

        try {
            const authContext = await requireAuthenticatedUser();
            if ('errorResponse' in authContext) {
                return authContext.errorResponse;
            }

            const requesterId = authContext.user.id;

            // Create Supabase client with admin privileges
            const supabase = await createSupabaseServerClient(true);

            // Parse the request body
            const body = await request.json();
            const clientSubmissionId = typeof body.client_submission_id === 'string'
                ? body.client_submission_id.trim()
                : '';
            const bookedForUserId = typeof body.booked_for_user_id === 'string'
                ? body.booked_for_user_id.trim()
                : '';

            // user_id = who the equipment is for; submitted_by = who filled the form (if different)
            let ownerUserId = requesterId;
            let submittedByUserId: string | null = null;

            if (bookedForUserId && bookedForUserId !== requesterId) {
                const { data: bookedForProfile, error: bookedForError } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, status')
                    .eq('id', bookedForUserId)
                    .maybeSingle();

                if (bookedForError || !bookedForProfile) {
                    return fail(400, 'Invalid booked_for_user_id', 'The selected person could not be found. Please choose someone else.', 'REQUEST_VALIDATION_FAILED');
                }
                if (bookedForProfile.status && bookedForProfile.status !== 'Active') {
                    return fail(400, 'Inactive booked_for user', 'The selected person is not an active user.', 'REQUEST_VALIDATION_FAILED');
                }

                ownerUserId = bookedForUserId;
                submittedByUserId = requesterId;
            }

            // Validate required fields
            if (!body.reason) {
                return fail(400, 'Missing required field: reason', 'Please provide required fields and try again.', 'REQUEST_VALIDATION_FAILED');
            }

            if (clientSubmissionId) {
                let duplicateQuery = supabase
                    .from('gear_requests')
                    .select('id, status, created_at, user_id, submitted_by_user_id')
                    .eq('client_submission_id', clientSubmissionId);

                duplicateQuery = submittedByUserId
                    ? duplicateQuery.eq('submitted_by_user_id', submittedByUserId)
                    : duplicateQuery.eq('user_id', requesterId);

                const { data: existingRequest, error: existingRequestError } = await duplicateQuery.maybeSingle();

                if (existingRequestError) {
                    return fail(500, `Failed to check for duplicate submission: ${existingRequestError.message}`, 'We could not verify your request right now. Please try again.', 'REQUEST_DUPLICATE_CHECK_FAILED');
                }

                if (existingRequest) {
                    clearTimeout(timeoutId);
                    return ok({
                        booking: {
                            id: existingRequest.id,
                            status: existingRequest.status,
                            created_at: existingRequest.created_at,
                            user_id: existingRequest.user_id,
                        },
                        warnings: ['Existing request returned for duplicate submission key.'],
                        user_message: 'Request already submitted.',
                    });
                }
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
                return fail(400, 'At least one equipment line is required', 'Add at least one item to continue.', 'REQUEST_VALIDATION_FAILED');
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
                    user_id: ownerUserId,
                    submitted_by_user_id: submittedByUserId,
                    reason: body.reason,
                    destination: body.destination || null,
                    expected_duration: body.expected_duration || null,
                    team_members: body.team_members || null,
                    status: body.status || 'Pending',
                    due_date: body.due_date || null,
                    client_submission_id: clientSubmissionId || null,
                })
                .select('id, status, created_at, user_id, submitted_by_user_id')
                .single();

            // Handle database errors
            if (requestError) {
                if (clientSubmissionId && requestError.code === '23505') {
                    let raceQuery = supabase
                        .from('gear_requests')
                        .select('id, status, created_at, user_id, submitted_by_user_id')
                        .eq('client_submission_id', clientSubmissionId);

                    raceQuery = submittedByUserId
                        ? raceQuery.eq('submitted_by_user_id', submittedByUserId)
                        : raceQuery.eq('user_id', requesterId);

                    const { data: existingRequest } = await raceQuery.maybeSingle();

                    if (existingRequest) {
                        clearTimeout(timeoutId);
                        return ok({
                            booking: {
                                id: existingRequest.id,
                                status: existingRequest.status,
                                created_at: existingRequest.created_at,
                                user_id: existingRequest.user_id,
                            },
                            warnings: ['Existing request returned after duplicate submission race.'],
                            user_message: 'Request already submitted.',
                        });
                    }
                }
                console.error('Error creating request:', requestError);
                clearTimeout(timeoutId);
                return fail(500, `Failed to create request: ${requestError.message}`, toUserFriendlyRequestError(requestError.message), 'REQUEST_CREATE_FAILED');
            }

            // Insert gear lines (validated above)
            if (normalizedLines.length > 0) {
                const gearLines = normalizedLines.map((line: { gear_id: string; quantity?: number }) => ({
                    gear_request_id: requestData.id,
                    gear_id: line.gear_id,
                    quantity: Math.max(1, line.quantity || 1) // Ensure quantity >= 1
                }));

                const { error: linesError, data: linesData } = await supabase
                    .from('gear_request_gears')
                    .insert(gearLines);

                if (linesError) {
                    console.error('Error inserting gear lines:', linesError, 'Payload:', gearLines, 'Request ID:', requestData.id);
                    clearTimeout(timeoutId);
                    // Delete the request if lines insertion fails
                    const { error: deleteError, data: deleteData } = await supabase
                        .from('gear_requests')
                        .delete()
                        .eq('id', requestData.id);
                    if (deleteError) {
                        console.error('Failed to rollback request:', deleteError, 'Request ID:', requestData.id);
                    } else {
                        console.log('Rollback successful:', deleteData, 'Request ID:', requestData.id);
                    }

                    return fail(500, `Failed to add equipment to request: ${linesError.message}`, toUserFriendlyRequestError(linesError.message), 'REQUEST_LINES_INSERT_FAILED');
                } else {
                    console.log('Gear lines inserted successfully:', linesData, 'Payload:', gearLines, 'Request ID:', requestData.id);
                }
            }

            // V2 lifecycle synchronization: create aggregate booking and line items.
            try {
                await createBookingAggregate({
                    sourceType: 'gear_request',
                    sourceId: requestData.id,
                    requesterId: requestData.user_id,
                    startAt: requestData.created_at,
                    endAt: body.due_date || null,
                    idempotencyKey: `legacy-gear-create:${requestData.id}`,
                    metadata: {
                        reason: body.reason || null,
                        destination: body.destination || null,
                        expected_duration: body.expected_duration || null,
                    },
                    items: normalizedLines.map((line) => ({
                        itemType: 'gear' as const,
                        gearId: line.gear_id,
                        quantity: line.quantity,
                    })),
                });
            } catch (syncError) {
                console.error('[Requests] Failed to create v2 booking aggregate. Rolling back legacy request.', syncError);
                await supabase.from('gear_request_gears').delete().eq('gear_request_id', requestData.id);
                await supabase.from('gear_requests').delete().eq('id', requestData.id);
                clearTimeout(timeoutId);
                return fail(500, 'Failed to initialize booking lifecycle.', 'We could not complete your booking right now. Please try again.', 'BOOKING_V2_CREATE_FAILED');
            }

            clearTimeout(timeoutId);

            // Send notifications asynchronously without blocking the response
            // This prevents timeout issues from slow email delivery
            process.nextTick(async () => {
                try {
                    const notificationSupabase = await createSupabaseAdminClient();
                    const gearNames = normalizedLines
                        .map((line) => gearMap.get(line.gear_id)?.name)
                        .filter((name): name is string => Boolean(name));
                    const gearListText = gearNames
                        .map((name, idx) => `${idx + 1}. ${name}`)
                        .join('\n');
                    const gearSummary = gearNames.length > 0
                        ? gearNames.join(', ')
                        : 'Equipment requested';

                    const [{ data: submitterProfile }, { data: ownerProfile }] = await Promise.all([
                        notificationSupabase
                            .from('profiles')
                            .select('id, full_name, email')
                            .eq('id', requesterId)
                            .maybeSingle(),
                        notificationSupabase
                            .from('profiles')
                            .select('id, full_name, email')
                            .eq('id', requestData.user_id)
                            .maybeSingle(),
                    ]);

                    const submitterName = submitterProfile?.full_name || 'User';
                    const ownerName = ownerProfile?.full_name || 'User';
                    const isOnBehalfBooking = Boolean(submittedByUserId && submittedByUserId !== requestData.user_id);

                    // In-app + push for the person the equipment is for
                    if (ownerProfile?.id) {
                        await notificationSupabase.from('notifications').insert({
                            user_id: ownerProfile.id,
                            title: isOnBehalfBooking ? 'Equipment Booked For You' : 'Equipment Request Submitted',
                            message: isOnBehalfBooking
                                ? `${submitterName} booked equipment for you: ${gearSummary}`
                                : `Your equipment request was submitted: ${gearSummary}`,
                            type: 'System',
                            is_read: false,
                        });

                        if (ownerProfile.email) {
                            if (isOnBehalfBooking) {
                                await sendEquipmentBookedForYouEmail({
                                    to: ownerProfile.email,
                                    recipientName: ownerName,
                                    bookerName: submitterName,
                                    gearList: gearListText,
                                    reason: body.reason,
                                    destination: body.destination,
                                    duration: body.expected_duration,
                                    requestId: requestData.id,
                                }).catch((err) => console.error('Booked-for email failed:', err));
                            } else {
                                await sendRequestReceivedEmail({
                                    to: ownerProfile.email,
                                    userName: ownerName,
                                    gearList: gearSummary,
                                }).catch((err) => console.error('Request received email failed:', err));
                            }
                        }

                        await enqueuePushNotification(
                            {
                                userId: ownerProfile.id,
                                title: isOnBehalfBooking ? 'Equipment booked for you' : 'Request submitted',
                                body: isOnBehalfBooking
                                    ? `${submitterName} booked equipment for you.`
                                    : `Your equipment request is under review.`,
                                data: {
                                    type: isOnBehalfBooking ? 'gear_booked_for_you' : 'gear_request_created',
                                    request_id: requestData.id,
                                },
                            },
                            { requestUrl: request.url, triggerWorker: false, context: 'Gear Request Create' },
                        );
                    }

                    // Confirmation for submitter when booking for someone else
                    if (isOnBehalfBooking && submitterProfile?.email) {
                        await sendRequestReceivedEmail({
                            to: submitterProfile.email,
                            userName: submitterName,
                            gearList: `${gearSummary} (for ${ownerName})`,
                        }).catch((err) => console.error('Submitter confirmation email failed:', err));
                    }

                    const { data: admins } = await notificationSupabase
                        .from('profiles')
                        .select('id, email, full_name')
                        .eq('role', 'Admin')
                        .eq('status', 'Active');

                    if (admins && admins.length > 0) {
                        const emailPromises = admins.map((admin) => {
                            if (!admin.email) return Promise.resolve();

                            return sendGearRequestEmail({
                                to: admin.email,
                                subject: `New Gear Request - ${isOnBehalfBooking ? ownerName : submitterName}`,
                                html: `
                                    <p>Hello ${admin.full_name || 'Admin'},</p>
                                    <p>A new gear request requires your review.</p>
                                    <ul>
                                        <li><strong>Equipment for:</strong> ${ownerName}</li>
                                        ${isOnBehalfBooking ? `<li><strong>Submitted by:</strong> ${submitterName}</li>` : ''}
                                        <li><strong>Items:</strong> ${gearSummary}</li>
                                        ${body.reason ? `<li><strong>Reason:</strong> ${body.reason}</li>` : ''}
                                        ${body.destination ? `<li><strong>Destination:</strong> ${body.destination}</li>` : ''}
                                    </ul>
                                    <p><a href="${sitePath('/admin/manage-requests')}">Review request</a></p>
                                `,
                            }).catch((err) => console.error(`Failed to send email to ${admin.email}:`, err));
                        });

                        await Promise.allSettled(emailPromises);

                        const pushTitle = 'New Gear Request';
                        const pushMessage = isOnBehalfBooking
                            ? `${submitterName} submitted a request for ${ownerName}: ${gearSummary}`
                            : `${submitterName} submitted a new gear request for ${gearSummary}.`;

                        await Promise.allSettled(
                            admins.map((admin) => {
                                if (!admin.id) return Promise.resolve();
                                return enqueuePushNotification(
                                    {
                                        userId: admin.id,
                                        title: pushTitle,
                                        body: pushMessage,
                                        data: {
                                            type: 'gear_request_created',
                                            request_id: requestData.id,
                                            requester_id: requestData.user_id,
                                            submitted_by_user_id: submittedByUserId,
                                        },
                                    },
                                    { requestUrl: request.url, triggerWorker: false, context: 'Gear Request Create' },
                                );
                            }),
                        );
                        await triggerPushWorker({ requestUrl: request.url, context: 'Gear Request Create' });
                    }
                } catch (notificationError) {
                    console.error('Error sending notifications:', notificationError);
                }
            });

            // Return immediately with the created request ID
            return ok({
                booking: {
                    id: requestData.id,
                    status: requestData.status,
                    created_at: requestData.created_at,
                    user_id: requestData.user_id
                },
                user_message: 'Request created successfully.',
            });
        } finally {
            clearTimeout(timeoutId);
        }
    } catch (error) {
        console.error('Unexpected error creating request:', error);
        return fail(500, error instanceof Error ? error.message : 'Failed to create request', 'We could not complete your booking right now. Please try again.', 'REQUEST_CREATE_UNEXPECTED_ERROR');
    }
}
