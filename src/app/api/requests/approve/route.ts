import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { sendGearRequestApprovalEmail, sendGearRequestEmail } from '@/lib/email';

/**
 * Calculates due date based on request duration
 * 
 * Why: Requests specify duration as human-readable string ("24hours", "1 week").
 * We convert this to ISO timestamp for database storage and notifications.
 * 
 * Uses UTC to avoid timezone issues with multi-location teams.
 * 
 * @param duration - Duration string from request form
 * @returns ISO timestamp for when gear is due back
 */
const calculateDueDate = (duration: string): string => {
    const now = new Date();
    const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()));

    let dueDate: Date;

    switch (duration) {
        case "24hours": dueDate = new Date(utcNow.getTime() + 24 * 60 * 60 * 1000); break;
        case "48hours": dueDate = new Date(utcNow.getTime() + 48 * 60 * 60 * 1000); break;
        case "72hours": dueDate = new Date(utcNow.getTime() + 72 * 60 * 60 * 1000); break;
        case "1 week": dueDate = new Date(utcNow.getTime() + 7 * 24 * 60 * 60 * 1000); break;
        case "2 weeks": dueDate = new Date(utcNow.getTime() + 14 * 24 * 60 * 60 * 1000); break;
        case "Month": dueDate = new Date(utcNow.getTime() + 30 * 24 * 60 * 60 * 1000); break;
        case "1year": dueDate = new Date(utcNow.getTime() + 365 * 24 * 60 * 60 * 1000); break;
        default: dueDate = new Date(utcNow.getTime() + 7 * 24 * 60 * 60 * 1000); break;
    }
    return dueDate.toISOString();
};

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
    try {
        const { requestId } = await request.json();
        console.log('🔍 Approving request:', requestId);

        if (!requestId) {
            return NextResponse.json({ success: false, error: 'requestId is required' }, { status: 400 });
        }

        /**
         * Use service role key instead of user session
         * 
         * Why: RLS policies block admins from updating gear inventory directly.
         * Service role bypasses RLS to allow atomic approval + inventory update.
         * 
         * Security: This endpoint should have auth middleware to verify admin role.
         */
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase environment variables');
            return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Load request first
        const { data: req, error: reqErr } = await supabase
            .from('gear_requests')
            .select('id, user_id, status, due_date, expected_duration, reason, destination')
            .eq('id', requestId)
            .maybeSingle();
        if (reqErr || !req) {
            console.error('🔍 Request not found:', reqErr);
            return NextResponse.json({ success: false, error: `Request not found: ${reqErr?.message || ''}` }, { status: 404 });
        }

        console.log('🔍 Request found:', req);

        // Then load gear request gears separately
        const { data: gearRequestGears, error: gearErr } = await supabase
            .from('gear_request_gears')
            .select('gear_id, quantity')
            .eq('gear_request_id', requestId);
        if (gearErr) {
            console.error('🔍 Failed to load gear data:', gearErr);
            return NextResponse.json({ success: false, error: `Failed to load gear data: ${gearErr.message}` }, { status: 500 });
        }

        console.log('🔍 Gear request gears:', gearRequestGears);

        if (req.status === 'Approved') {
            return NextResponse.json({ success: true, data: { message: 'Already approved' } });
        }

        const lines: Array<{ gear_id: string; quantity: number }> = Array.isArray(gearRequestGears)
            ? gearRequestGears.map((l: { gear_id: string; quantity?: number }) => ({ gear_id: l.gear_id, quantity: Math.max(1, Number(l.quantity ?? 1)) }))
            : [];

        if (lines.length === 0) {
            return NextResponse.json({ success: false, error: 'No line items recorded for this request.' }, { status: 400 });
        }

        // Validate availability and collect updates
        console.log('🔍 Processing lines:', lines);
        const updates: Array<{ gear_id: string; newAvailable: number; newStatus: string }> = [];
        for (const line of lines) {
            const { data: g, error: gErr } = await supabase
                .from('gears')
                .select('id, name, available_quantity, quantity, status')
                .eq('id', line.gear_id)
                .maybeSingle();
            if (gErr || !g) {
                return NextResponse.json({ success: false, error: `Gear not found for line` }, { status: 400 });
            }
            const baseAvailable = typeof g.available_quantity === 'number' && !Number.isNaN(g.available_quantity)
                ? g.available_quantity
                : (typeof g.quantity === 'number' ? g.quantity : 0);
            if (baseAvailable < line.quantity) {
                return NextResponse.json({ success: false, error: `Not enough available units for ${g.name}. Requested ${line.quantity}, available ${baseAvailable}.` }, { status: 409 });
            }
            const newAvailable = Math.max(0, baseAvailable - line.quantity);
            // Use proper status progression: Available -> Partially Available -> Checked Out
            const newStatus = newAvailable === baseAvailable ? 'Available' :
                newAvailable > 0 ? 'Partially Available' : 'Checked Out';
            console.log(`🔍 Gear ${g.name}: ${baseAvailable} available, requesting ${line.quantity}, new available: ${newAvailable}, new status: ${newStatus}`);
            updates.push({ gear_id: g.id, newAvailable, newStatus });
        }

        // Calculate due date based on expected duration at approval time
        const calculatedDueDate = calculateDueDate(req.expected_duration || '1 week');

        // Apply updates
        for (const upd of updates) {
            const { error: uErr } = await supabase
                .from('gears')
                .update({
                    available_quantity: upd.newAvailable,
                    status: upd.newStatus,
                    checked_out_to: req.user_id,
                    current_request_id: requestId,
                    last_checkout_date: new Date().toISOString(),
                    due_date: calculatedDueDate,
                    updated_at: new Date().toISOString()
                })
                .eq('id', upd.gear_id);
            if (uErr) {
                return NextResponse.json({ success: false, error: `Failed to update gear availability: ${uErr.message}` }, { status: 500 });
            }
        }

        // Note: gear_ids field doesn't exist in gear_requests table
        // Gear-to-request associations are handled by gear_request_gears junction table
        const distinctGearIds = Array.from(new Set(lines.map(l => l.gear_id)));

        const { error: approveErr } = await supabase
            .from('gear_requests')
            .update({
                status: 'Approved',
                approved_at: new Date().toISOString(),
                due_date: calculatedDueDate,
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);
        if (approveErr) {
            return NextResponse.json({ success: false, error: `Failed to approve request: ${approveErr.message}` }, { status: 500 });
        }

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

                // Send notification email to all admins about the approval
                try {
                    const { data: admins } = await supabase
                        .from('profiles')
                        .select('email, full_name')
                        .eq('role', 'Admin')
                        .eq('status', 'Active');
                    
                    if (admins && Array.isArray(admins)) {
                        const gearNames = gearListFormatted.map(g => `${g.name} (x${g.quantity})`).join(', ') || 'Gear items';
                        const userName = userProfile.full_name || 'User';

                        for (const admin of admins) {
                            if (admin.email) {
                                try {
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
                                                                <a href="https://nestbyeden.app/admin/manage-requests" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">View All Requests</a>
                                                            </div>
                                                            <p style="margin-top: 32px; font-size: 14px; color: #6b7280; line-height: 1.6;">User has been notified and can now pick up the equipment.</p>
                                                        </div>
                                                        <div style="background-color: #f7fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                                                            <p style="margin: 0; font-size: 14px; color: #718096;">
                                                                This is an automated notification from <a href="https://nestbyeden.app" style="color: #10b981; text-decoration: none;"><strong>Nest by Eden Oasis</strong></a><br>
                                                                Equipment Management System
                                                            </p>
                                                        </div>
                                                    </div>
                                                </body>
                                            </html>
                                        `
                                    });
                                } catch (adminEmailError) {
                                    console.warn(`Failed to send approval email to admin ${admin.email}:`, adminEmailError);
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Failed to notify admins of approval:', e);
                }
            }
        } catch (emailError) {
            console.warn('Failed to send gear approval email:', emailError);
            // Don't fail the request if email fails
        }

        console.log('🔍 Request approved successfully:', { updated: updates.length, gear_ids: distinctGearIds });
        return NextResponse.json({ success: true, data: { updated: updates.length, gear_ids: distinctGearIds } });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('🔍 Error in approve API:', msg);
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}


