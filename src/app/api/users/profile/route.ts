import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
    const startTime = Date.now();
    try {
        const supabase = await createSupabaseServerClient();

        // Get current auth user with improved error handling
        console.log('[Profile API] Starting auth check...');
        const authStart = Date.now();
        const { data: userData, error: userError } = await supabase.auth.getUser();
        const authTime = Date.now() - authStart;
        
        if (userError) {
            console.error('[Profile API] Auth error after', authTime + 'ms:', userError.message);
            if (userError.message?.includes('fetch failed') || userError.message?.includes('timeout')) {
                return NextResponse.json({ 
                    data: null, 
                    error: 'Service temporarily unavailable. Please try again.' 
                }, { status: 503 });
            }
            return NextResponse.json({ data: null, error: 'Authentication failed' }, { status: 401 });
        }
        
        if (!userData?.user) {
            console.log('[Profile API] No user found after', authTime + 'ms');
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
        }
        
        console.log('[Profile API] Auth successful in', authTime + 'ms for user:', userData.user.id);

        // Fetch profile for this user
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url, role, status')
            .eq('id', userData.user.id)
            .maybeSingle();

        if (profileError) {
            return NextResponse.json({ data: null, error: profileError.message || 'Failed to fetch profile' }, { status: 500 });
        }

        const totalTime = Date.now() - startTime;
        console.log('[Profile API] Request completed successfully in', totalTime + 'ms');
        return NextResponse.json({ data: profile ?? null, error: null }, { status: 200 });
    } catch (err: any) {
        const totalTime = Date.now() - startTime;
        const message = err?.message || 'Unexpected server error';
        console.error('[Profile API] Request failed after', totalTime + 'ms:', err);
        return NextResponse.json({ data: null, error: message }, { status: 500 });
    }
} 