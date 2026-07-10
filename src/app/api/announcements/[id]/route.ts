import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAdmin } from '@/app/api/_utils/route-auth';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authContext = await requireActiveAdmin();
        if ('errorResponse' in authContext) {
            return authContext.errorResponse;
        }

        const { id } = await params;
        const { title, content } = await request.json();

        if (!title?.trim() || !content?.trim()) {
            return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
        }

        const { data, error } = await authContext.adminSupabase
            .from('announcements')
            .update({
                title: title.trim(),
                content: content.trim(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select('*, profiles!announcements_created_by_fkey(full_name, avatar_url)')
            .maybeSingle();

        if (error) {
            return NextResponse.json({ error: 'Failed to update announcement', details: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
        }

        return NextResponse.json({ announcement: data });
    } catch (error: unknown) {
        return NextResponse.json(
            { error: 'Unexpected error', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

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
