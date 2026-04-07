import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        console.log("API: Fetching gear with ID:", id);
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase.from('gears').select('*').eq('id', id).single();
        if (error) {
            console.error("API: Database error:", error);
            if (error.code === 'PGRST116' || error.message?.toLowerCase().includes('row not found')) {
                return NextResponse.json({ data: null, error: 'Gear not found.' }, { status: 404 });
            }
            return NextResponse.json({ data: null, error: `Database error: ${error.message}` }, { status: 500 });
        }
        if (!data) {
            console.log("API: No data found for gear ID:", id);
            return NextResponse.json({ data: null, error: 'Gear not found.' }, { status: 404 });
        }
        console.log("API: Returning gear data:", data);
        return NextResponse.json({ data, error: null });
    } catch (error) {
        console.error("API: Unexpected error:", error);
        return NextResponse.json({ data: null, error: 'Unexpected error. Please try again.' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createSupabaseServerClient();
        const body = await request.json();
        const { data, error } = await supabase.from('gears').update(body).eq('id', id).select().single();
        if (error) throw error;
        return NextResponse.json({ data, error: null });
    } catch (error) {
        return NextResponse.json({ data: null, error: 'Failed to update gear' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createSupabaseServerClient();
        const { error } = await supabase.from('gears').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to delete gear' }, { status: 500 });
    }
} 