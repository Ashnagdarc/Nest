import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendReservationReminderEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
    // Secure with CRON_SECRET
    if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!upcomingReservations || upcomingReservations.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No upcoming reservations found for reminders'
            });
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

        return NextResponse.json({
            success: true,
            message: `Sent ${remindersSent} reservation reminder(s)`
        });

    } catch (error) {
        console.error('[Reservation Reminders Error]:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to send reservation reminders'
        }, { status: 500 });
    }
}
