import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(_request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;

        // First, verify the notification belongs to the user
        const { data: notification, error: fetchError } = await supabase
            .from('notifications')
            .select('user_id')
            .eq('id', id)
            .single();

        if (fetchError || !notification) {
            return NextResponse.json({ data: null, error: 'Notification not found' }, { status: 404 });
        }

        // Check if user can update this notification (must be the owner or admin)
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.role === 'Admin';
        const isOwner = notification.user_id === user.id;

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
        }

        // Update the notification
        const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ data, error: null });
    } catch (error) {
        return NextResponse.json({ data: null, error: 'Failed to update notification' }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const supabase = await createSupabaseServerClient();
        const { id } = params;
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to delete notification' }, { status: 500 });
    }
} 