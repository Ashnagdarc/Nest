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
        const { data: overdueGears, error } = await supabase
            .from('gears')
            .select('id, name, due_date, checked_out_to')
            .eq('status', 'Checked Out')
            .lt('due_date', now.toISOString());

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        if (!overdueGears || overdueGears.length === 0) {
            return NextResponse.json({ message: 'No overdue gear found.' });
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
            await notifyGoogleChat(NotificationEventType.GEAR_OVERDUE, {
                userName: userProfile.full_name,
                userEmail: userProfile.email,
                gearNames: userGearMap[userId].gearNames,
                dueDate: earliestDue,
                overdueDays,
            });
        }
        return NextResponse.json({ message: 'Overdue notifications sent.' });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
    }
} 