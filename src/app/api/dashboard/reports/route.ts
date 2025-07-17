import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = createSupabaseServerClient();
        // Example: Fetch usage report (customize as needed)
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        let query = supabase.from('gear_activity_log').select('*');
        if (from) query = query.gte('created_at', from);
        if (to) query = query.lte('created_at', to);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return NextResponse.json({ data, error: null });
    } catch (error) {
        return NextResponse.json({ data: null, error: 'Failed to fetch reports' }, { status: 500 });
    }
} 