import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAdmin } from '@/app/api/_utils/route-auth';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authContext = await requireActiveAdmin();
        if ('errorResponse' in authContext) {
            return authContext.errorResponse;
        }

        const { id } = await params;
        console.log('🔍 Admin Update Notification API called for ID:', id);
        const supabase = authContext.adminSupabase;

        const body = await request.json();
        const { is_read, ...otherUpdates } = body;

        console.log('📝 Updating admin notification:', { id, updates: body });

        // Update the notification
        const { data, error } = await supabase
            .from('notifications')
            .update({
                is_read,
                ...otherUpdates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select(`
                id,
                type,
                title,
                message,
                is_read,
                created_at,
                updated_at,
                link,
                metadata,
                category,
                priority,
                expires_at,
                profiles:user_id (
                    id,
                    full_name,
                    email,
                    role
                )
            `)
            .single();

        if (error) {
            console.error('❌ Error updating admin notification:', error);
            return NextResponse.json({ data: null, error: `Failed to update notification: ${error.message}` }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ data: null, error: 'Notification not found' }, { status: 404 });
        }

        console.log('✅ Admin notification updated successfully:', data.id);

        return NextResponse.json({
            data,
            error: null
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Exception in PUT /api/admin/notifications/[id]:', error);
        return NextResponse.json({ data: null, error: msg }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authContext = await requireActiveAdmin();
        if ('errorResponse' in authContext) {
            return authContext.errorResponse;
        }

        const { id } = await params;
        console.log('🔍 Admin Delete Notification API called for ID:', id);
        const supabase = authContext.adminSupabase;

        console.log('🗑️ Deleting admin notification:', id);

        // Delete the notification
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('❌ Error deleting admin notification:', error);
            return NextResponse.json({ data: null, error: `Failed to delete notification: ${error.message}` }, { status: 500 });
        }

        console.log('✅ Admin notification deleted successfully:', id);

        return NextResponse.json({
            success: true,
            error: null
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Exception in DELETE /api/admin/notifications/[id]:', error);
        return NextResponse.json({ data: null, error: msg }, { status: 500 });
    }
}
