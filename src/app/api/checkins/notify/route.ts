import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendCheckinSubmissionEmail } from '@/lib/email';
import { getRouteAuthContext } from '@/app/api/_utils/route-auth';

type NotificationPreferences = {
    email?: Record<string, boolean | undefined>;
};

/**
 * POST /api/checkins/notify
 * 
 * Sends email notifications when a user submits a check-in
 * 
 * Request body: {
 *   userId: string,
 *   gearId?: string,
 *   gearName?: string,
 *   gearNames?: string[],
 *   requestId?: string | null,
 *   items?: Array<{ name: string, quantity: number, condition: string, notes?: string, damageNotes?: string }>,
 *   condition?: string,
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
        const authContext = await getRouteAuthContext();
        if ('errorResponse' in authContext) {
            return authContext.errorResponse;
        }

        const body = await request.json();
        const { userId, gearName, gearNames, requestId, items, condition, notes, damageNotes } = body;

        const submissionItems = Array.isArray(items) && items.length > 0
            ? items.filter((item): item is { name: string; quantity: number; condition: string; notes?: string; damageNotes?: string } =>
                item && typeof item.name === 'string' && item.name.trim().length > 0)
            : (Array.isArray(gearNames) && gearNames.length > 0
                ? gearNames.map((name) => ({
                    name,
                    quantity: 1,
                    condition: condition || 'Good',
                    notes: notes || undefined,
                    damageNotes: damageNotes || undefined,
                }))
                : (gearName
                    ? [{
                        name: gearName,
                        quantity: 1,
                        condition: condition || 'Good',
                        notes: notes || undefined,
                        damageNotes: damageNotes || undefined,
                    }]
                    : []));

        if (!userId || submissionItems.length === 0) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        if (authContext.user.id !== userId && !authContext.isActiveAdmin) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const supabase = authContext.isActiveAdmin
            ? await createSupabaseServerClient(true)
            : authContext.authSupabase;

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
        const userPrefs = (user.notification_preferences as NotificationPreferences | null) || {};
        const shouldSendUserEmail = userPrefs.email?.gear_checkins !== false;

        // Send confirmation email to user
        if (shouldSendUserEmail) {
            try {
                await sendCheckinSubmissionEmail({
                    to: user.email,
                    userName: user.full_name || 'there',
                    items: submissionItems,
                    requestId: requestId || null,
                    submittedAt: new Date().toISOString(),
                    audience: 'user',
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
                for (const admin of admins) {
                    if (!admin.email) continue;
                    try {
                        await sendCheckinSubmissionEmail({
                            to: admin.email,
                            userName: admin.full_name || 'Admin',
                            items: submissionItems,
                            requestId: requestId || null,
                            submittedAt: new Date().toISOString(),
                            audience: 'admin',
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
