import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    // Secure with CRON_SECRET
    if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = await createSupabaseServerClient(true);

        console.log('[Good Morning] Sending good morning notifications...');

        // Get all active users and admins
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('status', 'Active');

        if (error) {
            console.error('[Good Morning] Error fetching users:', error);
            return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
        }

        if (!users || users.length === 0) {
            return NextResponse.json({ message: 'No active users found' });
        }

        // Queue good morning pushes for all users
        const pushNotifications = users.map(user => ({
            user_id: user.id,
            title: 'Good Morning! 🌅',
            body: 'Have a productive day at Nest by Eden Oasis. Remember to check your gear and tasks.',
            data: { type: 'good_morning' },
            status: 'pending'
        }));

        const { error: pushError } = await supabase
            .from('push_notification_queue')
            .insert(pushNotifications);

        if (pushError) {
            console.error('[Good Morning] Failed to queue pushes:', pushError);
            return NextResponse.json({ error: 'Failed to queue notifications' }, { status: 500 });
        }

        console.log(`[Good Morning] Queued ${users.length} good morning notifications`);

        return NextResponse.json({
            message: `Good morning notifications sent to ${users.length} users`,
            sent: users.length
        });

    } catch (error: any) {
        console.error('[Good Morning] Error:', error);
        return NextResponse.json({
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}