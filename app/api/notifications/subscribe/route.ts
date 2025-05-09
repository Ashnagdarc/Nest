import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

const vapidKeys = {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    privateKey: process.env.VAPID_PRIVATE_KEY!,
    subject: process.env.VAPID_SUBJECT || 'mailto:your-email@example.com'
};

webpush.setVapidDetails(
    vapidKeys.subject,
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

export async function POST(request: Request) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const subscription = await request.json();

        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Store the subscription in Supabase
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: user.id,
                subscription: subscription,
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error('Error storing subscription:', error);
            return NextResponse.json({ error: 'Failed to store subscription' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Subscription successful' });
    } catch (error) {
        console.error('Error in subscription handler:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 