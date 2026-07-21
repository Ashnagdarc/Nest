import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { enqueuePushNotification, triggerPushWorker } from '@/lib/push-queue';

function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getAuthenticatedContext() {
    const authSupabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
        return {
            errorResponse: NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
        };
    }

    const adminSupabase = await createSupabaseServerClient(true);
    const { data: profile } = await adminSupabase
        .from('profiles')
        .select('role, status')
        .eq('id', user.id)
        .maybeSingle();

    return {
        user,
        adminSupabase,
        isAdmin: profile?.role === 'Admin' && profile?.status === 'Active'
    };
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authContext = await getAuthenticatedContext();
        if ('errorResponse' in authContext) {
            return authContext.errorResponse;
        }

        const { id } = await params;
        if (!isUuid(id)) {
            return NextResponse.json({ data: null, error: 'Invalid request id' }, { status: 400 });
        }
        console.log('🔍 Fetching request details for ID:', id);
        const { adminSupabase: supabase, isAdmin, user } = authContext;

        // First, get the request with user profile data
        const { data: requestData, error: requestError } = await supabase
            .from('gear_requests')
            .select(`
        *,
        profiles:user_id (id, full_name, email),
        submitted_by:submitted_by_user_id (id, full_name, email)
      `)
            .eq('id', id)
            .maybeSingle();

        if (requestError) {
            console.error('❌ Error fetching request:', requestError);
            return NextResponse.json({ data: null, error: `Failed to fetch request: ${requestError.message}` }, { status: 500 });
        }

        if (!requestData) {
            console.error('❌ Request not found for ID:', id);
            return NextResponse.json({ data: null, error: 'Request not found' }, { status: 404 });
        }

        if (
            !isAdmin &&
            requestData.user_id !== user.id &&
            requestData.submitted_by_user_id !== user.id
        ) {
            return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
        }

        console.log('✅ Request found:', { id: requestData.id, status: requestData.status, userId: requestData.user_id });

        // Then, get the gear data from the junction table
        const { data: gearRequestGears, error: gearError } = await supabase
            .from('gear_request_gears')
            .select(`
        gear_id,
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
            .eq('gear_request_id', id);

        if (gearError) {
            console.error('❌ Error fetching gear data:', gearError);
            return NextResponse.json({ data: null, error: `Failed to fetch gear data: ${gearError.message}` }, { status: 500 });
        }

        console.log('✅ Gear data fetched:', gearRequestGears?.length || 0, 'items');

        // Extract gear names from junction table
        let gearNames: string[] = [];
        const lineItems: Array<{ id?: string; name: string; category?: string; serial_number?: string | null; quantity: number }> = [];
        if (gearRequestGears && Array.isArray(gearRequestGears)) {
            // Aggregate by name and count quantities (fallback to 1 if column missing)
            const counts: Record<string, number> = {};
            for (const item of gearRequestGears as Array<{ quantity?: number; gears?: { name?: string; category?: string; serial_number?: string | null } }>) {
                const nm = (item.gears?.name || '').trim();
                if (!nm) continue;
                const q = Math.max(1, Number(item.quantity ?? 1));
                counts[nm] = (counts[nm] || 0) + q;
            }
            gearNames = Object.entries(counts).map(([n, q]) => (q > 1 ? `${n} x ${q}` : n));

            // Build line items from the actual gear data
            for (const item of gearRequestGears as Array<{ quantity?: number; gears?: { id?: string; name?: string; category?: string; serial_number?: string | null } }>) {
                if (item.gears?.name) {
                    lineItems.push({
                        id: item.gears.id,
                        name: item.gears.name,
                        category: item.gears.category,
                        serial_number: item.gears.serial_number,
                        quantity: Math.max(1, Number(item.quantity ?? 1))
                    });
                }
            }
        }

        // If no gear names found from junction table, try to fetch from gear_ids
        if (gearNames.length === 0 && requestData.gear_ids && Array.isArray(requestData.gear_ids)) {
            const { data: gearsData, error: gearsError } = await supabase
                .from('gears')
                .select('id, name, category')
                .in('id', requestData.gear_ids);

            if (!gearsError && gearsData) {
                // Aggregate counts by name from concrete ids
                const counts: Record<string, number> = {};
                for (const g of gearsData) {
                    const nm = (g.name || '').trim();
                    if (!nm) continue;
                    counts[nm] = (counts[nm] || 0) + 1;
                }
                gearNames = Object.entries(counts).map(([n, q]) => (q > 1 ? `${n} x ${q}` : n));
                // Also produce lineItems for modal list
                lineItems.push(...gearsData.map(g => ({ id: g.id, name: g.name, category: g.category, serial_number: undefined, quantity: 1 })));
            }
        }

        // Add gear names and junction table data to the response
        const enrichedRequestData = {
            ...requestData,
            gearNames: gearNames,
            lineItems,
            gear_request_gears: gearRequestGears
        };

        console.log('✅ Successfully fetched request details with gear names:', gearNames);

        return NextResponse.json({ data: enrichedRequestData, error: null });
    } catch (error) {
        console.error('❌ Unexpected error in /api/requests/[id]:', error);
        return NextResponse.json({ data: null, error: 'Failed to fetch request details' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authContext = await getAuthenticatedContext();
        if ('errorResponse' in authContext) {
            return authContext.errorResponse;
        }

        if (!authContext.isAdmin) {
            return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        if (!isUuid(id)) {
            return NextResponse.json({ data: null, error: 'Invalid request id' }, { status: 400 });
        }
        const supabase = authContext.adminSupabase;
        const body = await request.json();

        // Only allow a narrow, explicit set of request fields to be updated from this endpoint.
        // This prevents accidental/manual lifecycle corruption (e.g., setting status=Completed without check-ins).
        const allowedStatus = new Set(['Pending', 'Approved', 'Rejected', 'Cancelled']);
        const rawStatus = typeof body?.status === 'string' ? body.status.trim() : undefined;
        const normalizedStatus = rawStatus
            ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase()
            : undefined;

        if (normalizedStatus === 'Completed') {
            return NextResponse.json(
                { data: null, error: 'Directly setting request status to Completed is not allowed. Complete via approved check-ins.' },
                { status: 400 }
            );
        }

        if (normalizedStatus && !allowedStatus.has(normalizedStatus)) {
            return NextResponse.json(
                { data: null, error: `Invalid status value: ${rawStatus}` },
                { status: 400 }
            );
        }

        const updatePayload: Record<string, unknown> = {};
        if (normalizedStatus) updatePayload.status = normalizedStatus;
        if (body?.admin_notes !== undefined) updatePayload.admin_notes = body.admin_notes;
        if (body?.due_date !== undefined) updatePayload.due_date = body.due_date;
        updatePayload.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('gear_requests')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return NextResponse.json({ data, error: null });
    } catch {
        return NextResponse.json({ data: null, error: 'Failed to update request' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authContext = await getAuthenticatedContext();
        if ('errorResponse' in authContext) {
            return authContext.errorResponse;
        }

        if (!authContext.isAdmin) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        if (!isUuid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid request id' }, { status: 400 });
        }
        const supabase = authContext.adminSupabase;

        // Get request details before deletion for notifications
        const { data: requestData, error: requestError } = await supabase
            .from('gear_requests')
            .select('user_id, status, reason, destination, gear_ids')
            .eq('id', id)
            .single();

        if (requestError || !requestData) {
            console.error('Request not found for cancellation:', requestError);
            return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
        }

        // Get gear names for notification
        let gearNames = 'Equipment';
        if (requestData.gear_ids && Array.isArray(requestData.gear_ids)) {
            const { data: gears } = await supabase
                .from('gears')
                .select('name')
                .in('id', requestData.gear_ids);

            if (gears && gears.length > 0) {
                const names = gears.map(g => g.name).filter(Boolean);
                if (names.length === 1) {
                    gearNames = names[0];
                } else if (names.length > 1) {
                    gearNames = `${names[0]} and ${names.length - 1} other item${names.length > 2 ? 's' : ''}`;
                }
            }
        }

        // Delete the request
        const { error } = await supabase.from('gear_requests').delete().eq('id', id);
        if (error) throw error;

        // Queue push notification for the user who cancelled
        if (requestData.user_id) {
            const pushTitle = 'Your Gear Request Was Cancelled';
            const pushMessage = `Your request for ${gearNames} has been cancelled.`;

            const queueResult = await enqueuePushNotification(
                {
                    userId: requestData.user_id,
                    title: pushTitle,
                    body: pushMessage,
                    data: { request_id: id, type: 'gear_request_cancelled' }
                },
                {
                    requestUrl: request.url,
                    triggerWorker: false,
                    context: 'Gear Request Cancel'
                }
            );

            if (!queueResult.success) {
                console.error('[Gear Request Cancel] Failed to queue push notification for user:', queueResult.error);
            } else {
                console.log('[Gear Request Cancel] Push notification queued for user');
            }
        }

        // Queue push notification for all admins
        const { data: admins } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'Admin')
            .eq('status', 'Active');

        if (admins && admins.length > 0) {
            const pushTitle = 'Gear Request Cancelled';
            const pushMessage = `A gear request has been cancelled by the user.`;

            for (const admin of admins) {
                const queueResult = await enqueuePushNotification(
                    {
                        userId: admin.id,
                        title: pushTitle,
                        body: pushMessage,
                        data: { request_id: id, type: 'gear_request_cancelled_admin' }
                    },
                    {
                        requestUrl: request.url,
                        triggerWorker: false,
                        context: 'Gear Request Cancel'
                    }
                );

                if (!queueResult.success) {
                    console.error(`[Gear Request Cancel] Failed to queue push notification for admin ${admin.id}:`, queueResult.error);
                }
            }
            await triggerPushWorker({ requestUrl: request.url, context: 'Gear Request Cancel' });
            console.log(`[Gear Request Cancel] Push notifications queued for ${admins.length} admins`);
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Failed to delete request:', err);
        return NextResponse.json({ success: false, error: 'Failed to delete request' }, { status: 500 });
    }
} 
