import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const supabase = await createSupabaseServerClient();
        const { id } = params;
        const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return NextResponse.json({ data, error: null });
    } catch (error) {
        return NextResponse.json({ data: null, error: 'Failed to update notification' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const supabase = await createSupabaseServerClient();
        const { id } = params;
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to delete notification' }, { status: 500 });
    }
} 