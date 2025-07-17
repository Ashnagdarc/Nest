import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 8) + '...');

export async function GET(request: NextRequest, context: { params: { id: string } }) {
    const { id } = context.params;
    try {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (error) throw error;
        return NextResponse.json({ data, error: null });
    } catch {
        return NextResponse.json({ data: null, error: 'Failed to fetch user' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
    const { id } = context.params;
    try {
        const supabase = await createSupabaseServerClient();
        const body = await request.json();
        const { data, error } = await supabase.from('profiles').update(body).eq('id', id).select().single();
        if (error) throw error;
        return NextResponse.json({ data, error: null });
    } catch {
        return NextResponse.json({ data: null, error: 'Failed to update user' }, { status: 500 });
    }
} 