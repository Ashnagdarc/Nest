import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseApiClient } from '@/lib/supabase/api-client';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        // Use service-role client explicitly (no cookie auth) to avoid RLS filtering
        const supabase = createSupabaseApiClient(true);
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'Missing announcement id' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', id)
            .select('id');

        if (error) {
            return NextResponse.json({ error: 'Failed to delete announcement', details: error.message }, { status: 500 });
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'Announcement not found or already deleted' }, { status: 404 });
        }

        return NextResponse.json({ success: true, deleted: data.map((r: any) => r.id) });
    } catch (e: any) {
        return NextResponse.json({ error: 'Unexpected error', details: String(e?.message || e) }, { status: 500 });
    }
}
