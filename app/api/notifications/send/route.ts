import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

const vapidKeys = {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    privateKey: process.env.VAPID_PRIVATE_KEY!,
    subject: process.env.VAPID_SUBJECT!
};

webpush.setVapidDetails(
    vapidKeys.subject,
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

export async function POST(request: Request) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const { message, userId } = await request.json();

        // Verify admin status or permissions here
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's subscription
        const { data: subscriptions, error: subError } = await supabase
            .from('push_subscriptions')
            .select('subscription')
            .eq('user_id', userId || user.id);

        if (subError || !subscriptions?.length) {
            return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
        }

        // Send notification to all user's subscriptions
        const results = await Promise.all(
            subscriptions.map(async (sub) => {
                try {
                    await webpush.sendNotification(
                        sub.subscription,
                        message
                    );
                    return { success: true };
                } catch (error) {
                    console.error('Error sending notification:', error);
                    return { success: false, error };
                }
            })
        );

        return NextResponse.json({ results });
    } catch (error) {
        console.error('Error in send notification handler:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 