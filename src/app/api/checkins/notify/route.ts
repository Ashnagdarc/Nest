import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { sendGearRequestEmail } from '@/lib/email';

/**
 * POST /api/checkins/notify
 * 
 * Sends email notifications when a user submits a check-in
 * 
 * Request body: {
 *   userId: string,
 *   gearId: string,
 *   gearName: string,
 *   condition: string,
 *   notes?: string,
 *   damageNotes?: string
 * }
 * 
 * Returns: { success: boolean, error?: string }
 * 
 * Emails sent:
 * - User: Confirmation of check-in submission
 * - Admins: Notification of pending check-in for review
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, gearId, gearName, condition, notes, damageNotes } = body;

        if (!userId || !gearId) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // Create Supabase client with service role key
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[Check-in Notify] Missing Supabase environment variables');
            return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Get user details
        const { data: user } = await supabase
            .from('profiles')
            .select('email, full_name, notification_preferences')
            .eq('id', userId)
            .single();

        if (!user?.email) {
            console.warn('[Check-in Notify] User not found or no email:', userId);
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        // Check if user wants email notifications (default: enabled)
        const userPrefs = (user as any).notification_preferences || {};
        const shouldSendUserEmail = userPrefs.email?.gear_checkins !== false;

        // Send confirmation email to user
        if (shouldSendUserEmail) {
            try {
                await sendGearRequestEmail({
                    to: user.email,
                    subject: '✅ Check-in Submitted - Pending Approval',
                    html: `
                        <!DOCTYPE html>
                        <html>
                            <head>
                                <meta charset="utf-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            </head>
                            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
                                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                                    <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px 40px; text-align: center;">
                                        <h1 style="margin: 0; font-size: 24px; font-weight: 600;">✅ Check-in Submitted</h1>
                                        <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.95;">Your return is being reviewed</p>
                                    </div>
                                    <div style="padding: 40px; line-height: 1.6; color: #333;">
                                        <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">Hi ${user.full_name || 'there'},</h2>
                                        <p style="margin: 0 0 16px 0;">Your check-in for <strong>${gearName}</strong> has been submitted and is pending admin approval.</p>
                                        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 4px;">
                                            <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1e40af;">Check-in Details</h3>
                                            <table style="width: 100%; border-collapse: collapse;">
                                                <tr>
                                                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Item:</td>
                                                    <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${gearName}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Condition:</td>
                                                    <td style="padding: 8px 0; color: #1f2937;">${condition}</td>
                                                </tr>
                                                ${notes ? `
                                                <tr>
                                                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Notes:</td>
                                                    <td style="padding: 8px 0; color: #1f2937;">${notes}</td>
                                                </tr>
                                                ` : ''}
                                                ${damageNotes ? `
                                                <tr>
                                                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Damage Notes:</td>
                                                    <td style="padding: 8px 0; color: #ef4444;">${damageNotes}</td>
                                                </tr>
                                                ` : ''}
                                            </table>
                                        </div>
                                        <p style="margin: 16px 0;">We'll notify you once your check-in has been reviewed and approved.</p>
                                        <div style="text-align: center; margin: 32px 0;">
                                            <a href="https://nestbyeden.app/user/history" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">View Check-in History</a>
                                        </div>
                                    </div>
                                    <div style="background-color: #f7fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                                        <p style="margin: 0; font-size: 14px; color: #718096;">
                                            Thank you for using <strong>Nest by Eden Oasis</strong><br>
                                            <a href="https://nestbyeden.app" style="color: #3b82f6; text-decoration: none;">nestbyeden.app</a>
                                        </p>
                                    </div>
                                </div>
                            </body>
                        </html>
                    `
                });
                console.log('[Check-in Notify] ✅ User email sent to:', user.email);
            } catch (userEmailError) {
                console.error('[Check-in Notify] ❌ Failed to send user email:', userEmailError);
            }
        }

        // Notify all admins
        try {
            const { data: admins } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('role', 'Admin')
                .eq('status', 'Active');

            console.log(`[Check-in Notify] Found ${admins?.length || 0} admins to notify`);

            if (admins && admins.length) {
                const userName = user.full_name || 'User';
                for (const admin of admins) {
                    if (!admin.email) continue;
                    try {
                        await sendGearRequestEmail({
                            to: admin.email,
                            subject: `🔄 New Check-in Pending Approval - ${userName}`,
                            html: `
                                <!DOCTYPE html>
                                <html>
                                    <head>
                                        <meta charset="utf-8">
                                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                    </head>
                                    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
                                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                                            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px 40px; text-align: center;">
                                                <h1 style="margin: 0; font-size: 24px; font-weight: 600;">🔄 New Check-in Pending</h1>
                                                <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.95;">Action required</p>
                                            </div>
                                            <div style="padding: 40px; line-height: 1.6; color: #333;">
                                                <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">Hello ${admin.full_name || 'Admin'},</h2>
                                                <p style="margin: 0 0 16px 0;">A new check-in has been submitted and requires your approval.</p>
                                                <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
                                                    <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #92400e;">Check-in Details</h3>
                                                    <table style="width: 100%; border-collapse: collapse;">
                                                        <tr>
                                                            <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">User:</td>
                                                            <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${userName}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Item:</td>
                                                            <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${gearName}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Condition:</td>
                                                            <td style="padding: 8px 0; color: #1f2937;">${condition}</td>
                                                        </tr>
                                                        ${notes ? `
                                                        <tr>
                                                            <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Notes:</td>
                                                            <td style="padding: 8px 0; color: #1f2937;">${notes}</td>
                                                        </tr>
                                                        ` : ''}
                                                        ${damageNotes ? `
                                                        <tr>
                                                            <td style="padding: 8px 0; color: #6b7280; font-weight: 500; vertical-align: top;">⚠️ Damage Reported:</td>
                                                            <td style="padding: 8px 0; color: #ef4444; font-weight: 600;">${damageNotes}</td>
                                                        </tr>
                                                        ` : ''}
                                                    </table>
                                                </div>
                                                <div style="text-align: center; margin: 32px 0;">
                                                    <a href="https://nestbyeden.app/admin/manage-checkins" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">Review Check-in</a>
                                                </div>
                                                <p style="margin-top: 32px; font-size: 14px; color: #6b7280; line-height: 1.6;">
                                                    Please review and approve/reject this check-in at your earliest convenience.
                                                </p>
                                            </div>
                                            <div style="background-color: #f7fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                                                <p style="margin: 0; font-size: 14px; color: #718096;">
                                                    This is an automated notification from <a href="https://nestbyeden.app" style="color: #f59e0b; text-decoration: none;"><strong>Nest by Eden Oasis</strong></a><br>
                                                    Equipment Management System
                                                </p>
                                            </div>
                                        </div>
                                    </body>
                                </html>
                            `
                        });
                        console.log(`[Check-in Notify] ✅ Admin email sent to: ${admin.email}`);
                    } catch (adminEmailError) {
                        console.error(`[Check-in Notify] ❌ Failed to send admin email to ${admin.email}:`, adminEmailError);
                    }
                }
            }
        } catch (adminError) {
            console.error('[Check-in Notify] Error sending admin notifications:', adminError);
            // Don't fail the request if admin emails fail
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[Check-in Notify] Error:', err);
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}
