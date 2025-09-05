import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export async function PUT(request: NextRequest) {
    try {
        console.log('🔍 Admin Mark All Notifications Read API called');

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase environment variables');
            return NextResponse.json({ data: null, error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

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
