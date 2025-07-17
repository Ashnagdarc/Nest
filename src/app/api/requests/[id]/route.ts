import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const supabase = createSupabaseServerClient();
        const { data, error } = await supabase.from('gear_requests').select('*').eq('id', params.id).single();
        if (error) throw error;
        return NextResponse.json({ data, error: null });
    } catch (error) {
        return NextResponse.json({ data: null, error: 'Failed to fetch request' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const supabase = createSupabaseServerClient();
        const body = await request.json();
        const { data, error } = await supabase.from('gear_requests').update(body).eq('id', params.id).select().single();
        if (error) throw error;
        return NextResponse.json({ data, error: null });
    } catch (error) {
        return NextResponse.json({ data: null, error: 'Failed to update request' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const supabase = createSupabaseServerClient();
        const { error } = await supabase.from('gear_requests').delete().eq('id', params.id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to delete request' }, { status: 500 });
    }
} 