import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const { data, error } = await supabase.from('notifications').select('id, is_read').eq('user_id', user.id).eq('is_read', false);
        if (error) throw error;
        return NextResponse.json({ count: data ? data.length : 0, error: null });
    } catch (error) {
        return NextResponse.json({ count: 0, error: 'Failed to fetch unread count' }, { status: 500 });
    }
} 