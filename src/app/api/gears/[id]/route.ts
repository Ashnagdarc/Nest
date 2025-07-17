import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const supabase = createSupabaseServerClient();
        const { data, error } = await supabase.from('gears').select('*').eq('id', params.id).single();
        if (error) {
            if (error.code === 'PGRST116' || error.message?.toLowerCase().includes('row not found')) {
                return NextResponse.json({ data: null, error: 'Gear not found.' }, { status: 404 });
            }
            return NextResponse.json({ data: null, error: `Database error: ${error.message}` }, { status: 500 });
        }
        if (!data) {
            return NextResponse.json({ data: null, error: 'Gear not found.' }, { status: 404 });
        }
        return NextResponse.json({ data, error: null });
    } catch (error) {
        return NextResponse.json({ data: null, error: 'Unexpected error. Please try again.' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const supabase = createSupabaseServerClient();
        const body = await request.json();
        const { data, error } = await supabase.from('gears').update(body).eq('id', params.id).select().single();
        if (error) throw error;
        return NextResponse.json({ data, error: null });
    } catch (error) {
        return NextResponse.json({ data: null, error: 'Failed to update gear' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const supabase = createSupabaseServerClient();
        const { error } = await supabase.from('gears').delete().eq('id', params.id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to delete gear' }, { status: 500 });
    }
} 