import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { sendCheckinRejectionEmail, sendGearRequestEmail } from '@/lib/email';
import { enqueuePushNotification } from '@/lib/push-queue';

/**
 * POST /api/checkins/reject
 * 
 * Sends email notifications when admin rejects a check-in
 * 
 * Request body: {
 *   checkinId: string,
 *   userId: string,
 *   gearName: string,
 *   reason: string
 * }
 * 
 * Returns: { success: boolean, error?: string }
 * 
 * Emails sent:
 * - User: Check-in rejected notification with reason
 * - Admins: Admin action notification
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { checkinId, userId, gearName, reason } = body;

        if (!checkinId || !userId || !gearName || !reason) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // Create Supabase client with service role key
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[Check-in Reject] Missing Supabase environment variables');
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
            console.warn('[Check-in Reject] User not found or no email:', userId);
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        // Check if user wants email notifications
        const userPrefs = (user as any).notification_preferences || {};
        const shouldSendUserEmail = userPrefs.email?.gear_checkins !== false;

        // Send rejection email to user
        if (shouldSendUserEmail) {
            try {
                await sendCheckinRejectionEmail({
                    to: user.email,
                    userName: user.full_name || 'there',
                    gearList: [{ name: gearName }],
                    checkinDate: new Date().toISOString(),
                    reason: reason
                });
                console.log('[Check-in Reject] ✅ User rejection email sent to:', user.email);
            } catch (userEmailError) {
                console.error('[Check-in Reject] ❌ Failed to send user email:', userEmailError);
            }
        }

        // Queue push notification for the user
        const pushTitle = 'Your Check-in Was Rejected';
        const pushMessage = `Your check-in for ${gearName} has been rejected. Reason: ${reason}. Please contact support for assistance.`;

        const queueResult = await enqueuePushNotification(
            supabase,
            {
                userId,
                title: pushTitle,
                body: pushMessage,
                data: { checkin_id: checkinId, type: 'checkin_rejection' }
            },
            {
                requestUrl: request.url,
                context: 'Check-in Reject'
            }
        );

        if (!queueResult.success) {
            console.error('[Check-in Reject] Failed to queue push notification:', queueResult.error);
        } else {
            console.log('[Check-in Reject] Push notification queued for user');
        }

        // Notify all admins of the rejection action
        try {
            const { data: admins } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('role', 'Admin')
                .eq('status', 'Active');

            console.log(`[Check-in Reject] Found ${admins?.length || 0} admins to notify`);

            if (admins && admins.length) {
                const userName = user.full_name || 'User';
                for (const admin of admins) {
                    if (!admin.email) continue;
                    try {
                        await sendGearRequestEmail({
                            to: admin.email,
                            subject: `❌ Check-in Rejected - ${userName}`,
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
                                                <h1 style="margin: 0; font-size: 24px; font-weight: 600;">❌ Check-in Rejected</h1>
                                                <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.95;">Admin action completed</p>
                                            </div>
                                            <div style="padding: 40px; line-height: 1.6; color: #333;">
                                                <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">Hello ${admin.full_name || 'Admin'},</h2>
                                                <p style="margin: 0 0 16px 0;">A check-in has been rejected.</p>
                                                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px;">
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
                                                            <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Status:</td>
                                                            <td style="padding: 8px 0; color: #ef4444; font-weight: 600;">Rejected ✗</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding: 8px 0; color: #6b7280; font-weight: 500; vertical-align: top;">Reason:</td>
                                                            <td style="padding: 8px 0; color: #1f2937;">${reason}</td>
                                                        </tr>
                                                    </table>
                                                </div>
                                            </div>
                                            <div style="background-color: #f7fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                                                <p style="margin: 0; font-size: 14px; color: #718096;">
                                                    This is an automated notification from <a href="https://nestbyeden.app" style="color: #ef4444; text-decoration: none;"><strong>Nest by Eden Oasis</strong></a>
                                                </p>
                                            </div>
                                        </div>
                                    </body>
                                </html>
                            `
                        });
                        console.log(`[Check-in Reject] ✅ Admin email sent to: ${admin.email}`);
                    } catch (adminEmailError) {
                        console.error(`[Check-in Reject] ❌ Failed to send admin email to ${admin.email}:`, adminEmailError);
                    }
                }
            }
        } catch (adminError) {
            console.error('[Check-in Reject] Error sending admin notifications:', adminError);
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[Check-in Reject] Error:', err);
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}
