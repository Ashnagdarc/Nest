import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendGearRequestEmail } from '@/lib/email';
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
                notificationTargets = (admins || []).filter((a): a is { id: string; email: string; notification_preferences?: Record<string, unknown>; role: string } => !!a.email).map(a => ({ id: a.id, email: a.email, preferences: a['notification_preferences'] }));
                // ALSO notify the user who made the request
                if (record.user_id) {
                    const { data: user } = await supabase.from('profiles').select('email,full_name,notification_preferences').eq('id', record.user_id).single();
                    if (user?.email) {
                        const userTitle = 'Your Gear Request Was Received!';
                        const userMessage = `Hi ${user.full_name || 'there'}, your request for ${record.gear_name || 'equipment'} has been received and is pending approval.`;
                        const userEmailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
              <img src="${BRAND_LOGO_URL}" alt="Nest by Eden Oasis" style="height: 40px; margin-bottom: 16px;">
              <h2 style="color: ${BRAND_COLOR};">Request Received</h2>
              <p>Hi ${user.full_name || 'there'},</p>
              <p>Your request for <strong>${record.gear_name || 'equipment'}</strong> has been received and is pending approval.</p>
              <p>We will notify you as soon as it is approved.</p>
              <p>View your request in <a href="https://nestbyeden.app/user/my-requests">Nest by Eden Oasis</a>.</p>
              <hr>
              <small style="color: #888;">Nest by Eden Oasis Team</small>
            </div>
          `;
                        // Respect user preferences for confirmation
                        const prefs = user.notification_preferences || {};
                        const sendEmail = prefs.email?.gear_requests ?? notificationDefaults.email;
                        const sendInApp = prefs.in_app?.gear_requests ?? notificationDefaults.in_app;
                        if (sendInApp) {
                            await supabase.from('notifications').insert([
                                {
                                    user_id: record.user_id,
                                    type: 'gear_requests',
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
                                await sendGearRequestEmail({
                                    to: user.email,
                                    subject: userTitle,
                                    html: userEmailHtml,
                                });
                            } catch (err: any) {
                                console.error('[Email Notification Error]', err);
                            }
                        }
                    }
                }
            } else if (type === 'UPDATE' && record.status === 'approved' && old_record.status !== 'approved') {
                title = 'Your Gear Request Was Approved!';
                message = `Your request for ${record.gear_name || 'equipment'} has been approved.`;
                emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <img src="${BRAND_LOGO_URL}" alt="Nest by Eden Oasis" style="height: 40px; margin-bottom: 16px;">
          <h2 style="color: ${BRAND_COLOR};">Request Approved</h2>
          <p>Hi ${record.requester_name || 'there'},</p>
          <p>Your request for <strong>${record.gear_name || 'equipment'}</strong> has been <b>approved</b>.</p>
          <p>Pick up your gear at the designated location.</p>
          <p>View details in <a href="https://nestbyeden.app/user/my-requests">Nest by Eden Oasis</a>.</p>
          <hr>
          <small style="color: #888;">Nest by Eden Oasis Team</small>
        </div>
      `;
                userId = record.user_id;
                category = 'request';
                metadata = { gear_id: record.gear_id, request_id: record.id };
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
        if (table === 'checkins' && type === 'INSERT') {
            // Notify user of successful check-in
            title = 'Gear Checked In';
            message = 'You have successfully checked in gear.';
            emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <img src="${BRAND_LOGO_URL}" alt="Nest by Eden Oasis" style="height: 40px; margin-bottom: 16px;">
        <h2 style="color: ${BRAND_COLOR};">Gear Checked In</h2>
        <p>You have successfully checked in your gear.</p>
        <p>Thank you for using Nest!</p>
        <hr>
        <small style="color: #888;">Nest by Eden Oasis Team</small>
      </div>
    `;
            userId = record.user_id;
            category = 'gear_checkin';
            metadata = { gear_id: record.gear_id, checkin_id: record.id };
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

        // --- Profile Updates ---
        if (table === 'profiles' && type === 'UPDATE') {
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
            const sendInApp = prefs.in_app?.[table] ?? notificationDefaults.in_app;
            const sendEmail = prefs.email?.[table] ?? notificationDefaults.email;
            const sendPush = prefs.push?.[table] ?? notificationDefaults.push;

            // In-app notification
            if (sendInApp) {
                try {
                    const { data, error } = await supabase.from('notifications').insert([
                        {
                            user_id: targetId,
                            type: table,
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
                    // Check if Resend is configured
                    if (!process.env.RESEND_API_KEY) {
                        throw new Error('RESEND_API_KEY environment variable is not configured');
                    }

                    await sendGearRequestEmail({
                        to: targetEmail,
                        subject: title,
                        html: emailHtml || `<p>${message}</p>`,
                    });
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

            // Push notification
            if (sendPush && FCM_SERVER_KEY) {
                try {
                    const { data: tokens } = await supabase.from('user_push_tokens').select('token').eq('user_id', targetId);
                    for (const row of tokens || []) {
                        await fetch(FCM_API_URL, {
                            method: 'POST',
                            headers: {
                                'Authorization': `key=${FCM_SERVER_KEY}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                to: row.token,
                                notification: {
                                    title,
                                    body: message,
                                },
                                data: metadata,
                            }),
                        });
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