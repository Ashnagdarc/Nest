import { NextResponse } from 'next/server';
import { requireActiveAdmin } from '@/app/api/_utils/route-auth';

export async function PUT() {
    try {
        console.log('🔍 Admin Mark All Notifications Read API called');
        const authContext = await requireActiveAdmin();
        if ('errorResponse' in authContext) {
            return authContext.errorResponse;
        }

        const supabase = authContext.adminSupabase;

        console.log('📝 Marking all notifications as read (admin)');

        // Mark all notifications as read
        const { data, error } = await supabase
            .from('notifications')
            .update({
                is_read: true,
                updated_at: new Date().toISOString()
            })
            .eq('is_read', false)
            .select('id');

        if (error) {
            console.error('❌ Error marking all notifications as read:', error);
            return NextResponse.json({
                data: null,
                error: `Failed to mark all notifications as read: ${error.message}`
            }, { status: 500 });
        }

        const count = data?.length || 0;
        console.log('✅ Marked all notifications as read successfully:', count);

        return NextResponse.json({
            success: true,
            count,
            error: null
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Exception in PUT /api/admin/notifications/mark-all-read:', error);
        return NextResponse.json({ data: null, error: msg }, { status: 500 });
    }
}
