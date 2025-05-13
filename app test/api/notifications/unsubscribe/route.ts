import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const subscription = await request.json();

        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Remove the subscription from Supabase
        const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .match({ user_id: user.id });

        if (error) {
            console.error('Error removing subscription:', error);
            return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Unsubscription successful' });
    } catch (error) {
        console.error('Error in unsubscription handler:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 