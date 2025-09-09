import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const admin = await createSupabaseServerClient(true);
        const { imageUrl } = await request.json();
        if (!imageUrl) return NextResponse.json({ success: false, error: 'imageUrl required' }, { status: 400 });
        const { error } = await admin.from('cars').update({ image_url: imageUrl, updated_at: new Date().toISOString() }).eq('id', params.id);
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        return NextResponse.json({ success: true });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
