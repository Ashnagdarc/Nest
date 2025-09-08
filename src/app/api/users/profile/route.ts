import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient();

        // Get current auth user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch profile for this user
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url, role, status')
            .eq('id', userData.user.id)
            .maybeSingle();

        if (profileError) {
            return NextResponse.json({ data: null, error: profileError.message || 'Failed to fetch profile' }, { status: 500 });
        }

        return NextResponse.json({ data: profile ?? null, error: null }, { status: 200 });
    } catch (err: any) {
        const message = err?.message || 'Unexpected server error';
        return NextResponse.json({ data: null, error: message }, { status: 500 });
    }
} 