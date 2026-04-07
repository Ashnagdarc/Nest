import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const admin = await createSupabaseServerClient(true);
        // Next.js dynamic API routes: params must be awaited
        const { id } = await params;
        const { status } = await request.json();
        if (!status) return NextResponse.json({ success: false, error: 'status required' }, { status: 400 });
        const { error } = await admin.from('cars').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        return NextResponse.json({ success: true });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
