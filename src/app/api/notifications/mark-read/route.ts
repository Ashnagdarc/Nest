import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const { notificationId } = await request.json();

        if (!notificationId) {
            return NextResponse.json(
                { error: 'Missing notificationId parameter' },
                { status: 400 }
            );
        }

        // Create user-scoped client for auth and admin client for mutations
        const supabase = await createSupabaseServerClient();
        const admin = await createSupabaseServerClient(true);

        // Get the user's session
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('Authentication error:', authError);
            return NextResponse.json(
                { error: 'User not authenticated' },
                { status: 401 }
            );
        }

        const { data, error } = await admin
            .from('notifications')
            .update({ is_read: true, updated_at: new Date().toISOString() })
            .eq('id', notificationId)
            .eq('user_id', user.id)
            .eq('is_read', false)
            .select('id')
            .maybeSingle();

        if (error) {
            console.error('Server: Error marking notification as read:', error);
            return NextResponse.json({ error: 'Failed to mark notification as read', details: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json(
                { error: 'Notification not found or already read' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            marked: data?.id
        });

    } catch (error) {
        console.error('Server: Exception in mark-read API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        // Mark all notifications as read
        const supabase = await createSupabaseServerClient();
        const admin = await createSupabaseServerClient(true);

        // Get the user's session
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('Authentication error:', authError);
            return NextResponse.json(
                { error: 'User not authenticated' },
                { status: 401 }
            );
        }

        const { data, error } = await admin
            .from('notifications')
            .update({ is_read: true, updated_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('is_read', false)
            .select('id');

        if (error) {
            console.error('Server: Error marking all notifications as read:', error);
            return NextResponse.json(
                { error: 'Failed to mark all notifications as read', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            count: Array.isArray(data) ? data.length : 0
        });

    } catch (error) {
        console.error('Server: Exception in mark-all-read API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 
