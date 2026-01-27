import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient(true);
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();

        // Check if we already notified the user about this login session recently
        // We'll check the 'notifications' table for 'Login Alert' in the last 10 minutes
        const { data: existing } = await supabase.from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', 'Login Alert')
            .gte('created_at', tenMinutesAgo)
            .limit(1);

        if (existing && existing.length > 0) {
            return NextResponse.json({ success: true, message: 'Login notification already sent recently' });
        }

        await supabase.from('notifications').insert({
            user_id: user.id,
            type: 'Login Alert',
            title: 'New Login Detected',
            message: `A new login to your account was detected on ${now.toLocaleString()}. If this wasn't you, please contact support.`,
            is_read: false,
            category: 'Security',
        });

        return NextResponse.json({ success: true, message: 'Login notification sent' });
    } catch (err: any) {
        console.error('[Login Notification Error]', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
