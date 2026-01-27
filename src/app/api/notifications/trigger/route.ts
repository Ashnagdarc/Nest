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

const FCM_API_URL = 'https://fcm.googleapis.com/fcm/send';
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;

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
                                    requestId: record.id,
                                });
                            } catch (err: any) {
                                console.error('[Email Notification Error]', err);
                            }
                        }
                    }
                }
                // After user email, also notify admins by email
                await notifyAdminsByEmail(title, emailHtml);
            } else if (type === 'UPDATE' && record.status === 'Approved' && old_record.status !== 'Approved') {
                title = 'Your Gear Request Was Approved!';
                message = `Your request for ${record.gear_name || 'equipment'} has been approved.`;

                // Get user details for email
                const { data: user } = await supabase.from('profiles').select('email,full_name,notification_preferences').eq('id', record.user_id).single();

                userId = record.user_id;
                category = 'request';
                metadata = { gear_id: record.gear_id, request_id: record.id };

                // Send enhanced approval email to user
                if (user?.email) {
                    const prefs = user.notification_preferences || {};
                    const sendEmail = prefs.email?.gear_requests ?? notificationDefaults.email;

                    if (sendEmail) {
                        try {
                            await sendApprovalEmail({
                                to: user.email,
                                userName: user.full_name || record.requester_name || 'there',
                                gearList: record.gear_name || 'equipment',
                                dueDate: record.due_date || new Date().toISOString(),
                                requestId: record.id,
                            });
                        } catch (err: any) {
                            console.error('[Email Notification Error]', err);
                        }
                    }
                }

                // Notify admins
                await notifyAdminsByEmail(title, emailHtml);
            }
            else if (type === 'UPDATE' && record.status === 'Rejected' && old_record.status !== 'Rejected') {
                title = 'Your Gear Request Was Rejected';
                message = `Your request for ${record.gear_name || 'equipment'} has been rejected.`;

                // Get user details for email
                const { data: user } = await supabase.from('profiles').select('email,full_name,notification_preferences').eq('id', record.user_id).single();

                userId = record.user_id;
                category = 'request';
                metadata = { gear_id: record.gear_id, request_id: record.id };

                // Send enhanced rejection email to user
                if (user?.email) {
                    const prefs = user.notification_preferences || {};
                    const sendEmail = prefs.email?.gear_requests ?? notificationDefaults.email;

                    if (sendEmail) {
                        try {
                            await sendRejectionEmail({
                                to: user.email,
                                userName: user.full_name || record.requester_name || 'there',
                                gearList: record.gear_name || 'equipment',
                                reason: record.admin_notes || 'No specific reason provided',
                                requestId: record.id,
                            });
                        } catch (err: any) {
                            console.error('[Email Notification Error]', err);
                        }
                    }
                }

                // Notify admins
                await notifyAdminsByEmail(title, emailHtml);
            }
            else if (type === 'UPDATE' && record.status === 'Cancelled' && old_record.status !== 'Cancelled') {
                title = 'Your Gear Request Was Cancelled';
                message = `Your request for ${record.gear_name || 'equipment'} has been cancelled.`;
                emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <img src="${BRAND_LOGO_URL}" alt="Nest by Eden Oasis" style="height: 40px; margin-bottom: 16px;">
        <h2 style="color: ${BRAND_COLOR};">Request Cancelled</h2>
        <p>Hi ${record.requester_name || 'there'},</p>
        <p>Your request for <strong>${record.gear_name || 'equipment'}</strong> has been <b>cancelled</b>.</p>
        <p>View details in <a href=\"https://nestbyeden.app/user/my-requests\">Nest by Eden Oasis</a>.</p>
        <hr>
        <small style="color: #888;">Nest by Eden Oasis Team</small>
      </div>
    `;
                userId = record.user_id;
                category = 'request';
                metadata = { gear_id: record.gear_id, request_id: record.id };
                await notifyAdminsByEmail(title, emailHtml);
            }
            else if (type === 'UPDATE' && record.status === 'Returned' && old_record.status !== 'Returned') {
                title = 'Your Gear Has Been Returned';
                message = `Your gear request for ${record.gear_name || 'equipment'} has been marked as returned.`;
                emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <img src="${BRAND_LOGO_URL}" alt="Nest by Eden Oasis" style="height: 40px; margin-bottom: 16px;">
        <h2 style="color: ${BRAND_COLOR};">Gear Returned</h2>
        <p>Hi ${record.requester_name || 'there'},</p>
        <p>Your gear request for <strong>${record.gear_name || 'equipment'}</strong> has been marked as <b>returned</b>.</p>
        <p>Thank you for using Nest!</p>
        <hr>
        <small style="color: #888;">Nest by Eden Oasis Team</small>
      </div>
    `;
                userId = record.user_id;
                category = 'request';
                metadata = { gear_id: record.gear_id, request_id: record.id };
                await notifyAdminsByEmail(title, emailHtml);
            }
            // Overdue logic would typically be handled in a scheduled job, but if you want to handle it here:
            else if (type === 'UPDATE' && record.status === 'Overdue' && old_record.status !== 'Overdue') {
                title = 'Your Gear Is Overdue';
                message = `Your gear request for ${record.gear_name || 'equipment'} is overdue. Please return it as soon as possible.`;
                emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <img src="${BRAND_LOGO_URL}" alt="Nest by Eden Oasis" style="height: 40px; margin-bottom: 16px;">
        <h2 style="color: ${BRAND_COLOR};">Gear Overdue</h2>
        <p>Hi ${record.requester_name || 'there'},</p>
        <p>Your gear request for <strong>${record.gear_name || 'equipment'}</strong> is <b>overdue</b>. Please return it as soon as possible.</p>
        <hr>
        <small style="color: #888;">Nest by Eden Oasis Team</small>
      </div>
    `;
                userId = record.user_id;
                category = 'request';
                metadata = { gear_id: record.gear_id, request_id: record.id };
                await notifyAdminsByEmail(title, emailHtml);
            }
        }

        // --- Gear Checkouts ---
        if (table === 'gear_checkouts' && type === 'INSERT') {
            // Notify user of successful checkout
            title = 'Gear Checked Out';
            message = 'You have successfully checked out gear.';
            emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <img src="${BRAND_LOGO_URL}" alt="Nest by Eden Oasis" style="height: 40px; margin-bottom: 16px;">
        <h2 style="color: ${BRAND_COLOR};">Gear Checked Out</h2>
        <p>You have successfully checked out your gear.</p>
        <p>Thank you for using Nest!</p>
        <hr>
        <small style="color: #888;">Nest by Eden Oasis Team</small>
      </div>
    `;
            userId = record.user_id;
            category = 'gear_checkout';
            metadata = { gear_id: record.gear_id, checkout_id: record.id };
        }

        // --- Check-ins ---
        if (table === 'checkins') {
            if (type === 'INSERT') {
                // Notify user of successful check-in submission
                title = 'Check-in Submitted';
                message = 'Your check-in has been submitted and is pending approval.';
                userId = record.user_id;
                category = 'gear_checkin';
                metadata = { gear_id: record.gear_id, checkin_id: record.id };
            } else if (type === 'UPDATE') {
                // Handle check-in status changes
                if (record.status === 'Completed' && old_record.status !== 'Completed') {
                    // Check-in approved
                    title = 'Check-in Approved';
                    message = 'Your check-in has been approved and processed.';

                    // Get user and gear details
                    const { data: user } = await supabase.from('profiles').select('email,full_name,notification_preferences').eq('id', record.user_id).single();
                    const { data: gear } = await supabase.from('gears').select('name').eq('id', record.gear_id).single();

                    userId = record.user_id;
                    category = 'gear_checkin';
                    metadata = { gear_id: record.gear_id, checkin_id: record.id };

                    // Send enhanced check-in approval email
                    if (user?.email) {
                        const prefs = user.notification_preferences || {};
                        const sendEmail = prefs.email?.gear_checkins ?? notificationDefaults.email;

                        if (sendEmail) {
                            try {
                                await sendCheckinApprovalEmail({
                                    to: user.email,
                                    userName: user.full_name || 'there',
                                    gearList: [{
                                        name: gear?.name || 'equipment',
                                        condition: record.condition || 'Good'
                                    }],
                                    checkinDate: record.checkin_date || record.updated_at || new Date().toISOString(),
                                    condition: record.condition || 'Good',
                                    notes: record.notes,
                                });
                            } catch (err: any) {
                                console.error('[Email Notification Error]', err);
                            }
                        }
                    }
                } else if (record.status === 'Rejected' && old_record.status !== 'Rejected') {
                    // Check-in rejected
                    title = 'Check-in Rejected';
                    message = 'Your check-in has been rejected and requires attention.';

                    // Get user and gear details
                    const { data: user } = await supabase.from('profiles').select('email,full_name,notification_preferences').eq('id', record.user_id).single();
                    const { data: gear } = await supabase.from('gears').select('name').eq('id', record.gear_id).single();

                    userId = record.user_id;
                    category = 'gear_checkin';
                    metadata = { gear_id: record.gear_id, checkin_id: record.id };

                    // Send enhanced check-in rejection email
                    if (user?.email) {
                        const prefs = user.notification_preferences || {};
                        const sendEmail = prefs.email?.gear_checkins ?? notificationDefaults.email;

                        if (sendEmail) {
                            try {
                                await sendCheckinRejectionEmail({
                                    to: user.email,
                                    userName: user.full_name || 'there',
                                    gearList: [{ name: gear?.name || 'equipment' }],
                                    reason: record.notes || 'No specific reason provided',
                                    checkinDate: record.checkin_date || record.updated_at || new Date().toISOString(),
                                });
                            } catch (err: any) {
                                console.error('[Email Notification Error]', err);
                            }
                        }
                    }
                }
            }
        }

        // --- Maintenance ---
        if (table === 'gear_maintenance' && type === 'INSERT') {
            // Notify maintenance team (admins)
            title = 'New Maintenance Record';
            message = 'A new maintenance record has been created.';
            emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <img src="${BRAND_LOGO_URL}" alt="Nest by Eden Oasis" style="height: 40px; margin-bottom: 16px;">
        <h2 style="color: ${BRAND_COLOR};">New Maintenance Record</h2>
        <p>A new maintenance record has been created for your review.</p>
        <hr>
        <small style="color: #888;">Nest by Eden Oasis Team</small>
      </div>
    `;
            const { data: admins } = await supabase.from('profiles').select('id,email').eq('role', 'Admin');
            notificationTargets = (admins || []).filter((a): a is { id: string; email: string } => !!a.email).map(a => ({ id: a.id, email: a.email }));
            category = 'maintenance_record';
            metadata = { maintenance_id: record.id };
        }

        // Maintenance: notify user if their gear is under maintenance
        else if (table === 'gear_maintenance' && type === 'INSERT' && record.gear_id) {
            // Find the user who last checked out the gear
            const { data: lastRequest } = await supabase
                .from('gear_requests')
                .select('user_id, gear_name')
                .eq('gear_id', record.gear_id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (lastRequest && lastRequest.user_id) {
                title = 'Your Gear Is Under Maintenance';
                message = `Your gear (${lastRequest.gear_name || 'equipment'}) is currently under maintenance.`;
                emailHtml = `
      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: auto;\">
        <img src=\"${BRAND_LOGO_URL}\" alt=\"Nest by Eden Oasis\" style=\"height: 40px; margin-bottom: 16px;\">
        <h2 style=\"color: ${BRAND_COLOR};\">Gear Under Maintenance</h2>
        <p>Hi there,</p>
        <p>Your gear <strong>${lastRequest.gear_name || 'equipment'}</strong> is currently under maintenance. We will notify you when it is available again.</p>
        <hr>
        <small style=\"color: #888;\">Nest by Eden Oasis Team</small>
      </div>
    `;
                userId = lastRequest.user_id;
                category = 'maintenance_record';
                metadata = { maintenance_id: record.id };
            }
        }

        // --- Profile Updates ---
        if (table === 'profiles') {
            if (type === 'INSERT') {
                // Welcome message for new users
                title = 'Welcome to Nest!';
                message = `Welcome ${record.full_name || 'to Nest'}! We're glad to have you.`;
                emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <img src="${BRAND_LOGO_URL}" alt="Nest by Eden Oasis" style="height: 40px; margin-bottom: 16px;">
        <h2 style="color: ${BRAND_COLOR};">Welcome to Nest!</h2>
        <p>Hi ${record.full_name || 'there'},</p>
        <p>Welcome to <strong>Nest</strong>, your asset management system. We're excited to have you on board.</p>
        <p>You can now request gear, manage checking out assets, and more.</p>
        <p><a href="https://nestbyeden.app">Get Started</a></p>
        <hr>
        <small style="color: #888;">Nest by Eden Oasis Team</small>
      </div>
    `;
                userId = record.id;
                category = 'welcome';
                metadata = { profile_id: record.id };
            } else if (type === 'UPDATE') {
                // Sync or notify on profile update (example: notify user)
                title = 'Profile Updated';
                message = 'Your profile has been updated.';
                emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <img src="${BRAND_LOGO_URL}" alt="Eden Oasis Realty" style="height: 40px; margin-bottom: 16px;">
        <h2 style="color: ${BRAND_COLOR};">Profile Updated</h2>
        <p>Your profile has been updated in Nest.</p>
        <hr>
        <small style="color: #888;">Eden Oasis Nest System</small>
      </div>
    `;
                userId = record.id;
                category = 'profile_update';
                metadata = { profile_id: record.id };
            }
        }

        // --- Announcements ---
        if (table === 'announcements' && type === 'INSERT') {
            console.log('[Notification Trigger] Processing announcement insert');
            // Notify all users of new announcement
            title = 'New Announcement';
            message = record.title || 'A new announcement has been posted.';
            emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <img src="${BRAND_LOGO_URL}" alt="Eden Oasis Realty" style="height: 40px; margin-bottom: 16px;">
        <h2 style="color: ${BRAND_COLOR};">New Announcement</h2>
        <p>${record.content || 'A new announcement has been posted in Nest.'}</p>
        <hr>
        <small style="color: #888;">Eden Oasis Nest System</small>
      </div>
    `;
            console.log('[Notification Trigger] Fetching users for announcement');
            const { data: users, error: usersError } = await supabase.from('profiles').select('id,email');
            if (usersError) {
                console.error('[Notification Trigger] Error fetching users:', usersError);
                throw usersError;
            }
            console.log('[Notification Trigger] Found users:', users?.length || 0);
            notificationTargets = (users || []).filter((u): u is { id: string; email: string } => !!u.email).map(u => ({ id: u.id, email: u.email }));
            category = 'announcement';
            metadata = { announcement_id: record.id };
        }

        // --- Notifications Table (direct insert) ---
        if (table === 'notifications' && type === 'INSERT') {
            // Already handled by app logic, skip
            return NextResponse.json({ success: true, info: 'Direct notification insert, no action taken.' });
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

            // Push notification: prefer firebase-admin (service account) when available; fall back to legacy FCM key
            if (sendPush) {
                try {
                    const { data: tokenRows } = await supabase.from('user_push_tokens').select('token').eq('user_id', targetId);
                    const tokens = (tokenRows || []).map((r: any) => r.token).filter(Boolean);
                    if (tokens.length === 0) {
                        // nothing to send
                    } else {
                        const webPushLib = await import('@/lib/webPush');
                        const fcmTokens: string[] = [];
                        const webPushSubscriptions: any[] = [];

                        // Categorize tokens (Web Push vs FCM)
                        for (const t of tokens) {
                            try {
                                const parsed = JSON.parse(t);
                                if (parsed && parsed.endpoint) {
                                    webPushSubscriptions.push(parsed);
                                } else {
                                    fcmTokens.push(t);
                                }
                            } catch (e) {
                                fcmTokens.push(t);
                            }
                        }

                        // 1. Send via Web Push (VAPID)
                        if (webPushSubscriptions.length > 0) {
                            for (const sub of webPushSubscriptions) {
                                try {
                                    await webPushLib.sendWebPush(sub, { title, body: message, data: (metadata as any) || {} });
                                } catch (err: any) {
                                    console.error('[Notification Trigger] WebPush individual error', err.statusCode, err.message);
                                    if (err.statusCode === 410 || err.statusCode === 404) {
                                        // Expired or invalid subscription
                                        await supabase.from('user_push_tokens').delete().eq('token', JSON.stringify(sub));
                                    }
                                }
                            }
                        }

                        // 2. Send via Firebase (Legacy / Fallback)
                        if (fcmTokens.length > 0) {
                            try {
                                const firebaseAdmin = await import('@/lib/firebaseAdmin');
                                if (firebaseAdmin && firebaseAdmin.initFirebaseAdmin && firebaseAdmin.initFirebaseAdmin()) {
                                    const resp: any = await firebaseAdmin.sendMulticast(fcmTokens, {
                                        notification: { title, body: message },
                                        data: (metadata as any) || {}
                                    });
                                    const toRemove: string[] = [];
                                    resp.responses.forEach((r: any, idx: number) => {
                                        if (!r.success) {
                                            const errCode = (r.error && (r.error as any).code) || '';
                                            if (errCode === 'messaging/registration-token-not-registered' || errCode === 'messaging/invalid-registration-token') {
                                                toRemove.push(fcmTokens[idx]);
                                            }
                                        }
                                    });
                                    if (toRemove.length) {
                                        await supabase.from('user_push_tokens').delete().in('token', toRemove as any[]);
                                    }
                                } else if (FCM_SERVER_KEY) {
                                    for (const t of fcmTokens) {
                                        await fetch(FCM_API_URL, {
                                            method: 'POST',
                                            headers: { 'Authorization': `key=${FCM_SERVER_KEY}`, 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ to: t, notification: { title, body: message }, data: metadata }),
                                        });
                                    }
                                }
                            } catch (errAdmin) {
                                console.error('[Notification Trigger] firebase-admin error', errAdmin);
                            }
                        }
                    }
                } catch (err: any) {
                    lastError = (lastError ? lastError + '; ' : '') + `Push: ${err.message}`;
                    errors.push(lastError);
                }
            }

            // Update notification with last_error if any
            if (lastError && notificationId) {
                await supabase.from('notifications').update({ last_error: lastError }).eq('id', notificationId);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Notification processed successfully',
            emailSent: targets.some(t => t.email),
            pushSent: targets.length > 0 && FCM_SERVER_KEY,
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