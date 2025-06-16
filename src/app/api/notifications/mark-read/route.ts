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

        // Create Supabase client with proper server-side auth
        const supabase = createSupabaseServerClient();

        // Get the user's session
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'User not authenticated' },
                { status: 401 }
            );
        }

        // Use the standardized function with proper error handling
        const { data, error } = await supabase.rpc('mark_notification_as_read', {
            notification_id: notificationId
        });

        if (error) {
            console.error('Server: Error marking notification as read:', error);
            return NextResponse.json(
                { error: 'Failed to mark notification as read', details: error.message },
                { status: 500 }
            );
        }

        if (!data) {
            return NextResponse.json(
                { error: 'Notification not found or already read' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            marked: data
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
        const supabase = createSupabaseServerClient();

        // Get the user's session
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'User not authenticated' },
                { status: 401 }
            );
        }

        // Use the standardized function
        const { data, error } = await supabase.rpc('mark_all_notifications_as_read');

        if (error) {
            console.error('Server: Error marking all notifications as read:', error);
            return NextResponse.json(
                { error: 'Failed to mark all notifications as read', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            count: data || 0
        });

    } catch (error) {
        console.error('Server: Exception in mark-all-read API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 