import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { sendCheckinApprovalEmail, sendGearRequestEmail } from '@/lib/email';
import { enqueuePushNotification } from '@/lib/push-queue';

/**
 * POST /api/checkins/approve
 * 
 * Sends email notifications when admin approves a check-in
 * 
 * Request body: {
 *   checkinId: string,
 *   userId: string,
 *   gearName: string
 * }
 * 
 * Returns: { success: boolean, error?: string }
 * 
 * Emails sent:
 * - User: Check-in approved notification
 * - Admins: Admin action notification
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { checkinId, userId, gearName, gearNames } = body;

        const normalizedGearNames: string[] = Array.isArray(gearNames)
            ? gearNames.filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0)
            : (typeof gearName === 'string' && gearName.trim().length > 0 ? [gearName] : []);

        if (!checkinId || !userId || normalizedGearNames.length === 0) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // Create Supabase client with service role key
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[Check-in Approve] Missing Supabase environment variables');
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
            console.warn('[Check-in Approve] User not found or no email:', userId);
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        // Check if user wants email notifications
        const userPrefs = (user as any).notification_preferences || {};
        const shouldSendUserEmail = userPrefs.email?.gear_checkins !== false;

        const gearLabel = normalizedGearNames.join(', ');

        // Send approval email to user
        if (shouldSendUserEmail) {
            try {
                await sendCheckinApprovalEmail({
                    to: user.email,
                    userName: user.full_name || 'there',
                    gearList: normalizedGearNames.map((name) => ({ name, condition: 'Good' })),
                    checkinDate: new Date().toISOString(),
                    condition: 'Good'
                });
                console.log('[Check-in Approve] ✅ User approval email sent to:', user.email);
            } catch (userEmailError) {
                console.error('[Check-in Approve] ❌ Failed to send user email:', userEmailError);
            }
        }

        // Queue push notification for the user
        const pushTitle = 'Your Check-in Was Approved!';
        const pushMessage = `Your check-in for ${gearLabel} has been approved. Thank you for returning the equipment.`;

        const queueResult = await enqueuePushNotification(
            supabase,
            {
                userId,
                title: pushTitle,
                body: pushMessage,
                data: { checkin_id: checkinId, type: 'checkin_approval' }
            },
            {
                requestUrl: request.url,
                context: 'Check-in Approve'
            }
        );

        if (!queueResult.success) {
            console.error('[Check-in Approve] Failed to queue push notification:', queueResult.error);
        } else {
            console.log('[Check-in Approve] Push notification queued for user');
        }

        // Notify all admins of the approval action
        try {
            const { data: admins } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('role', 'Admin')
                .eq('status', 'Active');

            console.log(`[Check-in Approve] Found ${admins?.length || 0} admins to notify`);

            if (admins && admins.length) {
                const userName = user.full_name || 'User';
                for (const admin of admins) {
                    if (!admin.email) continue;
                    try {
                        await sendGearRequestEmail({
                            to: admin.email,
                            subject: `✅ Check-in Approved - ${userName}`,
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
                                                <h1 style="margin: 0; font-size: 24px; font-weight: 600;">✅ Check-in Approved</h1>
                                                <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.95;">Admin action completed</p>
                                            </div>
                                            <div style="padding: 40px; line-height: 1.6; color: #333;">
                                                <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">Hello ${admin.full_name || 'Admin'},</h2>
                                                <p style="margin: 0 0 16px 0;">A check-in has been approved.</p>
                                                <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 4px;">
                                                    <table style="width: 100%; border-collapse: collapse;">
                                                        <tr>
                                                            <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">User:</td>
                                                            <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${userName}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Item:</td>
                                                            <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${gearLabel}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Status:</td>
                                                            <td style="padding: 8px 0; color: #10b981; font-weight: 600;">Approved ✓</td>
                                                        </tr>
                                                    </table>
                                                </div>
                                            </div>
                                            <div style="background-color: #f7fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                                                <p style="margin: 0; font-size: 14px; color: #718096;">
                                                    This is an automated notification from <a href="https://nestbyeden.app" style="color: #10b981; text-decoration: none;"><strong>Nest by Eden Oasis</strong></a>
                                                </p>
                                            </div>
                                        </div>
                                    </body>
                                </html>
                            `
                        });
                        console.log(`[Check-in Approve] ✅ Admin email sent to: ${admin.email}`);
                    } catch (adminEmailError) {
                        console.error(`[Check-in Approve] ❌ Failed to send admin email to ${admin.email}:`, adminEmailError);
                    }
                }
            }
        } catch (adminError) {
            console.error('[Check-in Approve] Error sending admin notifications:', adminError);
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[Check-in Approve] Error:', err);
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}
