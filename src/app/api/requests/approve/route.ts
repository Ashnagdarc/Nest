import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { sendGearRequestApprovalEmail, sendGearRequestEmail } from '@/lib/email';
import { enqueuePushNotification } from '@/lib/push-queue';
import { createBookingAggregate } from '@/lib/bookings-v2/service';
import { randomUUID } from 'crypto';
import { getSiteUrl, sitePath } from '@/lib/site-url';

async function requireAdminContext() {
    const authSupabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
        return {
            errorResponse: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        };
    }

    // Cookie-backed clients send the admin's user JWT, so PostgREST runs as
    // authenticated. approve_gear_request_atomic is granted to service_role only.
    const adminSupabase = await createSupabaseAdminClient();
    const { data: profile, error: profileError } = await adminSupabase
        .from('profiles')
        .select('role, status')
        .eq('id', user.id)
        .maybeSingle();

    const isAdmin = !profileError && profile?.role === 'Admin' && profile?.status === 'Active';

    if (!isAdmin) {
        return {
            errorResponse: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
        };
    }

    return { adminSupabase, user };
}

/**
 * POST /api/requests/approve
 * 
 * Approves a gear request and updates inventory availability
 * 
 * Request body: { requestId: string }
 * 
 * Returns: { success: boolean, message?: string, error?: string }
 * 
 * Side effects:
 * - Updates request status to 'Approved'
 * - Decrements available_quantity for each requested gear
 * - Sets checkout_date and due_date on request
 * - Creates notification for requester
 * - Sends email confirmation
 * 
 * Security: Uses service role key to bypass RLS (admin-only operation)
 */
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
        });
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
        const adminContext = await requireAdminContext();
        if ('errorResponse' in adminContext) {
            return adminContext.errorResponse;
        }

        const { adminSupabase: supabase, user: adminUser } = adminContext;
        const { requestId } = await request.json();
        console.log('🔍 Approving request:', requestId);

        if (!requestId) {
            return fail(400, 'requestId is required', 'Invalid request payload.', 'REQUEST_ID_REQUIRED');
        }

        // Load request first
        const { data: req, error: reqErr } = await supabase
            .from('gear_requests')
            .select('id, user_id, submitted_by_user_id, status, due_date, expected_duration, reason, destination')
            .eq('id', requestId)
            .maybeSingle();
        if (reqErr || !req) {
            console.error('🔍 Request not found:', reqErr);
            return fail(404, `Request not found: ${reqErr?.message || ''}`, 'Request not found.', 'REQUEST_NOT_FOUND');
        }

        console.log('🔍 Request found:', req);

        // Then load gear request gears separately
        const { data: gearRequestGears, error: gearErr } = await supabase
            .from('gear_request_gears')
            .select('gear_id, quantity')
            .eq('gear_request_id', requestId);
        if (gearErr) {
            console.error('🔍 Failed to load gear data:', gearErr);
            return fail(500, `Failed to load gear data: ${gearErr.message}`, 'Could not load request items.', 'REQUEST_ITEMS_LOAD_FAILED');
        }

        console.log('🔍 Gear request gears:', gearRequestGears);

        if (req.status === 'Approved') {
            return ok({ user_message: 'Request is already approved.' });
        }

        const lines: Array<{ gear_id: string; quantity: number }> = Array.isArray(gearRequestGears)
            ? gearRequestGears.map((l: { gear_id: string; quantity?: number }) => ({ gear_id: l.gear_id, quantity: Math.max(1, Number(l.quantity ?? 1)) }))
            : [];

        if (lines.length === 0) {
            return fail(400, 'No line items recorded for this request.', 'This request has no items to approve.', 'REQUEST_HAS_NO_ITEMS');
        }

        // The booking row has to exist before the locked checkout so stock,
        // request status, and the booking return time commit together.
        try {
            let { data: aggregate } = await (supabase as any)
                .from('bookings')
                .select('id,status')
                .eq('source_type', 'gear_request')
                .eq('source_id', requestId)
                .maybeSingle();

            if (!aggregate?.id) {
                await createBookingAggregate({
                    sourceType: 'gear_request',
                    sourceId: requestId,
                    requesterId: req.user_id,
                    startAt: new Date().toISOString(),
                    endAt: null,
                    idempotencyKey: `legacy-gear-create:${requestId}`,
                    metadata: {
                        reason: req.reason || null,
                        destination: req.destination || null,
                        expected_duration: req.expected_duration || null,
                    },
                    items: lines.map((line) => ({
                        itemType: 'gear' as const,
                        gearId: line.gear_id,
                        quantity: line.quantity,
                    })),
                });
            }
        } catch (syncError) {
            console.error('[Gear Approval] Failed to prepare booking:', syncError);
            return fail(500, 'Failed to prepare booking.', 'We could not complete approval right now. Please try again.', 'BOOKING_LIFECYCLE_SYNC_FAILED');
        }

        const { data: approval, error: approvalError } = await (supabase as any).rpc('approve_gear_request_atomic', {
            p_request_id: requestId,
            p_actor_id: adminUser.id,
        });

        if (approvalError) {
            const message = approvalError.message || 'Approval failed';
            console.error('[Gear Approval] Atomic checkout failed:', message);
            if (message.includes('INSUFFICIENT')) {
                return fail(409, message, 'Some items are no longer available for checkout.', 'INSUFFICIENT_GEAR_QUANTITY');
            }
            if (message.includes('NO_ITEMS')) {
                return fail(400, message, 'This request has no items to approve.', 'REQUEST_HAS_NO_ITEMS');
            }
            if (message.includes('NOT_PENDING')) {
                return fail(409, message, 'This request can no longer be approved.', 'REQUEST_NOT_PENDING');
            }
            return fail(500, message, 'We could not complete approval right now. Please try again.', 'GEAR_AVAILABILITY_UPDATE_FAILED');
        }

        if (approval?.idempotent) {
            return ok({ user_message: 'Request is already approved.' });
        }

        const calculatedDueDate = typeof approval?.due_date === 'string'
            ? approval.due_date
            : new Date().toISOString();

        // Status history table not present; relying on gear_requests.approved_at/updated_at fields

        // Send approval email to user
        try {
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('id', req.user_id)
                .single();

            if (userProfile?.email) {
                // Fetch gear names and quantities from junction table
                const gearListFormatted: Array<{ name: string; quantity: number }> = [];
                for (const line of lines) {
                    const { data: gear } = await supabase
                        .from('gears')
                        .select('name')
                        .eq('id', line.gear_id)
                        .single();
                    if (gear) {
                        gearListFormatted.push({ name: gear.name, quantity: line.quantity });
                    }
                }

                await sendGearRequestApprovalEmail({
                    to: userProfile.email,
                    userName: userProfile.full_name || 'User',
                    gearList: gearListFormatted,
                    dueDate: calculatedDueDate,
                    requestId: requestId,
                    reason: req.expected_duration ? `${req.expected_duration}` : undefined,
                    destination: req.destination || undefined,
                });

                // Queue push notification for the user
                const gearNames = gearListFormatted.map(g => `${g.name} (x${g.quantity})`).join(', ') || 'Equipment';
                const pushTitle = 'Your Gear Request Was Approved!';
                const pushMessage = `Your request for ${gearNames} has been approved. Due back: ${new Date(calculatedDueDate).toLocaleDateString()}.`;

                const queueResult = await enqueuePushNotification(
                    {
                        userId: req.user_id,
                        title: pushTitle,
                        body: pushMessage,
                        data: { request_id: requestId, type: 'gear_approval' }
                    },
                    {
                        requestUrl: request.url,
                        context: 'Gear Approval'
                    }
                );

                if (!queueResult.success) {
                    console.error('[Gear Approval] Failed to queue push notification:', queueResult.error);
                } else {
                    console.log('[Gear Approval] Push notification queued for user');
                }

                const approvalNotice = `Your request for ${gearNames} was approved by an admin. Due back: ${new Date(calculatedDueDate).toLocaleDateString()}.`;
                await supabase.from('notifications').insert({
                    user_id: req.user_id,
                    title: 'Request approved',
                    message: approvalNotice,
                    type: 'System',
                    is_read: false,
                });

                // The booker and the person who will use the equipment are often different.
                // Push alone is not enough: it dies when that person has no device token.
                if (req.submitted_by_user_id && req.submitted_by_user_id !== req.user_id) {
                    const { data: submitterProfile } = await supabase
                        .from('profiles')
                        .select('email, full_name')
                        .eq('id', req.submitted_by_user_id)
                        .maybeSingle();

                    await supabase.from('notifications').insert({
                        user_id: req.submitted_by_user_id,
                        title: 'Booking you submitted was approved',
                        message: `The request you submitted for ${userProfile.full_name || 'a colleague'} was approved. Due back: ${new Date(calculatedDueDate).toLocaleDateString()}.`,
                        type: 'System',
                        is_read: false,
                    });

                    if (submitterProfile?.email && submitterProfile.email !== userProfile.email) {
                        await sendGearRequestApprovalEmail({
                            to: submitterProfile.email,
                            userName: submitterProfile.full_name || 'User',
                            gearList: gearListFormatted,
                            dueDate: calculatedDueDate,
                            requestId,
                            reason: req.expected_duration ? `${req.expected_duration}` : undefined,
                            destination: req.destination || undefined,
                        });
                    }

                    const submitterPush = await enqueuePushNotification(
                        {
                            userId: req.submitted_by_user_id,
                            title: 'Booking you submitted was approved',
                            body: `The request you submitted for ${userProfile.full_name || 'a colleague'} was approved.`,
                            data: { request_id: requestId, type: 'gear_approval_submitter' },
                        },
                        { requestUrl: request.url, context: 'Gear Approval Submitter' },
                    );
                    if (!submitterPush.success) {
                        console.error('[Gear Approval] Failed to queue submitter push:', submitterPush.error);
                    }
                }

                // Send notification email to all admins about the approval
                try {
                    const { data: admins } = await supabase
                        .from('profiles')
                        .select('email, full_name')
                        .eq('role', 'Admin')
                        .eq('status', 'Active');
                    
                    console.log(`[Gear Approval] Found ${admins?.length || 0} admins to notify`);
                    
                    if (admins && Array.isArray(admins)) {
                        const gearNames = gearListFormatted.map(g => `${g.name} (x${g.quantity})`).join(', ') || 'Gear items';
                        const userName = userProfile.full_name || 'User';

                        for (const admin of admins) {
                            console.log(`[Gear Approval] Processing admin: ${admin.email}`);
                            if (admin.email) {
                                try {
                                    console.log(`[Gear Approval] Sending email to: ${admin.email}`);
                                    await sendGearRequestEmail({
                                        to: admin.email,
                                        subject: `✅ Gear Request Approved - ${userName}`,
                                        html: `
                                            <!DOCTYPE html>
                                            <html>
                                                <head>
                                                    <meta charset="utf-8">
                                                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                                </head>
                                                <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
                                                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                                                        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px 40px; text-align: center;">
                                                            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">✅ Gear Request Approved</h1>
                                                            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Equipment ready for pickup</p>
                                                        </div>
                                                        <div style="padding: 40px; line-height: 1.6; color: #333;">
                                                            <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">Hello ${admin.full_name || 'Admin'},</h2>
                                                            <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151;">A gear request has been approved.</p>
                                                            <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 4px;">
                                                                <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #166534;">Approval Details</h3>
                                                                <table style="width: 100%; border-collapse: collapse;">
                                                                    <tr>
                                                                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">User:</td>
                                                                        <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${userName}</td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Equipment:</td>
                                                                        <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${gearNames}</td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Due Date:</td>
                                                                        <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${new Date(calculatedDueDate).toLocaleDateString()}</td>
                                                                    </tr>
                                                                    ${req.destination ? `
                                                                    <tr>
                                                                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Destination:</td>
                                                                        <td style="padding: 8px 0; color: #1f2937;">${req.destination}</td>
                                                                    </tr>
                                                                    ` : ''}
                                                                </table>
                                                            </div>
                                                            <div style="text-align: center; margin: 32px 0;">
                                                                <a href="${sitePath('/admin/manage-requests')}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">View All Requests</a>
                                                            </div>
                                                            <p style="margin-top: 32px; font-size: 14px; color: #6b7280; line-height: 1.6;">User has been notified and can now pick up the equipment.</p>
                                                        </div>
                                                        <div style="background-color: #f7fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                                                            <p style="margin: 0; font-size: 14px; color: #718096;">
                                                                This is an automated notification from <a href="${getSiteUrl()}" style="color: #10b981; text-decoration: none;"><strong>Nest by Eden Oasis</strong></a><br>
                                                                Equipment Management System
                                                            </p>
                                                        </div>
                                                    </div>
                                                </body>
                                            </html>
                                        `
                                    });
                                    console.log(`[Gear Approval] ✅ Email sent successfully to: ${admin.email}`);
                                } catch (adminEmailError) {
                                    console.error(`[Gear Approval] ❌ Failed to send approval email to admin ${admin.email}:`, adminEmailError);
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('[Gear Approval] Error fetching admins or sending notifications:', e);
                }
            }
        } catch (emailError) {
            console.warn('Failed to send gear approval email:', emailError);
            // Don't fail the request if email fails
        }

        console.log('🔍 Request approved successfully:', { requestId, due_date: calculatedDueDate });
        return ok({ user_message: 'Request approved successfully.' });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('🔍 Error in approve API:', msg);
        return fail(500, msg, 'We could not complete approval right now. Please try again.', 'REQUEST_APPROVAL_UNEXPECTED_ERROR');
    }
}
