import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendGearRequestRejectionEmail, sendGearRequestEmail } from '@/lib/email';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { enqueuePushNotification } from '@/lib/push-queue';
import { transitionBooking } from '@/lib/bookings-v2/service';
import { createBookingAggregate } from '@/lib/bookings-v2/service';
import { randomUUID } from 'crypto';

async function requireAdminContext() {
    const authSupabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
        return {
            errorResponse: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        };
    }

    const adminSupabase = await createSupabaseServerClient(true);
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

export async function POST(req: Request) {
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
        const { requestId, reason } = await req.json();
        if (!requestId || typeof requestId !== 'string') {
            return fail(400, 'Missing requestId', 'Invalid request payload.', 'REQUEST_ID_REQUIRED');
        }

        // Fetch request details first for email
        const { data: requestData } = await supabase
            .from('gear_requests')
            .select('user_id, reason, destination')
            .eq('id', requestId)
            .single();

        try {
            const { data: gearRequestGears } = await supabase
                .from('gear_request_gears')
                .select('gear_id, quantity')
                .eq('gear_request_id', requestId);

            let { data: aggregate } = await (supabase as any)
                .from('bookings')
                .select('id')
                .eq('source_type', 'gear_request')
                .eq('source_id', requestId)
                .maybeSingle();

            if (!aggregate?.id && requestData?.user_id) {
                await createBookingAggregate({
                    sourceType: 'gear_request',
                    sourceId: requestId,
                    requesterId: requestData.user_id,
                    startAt: new Date().toISOString(),
                    endAt: null,
                    idempotencyKey: `legacy-gear-create:${requestId}`,
                    metadata: {
                        reason: requestData.reason || null,
                        destination: requestData.destination || null,
                    },
                    items: (gearRequestGears || []).map((line: { gear_id: string; quantity?: number }) => ({
                        itemType: 'gear' as const,
                        gearId: line.gear_id,
                        quantity: Math.max(1, Number(line.quantity ?? 1)),
                    })),
                });

                const { data: createdAggregate } = await (supabase as any)
                    .from('bookings')
                    .select('id')
                    .eq('source_type', 'gear_request')
                    .eq('source_id', requestId)
                    .maybeSingle();
                aggregate = createdAggregate;
            }

            if (aggregate?.id) {
                await transitionBooking({
                    bookingId: aggregate.id,
                    nextStatus: 'failed',
                    changedBy: adminUser.id,
                    reason: reason || 'Request rejected via legacy route',
                    metadata: { legacy_route: '/api/requests/reject' },
                    idempotencyKey: `legacy-reject:${requestId}`,
                });
            }
        } catch (syncError) {
            console.error('[Gear Rejection] Failed syncing status to v2 booking lifecycle:', syncError);
            return fail(500, 'Failed to update booking lifecycle state.', 'We could not complete rejection right now. Please try again.', 'BOOKING_LIFECYCLE_SYNC_FAILED');
        }

        const { error } = await supabase
            .from('gear_requests')
            .update({
                admin_notes: reason ?? null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', requestId);

        if (error) {
            return fail(400, error.message, 'Could not save rejection note.', 'REQUEST_REJECTION_PERSIST_FAILED');
        }

        // Send rejection email to user
        try {
            if (requestData?.user_id) {
                // Get user profile
                const { data: userProfile } = await supabase
                    .from('profiles')
                    .select('email, full_name')
                    .eq('id', requestData.user_id)
                    .single();

                if (userProfile?.email) {
                    // Get admin client to fetch gear details
                    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
                    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
                    const adminSupabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
                        auth: { autoRefreshToken: false, persistSession: false }
                    });

                    // Fetch gear names from junction table
                    const { data: gearRequestGears } = await adminSupabase
                        .from('gear_request_gears')
                        .select('gear_id, quantity')
                        .eq('gear_request_id', requestId);

                    const gearListFormatted: Array<{ name: string; quantity: number }> = [];
                    if (gearRequestGears) {
                        for (const grg of gearRequestGears) {
                            const { data: gear } = await adminSupabase
                                .from('gears')
                                .select('name')
                                .eq('id', grg.gear_id)
                                .single();
                            if (gear) {
                                gearListFormatted.push({ 
                                    name: gear.name, 
                                    quantity: Math.max(1, Number(grg.quantity ?? 1))
                                });
                            }
                        }
                    }

                    await sendGearRequestRejectionEmail({
                        to: userProfile.email,
                        userName: userProfile.full_name || 'User',
                        gearList: gearListFormatted,
                        reason: reason || undefined,
                        requestReason: requestData.reason || undefined,
                        destination: requestData.destination || undefined,
                    });

                    // Queue push notification for the user
                    const gearNames = gearListFormatted.map((g: { name: string; quantity: number }) => `${g.name} (x${g.quantity})`).join(', ') || 'Equipment';
                    const pushTitle = 'Your Gear Request Was Rejected';
                    const pushMessage = `Your request for ${gearNames} has been rejected.${reason ? ` Reason: ${reason}` : ''}`;

                    const queueResult = await enqueuePushNotification(
                        adminSupabase,
                        {
                            userId: requestData.user_id,
                            title: pushTitle,
                            body: pushMessage,
                            data: { request_id: requestId, type: 'gear_rejection' }
                        },
                        {
                            requestUrl: req.url,
                            context: 'Gear Rejection'
                        }
                    );

                    if (!queueResult.success) {
                        console.error('[Gear Rejection] Failed to queue push notification:', queueResult.error);
                    } else {
                        console.log('[Gear Rejection] Push notification queued for user');
                    }

                    // Send notification email to all admins about the rejection
                    try {
                        const { data: admins } = await adminSupabase
                            .from('profiles')
                            .select('email, full_name')
                            .eq('role', 'Admin')
                            .eq('status', 'Active');
                        
                        console.log(`[Gear Rejection] Found ${admins?.length || 0} admins to notify`);
                        
                        if (admins && Array.isArray(admins)) {
                            const gearNames = gearListFormatted.map((g: { name: string; quantity: number }) => `${g.name} (x${g.quantity})`).join(', ') || 'Gear items';
                            const userName = userProfile.full_name || 'User';

                            for (const admin of admins) {
                                console.log(`[Gear Rejection] Processing admin: ${admin.email}`);
                                if (admin.email) {
                                    try {
                                        console.log(`[Gear Rejection] Sending email to: ${admin.email}`);
                                        await sendGearRequestEmail({
                                            to: admin.email,
                                            subject: `❌ Gear Request Rejected - ${userName}`,
                                            html: `
                                                <!DOCTYPE html>
                                                <html>
                                                    <head>
                                                        <meta charset="utf-8">
                                                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                                    </head>
                                                    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
                                                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                                                            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px 40px; text-align: center;">
                                                                <h1 style="margin: 0; font-size: 24px; font-weight: 600;">❌ Gear Request Rejected</h1>
                                                                <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Request declined</p>
                                                            </div>
                                                            <div style="padding: 40px; line-height: 1.6; color: #333;">
                                                                <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">Hello ${admin.full_name || 'Admin'},</h2>
                                                                <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151;">A gear request has been rejected.</p>
                                                                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px;">
                                                                    <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #991b1b;">Rejection Details</h3>
                                                                    <table style="width: 100%; border-collapse: collapse;">
                                                                        <tr>
                                                                            <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">User:</td>
                                                                            <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${userName}</td>
                                                                        </tr>
                                                                        <tr>
                                                                            <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Equipment:</td>
                                                                            <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${gearNames}</td>
                                                                        </tr>
                                                                        ${reason ? `
                                                                        <tr>
                                                                            <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Rejection Reason:</td>
                                                                            <td style="padding: 8px 0; color: #1f2937;">${reason}</td>
                                                                        </tr>
                                                                        ` : ''}
                                                                        ${requestData.destination ? `
                                                                        <tr>
                                                                            <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Destination:</td>
                                                                            <td style="padding: 8px 0; color: #1f2937;">${requestData.destination}</td>
                                                                        </tr>
                                                                        ` : ''}
                                                                    </table>
                                                                </div>
                                                                <div style="text-align: center; margin: 32px 0;">
                                                                    <a href="https://nestbyeden.app/admin/manage-requests" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">View All Requests</a>
                                                                </div>
                                                                <p style="margin-top: 32px; font-size: 14px; color: #6b7280; line-height: 1.6;">User has been notified of the rejection.</p>
                                                            </div>
                                                            <div style="background-color: #f7fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                                                                <p style="margin: 0; font-size: 14px; color: #718096;">
                                                                    This is an automated notification from <a href="https://nestbyeden.app" style="color: #ef4444; text-decoration: none;"><strong>Nest by Eden Oasis</strong></a><br>
                                                                    Equipment Management System
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </body>
                                                </html>
                                            `
                                        });
                                        console.log(`[Gear Rejection] ✅ Email sent successfully to: ${admin.email}`);
                                    } catch (adminEmailError) {
                                        console.error(`[Gear Rejection] ❌ Failed to send rejection email to admin ${admin.email}:`, adminEmailError);
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.error('[Gear Rejection] Error fetching admins or sending notifications:', e);
                    }
                }
            }
        } catch (emailError) {
            console.warn('Failed to send gear rejection email:', emailError);
            // Don't fail the request if email fails
        }

        return ok({ user_message: 'Request rejected successfully.' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return fail(500, message, 'We could not complete rejection right now. Please try again.', 'REQUEST_REJECTION_UNEXPECTED_ERROR');
    }
}
