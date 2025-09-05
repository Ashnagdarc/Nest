import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/client';
import { sendGearRequestEmail } from '@/lib/email';
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';

export async function POST(req: NextRequest) {
    // Secure with CRON_SECRET
    if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const results = {
            gearOverdue: await handleGearOverdue()
        };

        return NextResponse.json({
            success: true,
            results
        });
    } catch (error) {
        console.error('[Daily Notifications Error]:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to process daily notifications'
        }, { status: 500 });
    }
}

async function handleGearOverdue() {
    const supabase = createClient();
    const now = new Date();
    try {
        // Find all checked out gear that is overdue
        const { data: overdueGears, error } = await supabase
            .from('gears')
            .select('id, name, due_date, checked_out_to')
            .in('status', ['Checked Out', 'Partially Checked Out'])
            .lt('due_date', now.toISOString());

        if (error) {
            return { error: error.message, sent: 0 };
        }
        if (!overdueGears || overdueGears.length === 0) {
            return { message: 'No overdue gear found.', sent: 0 };
        }

        // Group by user
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

            notificationsSent++;
        }
        return { message: 'Overdue notifications sent.', sent: notificationsSent };
    } catch (err: any) {
        return { error: err.message || 'Unknown error', sent: 0 };
    }
}

// REMOVED: Calendar booking functionality
async function handleReservationReminders_DISABLED() {
    try {
        const supabase = await createSupabaseServerClient(true);
        const now = new Date();

        // Calculate dates for reminders
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const in3Days = new Date(today);
        in3Days.setDate(in3Days.getDate() + 3);

        // Find approved reservations starting today, tomorrow, or in 3 days
        const { data: upcomingReservations, error } = await supabase
            .from('gear_calendar_bookings')
            .select(`
                id,
                user_id,
                start_date,
                end_date,
                reason,
                gears(name),
                profiles(email, full_name, notification_preferences)
            `)
            .eq('status', 'Approved')
            .gte('start_date', today.toISOString())
            .lte('start_date', in3Days.toISOString());

        if (error) {
            console.error('Error fetching upcoming reservations:', error);
            return { error: error.message, sent: 0 };
        }

        if (!upcomingReservations || upcomingReservations.length === 0) {
            return {
                success: true,
                message: 'No upcoming reservations found for reminders',
                sent: 0
            };
        }

        let remindersSent = 0;

        for (const reservation of upcomingReservations) {
            if (!reservation.profiles?.email) continue;

            // Check notification preferences
            const prefs = reservation.profiles.notification_preferences || {};
            const sendEmail = prefs.email?.reservation_reminders ?? true;

            if (!sendEmail) continue;

            // Calculate days until start
            const startDate = new Date(reservation.start_date);
            const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            // Only send reminders for today (0), tomorrow (1), or in 3 days (3)
            if (![0, 1, 3].includes(daysUntilStart)) continue;

            // Check if we've already sent a reminder for this reservation and day
            const { data: existingReminder } = await supabase
                .from('notifications')
                .select('id')
                .eq('user_id', reservation.user_id)
                .eq('type', 'reservation_reminder')
                .gte('created_at', today.toISOString())
                .like('metadata->>bookingId', reservation.id)
                .single();

            if (existingReminder) continue; // Already sent reminder today

            try {
                // Send reminder email
                const emailResult = await sendReservationReminderEmail({
                    to: reservation.profiles.email,
                    userName: reservation.profiles.full_name || 'there',
                    gearName: reservation.gears?.name || 'equipment',
                    startDate: reservation.start_date,
                    endDate: reservation.end_date,
                    daysUntilStart
                });

                if (emailResult.success) {
                    // Create in-app notification to track that we sent the reminder
                    await supabase
                        .from('notifications')
                        .insert({
                            user_id: reservation.user_id,
                            type: 'reservation_reminder',
                            title: `Reservation Reminder: ${daysUntilStart === 0 ? 'Today' : daysUntilStart === 1 ? 'Tomorrow' : `${daysUntilStart} days`}`,
                            message: `Your reservation for ${reservation.gears?.name || 'equipment'} ${daysUntilStart === 0 ? 'starts today' : daysUntilStart === 1 ? 'starts tomorrow' : `starts in ${daysUntilStart} days`}.`,
                            is_read: false,
                            created_at: now.toISOString(),
                            updated_at: now.toISOString(),
                            metadata: {
                                bookingId: reservation.id,
                                gearName: reservation.gears?.name,
                                daysUntilStart,
                                reminderSent: true
                            }
                        });

                    remindersSent++;
                }
            } catch (error) {
                console.error(`Error sending reminder for reservation ${reservation.id}:`, error);
            }
        }

        return {
            success: true,
            message: `Sent ${remindersSent} reservation reminder(s)`,
            sent: remindersSent
        };

    } catch (error) {
        console.error('[Reservation Reminders Error]:', error);
        return {
            success: false,
            error: 'Failed to send reservation reminders',
            sent: 0
        };
    }
}

