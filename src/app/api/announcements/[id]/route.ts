import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAdmin } from '@/app/api/_utils/route-auth';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authContext = await requireActiveAdmin();
        if ('errorResponse' in authContext) {
            return authContext.errorResponse;
        }

        const supabase = authContext.adminSupabase;
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

        return NextResponse.json({ success: true, deleted: data.map((row) => row.id) });
    } catch (error: unknown) {
        return NextResponse.json({ error: 'Unexpected error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
