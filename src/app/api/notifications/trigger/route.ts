import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Helper function to map table names to valid notification types
function getNotificationType(table: string): string {
    const typeMap: Record<string, string> = {
        'gear_requests': 'Request',
        'checkins': 'System',
        'gear_maintenance': 'Maintenance',
        'notifications': 'System',
        'profiles': 'System',
        'gears': 'System',
        'announcements': 'System'
    };
    return typeMap[table] || 'System';
}
import {
    sendGearRequestEmail,
    sendRequestReceivedEmail,
    sendApprovalEmail,
    sendRejectionEmail,
    sendCheckinApprovalEmail,
    sendCheckinRejectionEmail
} from '@/lib/email';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// Firebase fallback removed - using only Web Push (VAPID)

// Helper to get app settings
async function getAppSettings(supabase: SupabaseClient<Database>) {
    const { data } = await supabase.from('app_settings').select('key,value').in('key', [
        'brand_logo_url', 'brand_primary_color', 'notification_defaults'
    ]);
    const settings: Record<string, string> = {};
    if (data) {
        for (const row of data) {
            settings[row.key] = row.value;
        }
    }
    return settings;
}

export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();
        const { type, table, record, old_record } = payload;

        console.log('[Notification Trigger] Received payload:', { type, table, record: record?.id });

        // Simple test response for debugging
        if (!type || !table || !record) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: type, table, or record'
            }, { status: 400 });
        }

        const supabase = await createSupabaseServerClient(true) as SupabaseClient<Database>;
        const appSettings = await getAppSettings(supabase);
        const BRAND_LOGO_URL = appSettings['brand_logo_url'] || 'https://nestbyeden.app/logo.png';
        const BRAND_COLOR = appSettings['brand_primary_color'] || '#ff6300';
        const notificationDefaults = appSettings['notification_defaults'] ? JSON.parse(appSettings['notification_defaults']) : { email: true, push: true, in_app: true };

        // Helper to send email to all admins
        async function notifyAdminsByEmail(subject: string, html: string) {
            const { data: admins } = await supabase.from('profiles').select('email').eq('role', 'Admin').eq('status', 'Active');
            if (admins && Array.isArray(admins)) {
                for (const admin of admins) {
                    if (admin.email) {
                        await sendGearRequestEmail({
                            to: admin.email,
                            subject,
                            html,
                        });
                    }
                }
            }
        }

        type NotificationTarget = { id: string; email?: string; preferences?: Record<string, unknown> };
        let notificationTargets: NotificationTarget[] = [];
        let title = '';
        let message = '';
        let emailHtml = '';
        let userId: string | undefined = undefined;
        let metadata: Record<string, unknown> = {};
        let category = '';

        // --- Gear Requests ---
        if (table === 'gear_requests') {
            if (type === 'INSERT') {
                title = 'New Gear Request Submitted';
                message = `A new gear request has been submitted by ${record.requester_name || 'a user'} for ${record.gear_name || 'equipment'}.`;
                emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <img src="${BRAND_LOGO_URL}" alt="Nest by Eden Oasis" style="height: 40px; margin-bottom: 16px;">
          <h2 style="color: ${BRAND_COLOR};">New Gear Request</h2>
          <p><strong>User:</strong> ${record.requester_name || 'N/A'}</p>
          <p><strong>Gear:</strong> ${record.gear_name || 'N/A'}</p>
          <p><strong>Reason:</strong> ${record.reason || 'N/A'}</p>
          <p>View request in <a href="https://nestbyeden.app/admin/manage-requests">Nest by Eden Oasis</a>.</p>
          <hr>
          <small style="color: #888;">Nest by Eden Oasis Team</small>
        </div>
      `;
                category = 'request';
                metadata = { gear_id: record.gear_id, request_id: record.id };
                // Find all admin users and their preferences
                const { data: admins } = await supabase.from('profiles').select('id,email,notification_preferences,role').eq('role', 'Admin');
                notificationTargets = (admins || [])
                    .filter(a => !!a.email)
                    .map(a => ({
                        id: a.id,
                        email: a.email,
                        preferences: a.notification_preferences
                    }));
                // ALSO notify the user who made the request
                if (record.user_id) {
                    const { data: user } = await supabase.from('profiles').select('email,full_name,notification_preferences').eq('id', record.user_id).single();
                    if (user?.email) {
                        const userTitle = 'Your Gear Request Was Received!';
                        const userMessage = `Hi ${user.full_name || 'there'}, your request for ${record.gear_name || 'equipment'} has been received and is pending approval.`;

                        // Respect user preferences for confirmation
                        const prefs = user.notification_preferences || {};
                        const sendEmail = prefs.email?.gear_requests ?? notificationDefaults.email;
                        const sendInApp = prefs.in_app?.gear_requests ?? notificationDefaults.in_app;

                        if (sendInApp) {
                            await supabase.from('notifications').insert([
                                {
                                    user_id: record.user_id,
                                    type: 'Request',
                                    title: userTitle,
                                    message: userMessage,
                                    is_read: false,
                                    created_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString(),
                                    metadata,
                                    category,
                                }
                            ]);
                        }

                        if (sendEmail) {
                            try {
                                await sendRequestReceivedEmail({
                                    to: user.email,
                                    userName: user.full_name || 'there',
                                    gearList: record.gear_name || 'equipment',
                                });
                            } catch (err: any) {
                                console.error('[Email Notification Error]', err);
                            }
                        }
                    }
                }
                // After user email, also notify admins by email
                 await notifyAdminsByEmail(title, emailHtml);
             }
         }

         // --- Car Booking Approvals/Rejections ---
         if (table === 'car_bookings' && type === 'UPDATE') {
             if (old_record.status !== record.status) {
                 if (record.status === 'Approved') {
                     title = 'Your Car Booking Was Approved';
                     message = `Your car booking request has been approved.`;
                     userId = record.user_id;
                     category = 'car_booking';
                     metadata = { booking_id: record.id };
                 } else if (record.status === 'Rejected') {
                     title = 'Your Car Booking Was Rejected';
                     message = `Your car booking request has been rejected.`;
                     userId = record.user_id;
                     category = 'car_booking';
                     metadata = { booking_id: record.id };
                 }
             }
         }

        // --- Send Notifications ---
        let targets: NotificationTarget[] = [];
        if (notificationTargets.length > 0) {
            targets = notificationTargets;
        } else if (userId) {
            // Fetch user preferences for this user
            const { data: user } = await supabase.from('profiles').select('email,notification_preferences').eq('id', userId).single();
            if (user) {
                targets = [{ id: userId, email: user.email ?? undefined, preferences: user.notification_preferences }];
            }
        }

        const errors = [];
        for (const target of targets) {
            const targetId = target.id;
            const targetEmail = target.email;
            let notificationId = null;
            let lastError = null;
            const prefs = target.preferences || {};
            // Determine channels for this event
            const sendInApp = (prefs as any).in_app?.[table] ?? notificationDefaults.in_app;
            const sendEmail = (prefs as any).email?.[table] ?? notificationDefaults.email;
            const sendPush = (prefs as any).push?.[table] ?? notificationDefaults.push;

            // In-app notification
            if (sendInApp) {
                try {
                    const { data, error } = await supabase.from('notifications').insert([
                        {
                            user_id: targetId,
                            type: getNotificationType(table),
                            title,
                            message,
                            is_read: false,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            metadata,
                            category,
                        }
                    ]).select('id');
                    if (error) throw error;
                    notificationId = data?.[0]?.id;
                } catch (err: any) {
                    errors.push(`In-app: ${err.message}`);
                }
            }

            // Email notification
            if (sendEmail && targetEmail) {
                try {
                    const emailResult = await sendGearRequestEmail({
                        to: targetEmail,
                        subject: title,
                        html: emailHtml || `<p>${message}</p>`,
                    });

                    if (!emailResult.success) {
                        lastError = `Email: ${emailResult.error}`;
                        errors.push(lastError);
                        console.error('[Email Notification Error]', {
                            error: emailResult.error,
                            targetEmail,
                            hasResendKey: !!process.env.RESEND_API_KEY,
                        });
                    }
                } catch (err: unknown) {
                    const errorMessage = err instanceof Error ? err.message : 'Unknown email error';
                    lastError = `Email: ${errorMessage}`;
                    errors.push(lastError);
                    // Add detailed logging for debugging
                    console.error('[Email Notification Error]', {
                        error: err,
                        targetEmail,
                        hasResendKey: !!process.env.RESEND_API_KEY,
                    });
                }
            }

            // Push notification - queue for async processing
            if (sendPush) {
                try {
                    // Queue notification for async processing instead of sending immediately
                    const { error: queueError } = await supabase.from('push_notification_queue').insert([
                        {
                            user_id: targetId,
                            title,
                            body: message,
                            data: (metadata as any) || {},
                            status: 'pending'
                        }
                    ]);

                    if (queueError) {
                        console.error('[Notification Trigger] Failed to queue push notification:', queueError);
                        errors.push(`Queue push: ${queueError.message}`);
                    } else {
                        console.log('[Notification Trigger] Push notification queued for user:', targetId);
                    }
                } catch (err: any) {
                    console.error('[Notification Trigger] Push queue error:', err);
                    lastError = `Push queue: ${err.message}`;
                    errors.push(lastError);
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Notification processed successfully',
            emailSent: targets.some(t => t.email),
            pushSent: targets.length > 0,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error: any) {
        console.error('[Notification Trigger Error]:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Unknown error occurred',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}