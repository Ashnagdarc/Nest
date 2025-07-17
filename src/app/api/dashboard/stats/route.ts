import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = createSupabaseServerClient();
        // Example: Fetch total gears, users, requests
        const [gears, users, requests] = await Promise.all([
            supabase.from('gears').select('id'),
            supabase.from('profiles').select('id'),
            supabase.from('gear_requests').select('id')
        ]);
        return NextResponse.json({
            totalGears: gears.data?.length || 0,
            totalUsers: users.data?.length || 0,
            totalRequests: requests.data?.length || 0,
            error: null
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
    }
} 