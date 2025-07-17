import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = createSupabaseServerClient();
        const { data, error } = await supabase.from('gears').select('*').eq('status', 'Available').order('name');
        if (error) throw error;
        return NextResponse.json({ data, error: null });
    } catch (error) {
        return NextResponse.json({ data: null, error: 'Failed to fetch available gears' }, { status: 500 });
    }
} 