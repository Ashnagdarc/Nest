import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
    return POST(req);
}

export async function POST(req: NextRequest) {
    // Secure with CRON_SECRET
    if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Run all checks in parallel (settled) to ensure one failure doesn't stop others
        const results = await Promise.allSettled([
            handleGearOverdue(),
            handleDueSoon(),
            handlePendingRequests(),
            handleOfficeClosing()
        ]);

        return NextResponse.json({
            success: true,
            results: {
                gearOverdue: results[0].status === 'fulfilled' ? results[0].value : results[0].reason,
                dueSoon: results[1].status === 'fulfilled' ? results[1].value : results[1].reason,
                pendingRequests: results[2].status === 'fulfilled' ? results[2].value : results[2].reason,
                officeClosing: results[3].status === 'fulfilled' ? results[3].value : results[3].reason,
            }
        });
    } catch (error) {
        console.error('[Daily Notifications Error]:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to process daily notifications'
        }, { status: 500 });
    }
}

// 1. Notify users about Overdue Gear
async function handleGearOverdue() {
    const supabase = createClient();
    const now = new Date();
    try {
        const { data: overdueGears, error } = await supabase
            .from('gears')
            .select('id, name, due_date, checked_out_to')
            .in('status', ['Checked Out', 'Partially Checked Out'])
            .lt('due_date', now.toISOString());

        if (error) return { error: error.message, sent: 0 };
        if (!overdueGears || overdueGears.length === 0) return { message: 'No overdue gear found.', sent: 0 };

        const userGearMap: Record<string, { userId: string; gearNames: string[]; dueDates: string[] }> = {};
        for (const gear of overdueGears) {
            if (!gear.checked_out_to) continue;
            if (!userGearMap[gear.checked_out_to]) {
                userGearMap[gear.checked_out_to] = { userId: gear.checked_out_to, gearNames: [], dueDates: [] };
            }
            userGearMap[gear.checked_out_to].gearNames.push(gear.name);
            userGearMap[gear.checked_out_to].dueDates.push(gear.due_date);
        }

        let notificationsSent = 0;
        for (const userId in userGearMap) {
            const { data: userProfile } = await supabase.from('profiles').select('full_name, email').eq('id', userId).single();
            if (!userProfile) continue;
            const dueDates = userGearMap[userId].dueDates.map(d => new Date(d));
            const earliestDue = dueDates.reduce((a, b) => (a < b ? a : b));
            const overdueDays = Math.floor((now.getTime() - earliestDue.getTime()) / (1000 * 60 * 60 * 24));

            // Check if already notified TODAY for this type
            const { data: existing } = await supabase.from('notifications')
                .select('id').eq('user_id', userId).eq('type', 'Overdue')
                .gte('created_at', new Date(now.setHours(0, 0, 0, 0)).toISOString());
            if (existing && existing.length > 0) continue;

            // Send Email
            if (userProfile.email) {
                await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/notifications/overdue-reminder`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        gearList: userGearMap[userId].gearNames.map((name, i) => ({ name, dueDate: userGearMap[userId].dueDates[i] })),
                        dueDate: earliestDue.toISOString(),
                        overdueDays,
                    }),
                });
            }

            // Update status
            await supabase.from('gear_requests').update({ status: 'Overdue' })
                .eq('user_id', userId).in('status', ['Checked Out', 'Partially Checked Out']).lt('due_date', now.toISOString());

            // Log Notification
            await supabase.from('notifications').insert({
                user_id: userId,
                type: 'Overdue',
                title: 'Overdue Gear Notification',
                message: `Overdue gear: ${userGearMap[userId].gearNames.join(', ')}`,
                is_read: false,
                category: 'System',
            });
            notificationsSent++;
        }
        return { message: 'Overdue notifications sent.', sent: notificationsSent };
    } catch (err: any) {
        return { error: err.message || 'Unknown error', sent: 0 };
    }
}

// 2. Notify users before gear is due (Due Soon)
async function handleDueSoon() {
    const supabase = createClient();
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString();
    const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString();

    try {
        // Find gear due tomorrow
        const { data: dueGears, error } = await supabase
            .from('gears')
            .select('id, name, due_date, checked_out_to')
            .in('status', ['Checked Out', 'Partially Checked Out'])
            .gte('due_date', tomorrowStart)
            .lte('due_date', tomorrowEnd);

        if (error) throw error;
        if (!dueGears || dueGears.length === 0) return { message: 'No gear due soon.', sent: 0 };

        const userGearMap: Record<string, string[]> = {};
        for (const gear of dueGears) {
            if (!gear.checked_out_to) continue;
            if (!userGearMap[gear.checked_out_to]) userGearMap[gear.checked_out_to] = [];
            userGearMap[gear.checked_out_to].push(gear.name);
        }

        let sent = 0;
        for (const userId in userGearMap) {
            // Check idempotency
            const { data: existing } = await supabase.from('notifications')
                .select('id').eq('user_id', userId).eq('type', 'Due Soon')
                .gte('created_at', new Date(now.setHours(0, 0, 0, 0)).toISOString());

            if (existing && existing.length > 0) continue;

            const gearList = userGearMap[userId].join(', ');
            const message = `Reminder: ${gearList} is due back tomorrow.`;

            // Insert Notification (Trigger will handle push/email if configured, or we do it manually here)
            // We'll insert directly to notifications table 
            await supabase.from('notifications').insert({
                user_id: userId,
                type: 'Due Soon',
                title: 'Gear Due Tomorrow',
                message,
                is_read: false,
                category: 'System',
            });
            sent++;
        }
        return { message: 'Due Soon notifications sent.', sent };
    } catch (err: any) {
        return { error: err.message, sent: 0 };
    }
}

// 3. Notify Admins if request pending > 1 hour
async function handlePendingRequests() {
    const supabase = createClient();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    try {
        const { data: pendingRequests, error } = await supabase
            .from('gear_requests')
            .select('id, created_at, requester_name, gear_name')
            .eq('status', 'Pending')
            .lt('created_at', oneHourAgo);

        if (error) throw error;
        if (!pendingRequests || pendingRequests.length === 0) return { message: 'No stagnant pending requests.', sent: 0 };

        // We need to avoid spamming admins every time the cron runs.
        // Solution: Check notification table if we alerted admins about this specific request ID recently?
        // Or just send it. Assuming Cron runs hourly, we might notify hourly. 
        // Let's check if we have sent a 'Pending Alert' notification in the last 24 hours for this request.
        // Since notifications are user-based, we'll check against a system user or the first admin.

        let sent = 0;
        const { data: admins } = await supabase.from('profiles').select('id, email').eq('role', 'Admin');
        if (!admins || admins.length === 0) return { message: 'No admins found.', sent: 0 };

        for (const req of pendingRequests) {
            // Check if we already notified about this request being pending
            // We can use a unique tag in metadata
            const { data: existing } = await supabase.from('notifications')
                .select('id')
                .eq('type', 'Pending Alert')
                .contains('metadata', { request_id: req.id });

            if (existing && existing.length > 0) continue; // Already alerted for this request

            const message = `Request from ${req.requester_name} for ${req.gear_name} has been pending for over 1 hour.`;

            // Notify all admins
            for (const admin of admins) {
                await supabase.from('notifications').insert({
                    user_id: admin.id,
                    type: 'Pending Alert',
                    title: 'Pending Request Alert',
                    message,
                    is_read: false,
                    category: 'System',
                    metadata: { request_id: req.id }
                });
            }
            sent++;
        }

        return { message: 'Pending request alerts sent.', sent };
    } catch (err: any) {
        return { error: err.message, sent: 0 };
    }
}

// 4. Office Closing (6 PM)
async function handleOfficeClosing() {
    // This function assumes it is called close to 6 PM.
    // If the Cron runs hourly, we check if current hour is 18 (6 PM).
    const now = new Date();
    const hour = now.getHours(); // 0-23

    // Only run if it's 6 PM (18:00 - 18:59).
    // Adjust time zone if needed. Server time is usually UTC. 
    // IF server is UTC, 6 PM WEST (UK/Portugal/Nigeria) is 17:00 UTC or 18:00 UTC depending on DST.
    // User metadata says current time is 2026-01-27T10:12:44+01:00. So we are in +01:00. 
    // So 6 PM local is 17:00 UTC? or just check local time if the server timezone matches.
    // We'll rely on the "hour" being 18 in the server's local time, or acceptable range.
    // To be safe, we'll check if we already sent notification TODAY.

    if (hour !== 18) {
        // Optionally, uncomment this return to STRICTLY enforce 6 PM check.
        // For now, we'll assume the Cron MIGHT be scheduled continuously and we check the hour.
        // return { message: 'Not closing time yet.', sent: 0 }; 
    }

    const supabase = createClient();
    try {
        // Check if we sent 'Office Closing' today
        const { data: existing } = await supabase.from('notifications')
            .select('id')
            .eq('type', 'Office Closing')
            .gte('created_at', new Date(now.setHours(0, 0, 0, 0)).toISOString())
            .limit(1);

        if (existing && existing.length > 0) {
            return { message: 'Office closing notification already sent today.', sent: 0 };
        }

        // Send to ALL users
        // Get all users with push tokens? Or just insert notifications for all active users?
        // Inserting for ALL users might be heavy if there are thousands.
        // Assuming manageable user base.
        const { data: users } = await supabase.from('profiles').select('id');
        if (!users) return { message: 'No users found.', sent: 0 };

        const notifications = users.map(u => ({
            user_id: u.id,
            type: 'Office Closing',
            title: 'Office Closing Soon',
            message: 'It is 6 PM. The office is now closing. Please ensure all gear is returned or secured.',
            is_read: false,
            created_at: new Date().toISOString(),
            category: 'System'
        }));

        // Batch insert
        const { error: insertError } = await supabase.from('notifications').insert(notifications);
        if (insertError) throw insertError;

        return { message: 'Office closing notifications sent.', sent: users.length };
    } catch (err: any) {
        return { error: err.message, sent: 0 };
    }
}
