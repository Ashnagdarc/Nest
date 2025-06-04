import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { userId, token } = body;
    if (!userId || !token) {
        return NextResponse.json({ error: 'userId and token are required' }, { status: 400 });
    }
    const supabase = createSupabaseServerClient(true);
    try {
        // Upsert the token for the user
        const { error } = await supabase.from('user_push_tokens').upsert({
            user_id: userId,
            token,
            created_at: new Date().toISOString(),
        }, { onConflict: 'user_id,token' });
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
} 