import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendGearRequestEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
    // Secure with CRON_SECRET
    if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!endingReservations || endingReservations.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No ending reservations found for due reminders'
            });
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

        return NextResponse.json({
            success: true,
            message: `Sent ${remindersSent} reservation due reminder(s)`
        });

    } catch (error) {
        console.error('[Reservation Due Reminders Error]:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to send reservation due reminders'
        }, { status: 500 });
    }
}
