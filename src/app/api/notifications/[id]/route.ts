import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
        }

        // Use admin client to verify notification belongs to the user or if user is admin
        const adminSupabase = await createSupabaseServerClient(true);
        const { data: notification, error: fetchError } = await adminSupabase
            .from('notifications')
            .select('user_id')
            .eq('id', id)
            .single();

        if (fetchError || !notification) {
            return NextResponse.json({ data: null, error: 'Notification not found' }, { status: 404 });
        }

        // Check if user can update this notification (must be the owner or admin)
        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.role === 'Admin';
        const isOwner = notification.user_id === user.id;

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
        }

        // Update the notification using admin client to bypass RLS
        const { data, error } = await adminSupabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ data, error: null });
    } catch (error) {
        console.error('Error in PUT /api/notifications/[id]:', error);
        return NextResponse.json({ data: null, error: 'Failed to update notification' }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        // Use user client for initial auth check
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
        }

        // Use admin client to fetch notification detail to bypass potential RLS restrictions
        const adminSupabase = await createSupabaseServerClient(true);
        const { data: notification, error: fetchError } = await adminSupabase
            .from('notifications')
            .select('user_id')
            .eq('id', id)
            .single();

        if (fetchError || !notification) {
            console.error('Notification not found for ID:', id);
            return NextResponse.json({ data: null, error: 'Notification not found' }, { status: 404 });
        }

        // Check permissions: owner or admin profile
        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.role === 'Admin';
        const isOwner = notification.user_id === user.id;

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
        }

        // Use admin client to perform the deletion to bypass RLS
        const { error: deleteError } = await adminSupabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Delete error:', deleteError);
            throw deleteError;
        }

        return NextResponse.json({ success: true, error: null });
    } catch (error) {
        console.error('Error in DELETE notification:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete notification'
        }, { status: 500 });
    }
}