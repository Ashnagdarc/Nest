import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
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
        // Only update users that are not soft-deleted
        const { data, error } = await supabase.from('profiles').update(body).eq('id', id).is('deleted_at', null).select().single();
        if (error) throw error;
        return NextResponse.json({ data, error: null });
    } catch {
        return NextResponse.json({ data: null, error: 'Failed to update user' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
    const { id } = context.params;
    try {
        // Use the admin client for deletes
        const supabase = await createSupabaseAdminClient();
        // Soft delete: set deleted_at to now
        const { error } = await supabase.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', id);
        if (error) {
            console.error('Supabase soft delete error:', error);
            throw error;
        }
        return NextResponse.json({ success: true, error: null });
    } catch (err) {
        console.error('API DELETE error:', err);
        return NextResponse.json({ success: false, error: 'Failed to delete user' }, { status: 500 });
    }
} 