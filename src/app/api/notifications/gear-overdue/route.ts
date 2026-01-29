import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';

export async function POST(req: NextRequest) {
    // Secure with CRON_SECRET
    if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = createClient();
    const now = new Date();
    try {
        // Find all checked out gear that is overdue
        const { data: overdueGearStates, error } = await supabase
            .from('gear_states')
            .select(`
                id, 
                gear_id,
                due_date,
                checked_out_to,
                gears!inner(name)
            `)
            .eq('status', 'Checked Out')
            .not('checked_out_to', 'is', null)
            .lt('due_date', now.toISOString());

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        if (!overdueGearStates || overdueGearStates.length === 0) {
            return NextResponse.json({ message: 'No overdue gear found.' });
        }

        // Group by user
        const userGearMap: Record<string, { userId: string; gearNames: string[]; dueDates: string[] }> = {};
        for (const gearState of overdueGearStates) {
            if (!gearState.checked_out_to) continue;
            if (!userGearMap[gearState.checked_out_to]) {
                userGearMap[gearState.checked_out_to] = { userId: gearState.checked_out_to, gearNames: [], dueDates: [] };
            }
            userGearMap[gearState.checked_out_to].gearNames.push(gearState.gears.name);
            userGearMap[gearState.checked_out_to].dueDates.push(gearState.due_date);
        }

        // For each user, send a notification
        for (const userId in userGearMap) {
            // Get user profile
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', userId)
                .single();
            if (!userProfile) continue;
            // Find the most overdue date
            const dueDates = userGearMap[userId].dueDates.map(d => new Date(d));
            const earliestDue = dueDates.reduce((a, b) => (a < b ? a : b));
            const overdueDays = Math.floor((now.getTime() - earliestDue.getTime()) / (1000 * 60 * 60 * 24));

            // Idempotency: Check if notification already sent for this user/earliestDue
            const { data: existingNotifications } = await supabase
                .from('notifications')
                .select('id')
                .eq('user_id', userId)
                .eq('type', 'overdue')
                .eq('created_at', earliestDue.toISOString().split('T')[0]);
            if (existingNotifications && existingNotifications.length > 0) {
                continue; // Already notified for this overdue event
            }

            // Send overdue email to user
            if (userProfile.email) {
                await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/send-gear-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: userProfile.email,
                        subject: `Overdue Gear Notice: ${userGearMap[userId].gearNames.join(', ')}`,
                        html: `
                            <h2>Overdue Gear Notice</h2>
                            <p>Dear ${userProfile.full_name},</p>
                            <p>The following gear is overdue for return:</p>
                            <ul>
                                ${userGearMap[userId].gearNames.map(name => `<li>${name}</li>`).join('')}
                            </ul>
                            <p>Earliest due date: <b>${earliestDue.toLocaleDateString()}</b> (${overdueDays} days overdue)</p>
                            <p>Please return your gear as soon as possible to avoid penalties.</p>
                            <br/>
                            <p>— Nest by Eden Oasis Team</p>
                        `,
                    }),
                });
            }

            // Update related gear_requests to 'Overdue'
            await supabase
                .from('gear_requests')
                .update({ status: 'Overdue' })
                .eq('user_id', userId)
                .in('status', ['Checked Out', 'Partially Checked Out'])
                .lt('due_date', now.toISOString());

            await notifyGoogleChat(NotificationEventType.GEAR_OVERDUE, {
                userName: userProfile.full_name,
                userEmail: userProfile.email,
                gearNames: userGearMap[userId].gearNames,
                dueDate: earliestDue,
                overdueDays,
            });

            // Send enhanced overdue reminder email to user
            try {
                await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/notifications/overdue-reminder`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        gearList: userGearMap[userId].gearNames.map((name: string, index: number) => ({
                            name,
                            dueDate: userGearMap[userId].dueDates[index] || earliestDue.toISOString()
                        })),
                        dueDate: earliestDue.toISOString(),
                        overdueDays,
                    }),
                });
            } catch (error) {
                console.error('Error sending overdue reminder email:', error);
            }

            // Notify all admins by email
            const { data: admins } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('role', 'Admin')
                .eq('status', 'Active');
            if (admins && Array.isArray(admins)) {
                for (const admin of admins) {
                    if (admin.email) {
                        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/send-gear-email`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                to: admin.email,
                                subject: `Overdue Gear Alert: ${userProfile.full_name}`,
                                html: `
                                    <h2>Overdue Gear Alert</h2>
                                    <p>User <b>${userProfile.full_name}</b> (${userProfile.email}) has overdue gear:</p>
                                    <ul>
                                        ${userGearMap[userId].gearNames.map(name => `<li>${name}</li>`).join('')}
                                    </ul>
                                    <p>Earliest due date: <b>${earliestDue.toLocaleDateString()}</b> (${overdueDays} days overdue)</p>
                                    <p>Please follow up as needed.</p>
                                    <br/>
                                    <p>— Nest by Eden Oasis System</p>
                                `,
                            }),
                        });
                    }
                }
            }

            // Log notification for idempotency
            await supabase.from('notifications').insert({
                user_id: userId,
                type: 'Overdue',
                title: 'Overdue Gear Notification',
                message: `Overdue gear: ${userGearMap[userId].gearNames.join(', ')}`,
                is_read: false,
                created_at: earliestDue.toISOString().split('T')[0],
                category: 'System',
            });
        }
        return NextResponse.json({ message: 'Overdue notifications sent.' });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
    }
} 