// REMOVED: Calendar booking functionality  
async function handleReservationDueReminders_DISABLED() {
    try {
        const supabase = await createSupabaseServerClient(true);
        const now = new Date();

        // Calculate dates for due reminders
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const in2Days = new Date(today);
        in2Days.setDate(in2Days.getDate() + 2);

        // Find approved reservations ending today, tomorrow, or in 2 days
        const { data: endingReservations, error } = await supabase
            .from('gear_calendar_bookings')
            .select(`
                id,
                user_id,
                start_date,
                end_date,
                reason,
                gears(name),
                profiles(email, full_name, notification_preferences)
            `)
            .eq('status', 'Approved')
            .gte('end_date', today.toISOString())
            .lte('end_date', in2Days.toISOString());

        if (error) {
            console.error('Error fetching ending reservations:', error);
            return { error: error.message, sent: 0 };
        }

        if (!endingReservations || endingReservations.length === 0) {
            return {
                success: true,
                message: 'No ending reservations found for due reminders',
                sent: 0
            };
        }

        let remindersSent = 0;

        for (const reservation of endingReservations) {
            if (!reservation.profiles?.email) continue;

            // Check notification preferences
            const prefs = reservation.profiles.notification_preferences || {};
            const sendEmail = prefs.email?.due_date_reminders ?? true;

            if (!sendEmail) continue;

            // Calculate days until due
            const endDate = new Date(reservation.end_date);
            const daysUntilDue = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            // Only send reminders for today (0), tomorrow (1), or in 2 days (2)
            if (![0, 1, 2].includes(daysUntilDue)) continue;

            // Check if we've already sent a due reminder for this reservation and day
            const { data: existingReminder } = await supabase
                .from('notifications')
                .select('id')
                .eq('user_id', reservation.user_id)
                .eq('type', 'reservation_due_reminder')
                .gte('created_at', today.toISOString())
                .like('metadata->>bookingId', reservation.id)
                .single();

            if (existingReminder) continue; // Already sent reminder today

            try {
                let reminderText = '';
                let subject = '';

                if (daysUntilDue === 0) {
                    reminderText = 'Your reservation ends today! Please return the equipment.';
                    subject = `📅 Return Today: ${reservation.gears?.name || 'Equipment'}`;
                } else if (daysUntilDue === 1) {
                    reminderText = 'Your reservation ends tomorrow. Please prepare to return the equipment.';
                    subject = `📅 Return Tomorrow: ${reservation.gears?.name || 'Equipment'}`;
                } else {
                    reminderText = `Your reservation ends in ${daysUntilDue} days. Please prepare to return the equipment.`;
                    subject = `📅 Return in ${daysUntilDue} days: ${reservation.gears?.name || 'Equipment'}`;
                }

                // Send due reminder email
                const emailResult = await sendGearRequestEmail({
                    to: reservation.profiles.email,
                    subject,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
                            <h2 style="color: #f59e0b;">📅 Reservation Due Reminder</h2>
                            <p>Dear ${reservation.profiles.full_name || 'there'},</p>
                            <p>${reminderText}</p>
                            
                            <div style="background-color: #fef5e7; border: 1px solid #f59e0b; border-radius: 6px; padding: 20px; margin: 20px 0;">
                                <h3 style="margin-top: 0; color: #744210;">Reservation Details</h3>
                                <p><strong>Equipment:</strong> ${reservation.gears?.name || 'Equipment'}</p>
                                <p><strong>Start Date:</strong> ${new Date(reservation.start_date).toLocaleDateString()}</p>
                                <p><strong>End Date:</strong> ${new Date(reservation.end_date).toLocaleDateString()}</p>
                                <p><strong>Reason:</strong> ${reservation.reason}</p>
                            </div>

                            <div style="background-color: ${daysUntilDue === 0 ? '#fed7d7' : '#ebf8ff'}; border-left: 4px solid ${daysUntilDue === 0 ? '#f56565' : '#4299e1'}; padding: 16px; margin: 20px 0; border-radius: 0 6px 6px 0;">
                                <p><strong>${daysUntilDue === 0 ? 'Action Required:' : 'Reminder:'}</strong></p>
                                <p>${daysUntilDue === 0
                            ? 'Please return the equipment today to avoid late fees.'
                            : 'Please ensure the equipment is ready for return on the due date.'
                        }</p>
                            </div>
                            
                            <p>Thank you for using Nest by Eden Oasis!</p>
                            <hr>
                            <small style="color: #888;">Nest by Eden Oasis Equipment Management</small>
                        </div>
                    `,
                });

                if (emailResult.success) {
                    // Create in-app notification to track that we sent the reminder
                    await supabase
                        .from('notifications')
                        .insert({
                            user_id: reservation.user_id,
                            type: 'reservation_due_reminder',
                            title: `Due ${daysUntilDue === 0 ? 'Today' : daysUntilDue === 1 ? 'Tomorrow' : `in ${daysUntilDue} days`}: ${reservation.gears?.name || 'Equipment'}`,
                            message: reminderText,
                            is_read: false,
                            created_at: now.toISOString(),
                            updated_at: now.toISOString(),
                            metadata: {
                                bookingId: reservation.id,
                                gearName: reservation.gears?.name,
                                daysUntilDue,
                                reminderSent: true
                            }
                        });

                    remindersSent++;
                }
            } catch (error) {
                console.error(`Error sending due reminder for reservation ${reservation.id}:`, error);
            }
        }

        return {
            success: true,
            message: `Sent ${remindersSent} reservation due reminder(s)`,
            sent: remindersSent
        };

    } catch (error) {
        console.error('[Reservation Due Reminders Error]:', error);
        return {
            success: false,
            error: 'Failed to send reservation due reminders',
            sent: 0
        };
    }
}
