import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase
            .from('cars')
            .select('id, label, plate, status')
            .neq('status', 'Retired')
            .order('label');
        if (error) return NextResponse.json({ data: [], error: error.message }, { status: 400 });
        return NextResponse.json({ data, error: null });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ data: [], error: msg }, { status: 500 });
    }
}
