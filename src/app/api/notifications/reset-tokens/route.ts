import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST() {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Delete ALL tokens for this user to force a clean slate
        const { error } = await supabase
            .from('user_push_tokens')
            .delete()
            .eq('user_id', user.id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'All local push data cleared.' });
    } catch (err: any) {
        console.error('[Push Reset] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
