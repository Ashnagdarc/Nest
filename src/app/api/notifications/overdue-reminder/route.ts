import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendOverdueReminderEmail } from '@/lib/email';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient(true) as SupabaseClient<Database>;
        const { userId, gearList, dueDate, overdueDays } = await req.json();

        if (!userId || !gearList || !dueDate || !overdueDays) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: userId, gearList, dueDate, or overdueDays'
            }, { status: 400 });
        }

        // Get user details
        const { data: user } = await supabase
            .from('profiles')
            .select('email, full_name, notification_preferences')
            .eq('id', userId)
            .single();

        if (!user?.email) {
            return NextResponse.json({
                success: false,
                error: 'User not found or no email address'
            }, { status: 404 });
        }

        // Check user notification preferences
        const prefs = user.notification_preferences || {};
        const sendEmail = prefs.email?.overdue_reminders ?? true; // Default to true for overdue reminders

        if (!sendEmail) {
            return NextResponse.json({
                success: true,
                message: 'Email notifications disabled for this user'
            });
        }

        // Send overdue reminder email
        const result = await sendOverdueReminderEmail({
            to: user.email,
            userName: user.full_name || 'there',
            gearList: gearList.map((gear: any) => ({
                name: gear.name,
                dueDate: gear.dueDate || dueDate
            })),
            dueDate,
            overdueDays,
        });

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Overdue reminder email sent successfully'
        });

    } catch (error) {
        console.error('[Overdue Reminder Error]:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to send overdue reminder email'
        }, { status: 500 });
    }
}
