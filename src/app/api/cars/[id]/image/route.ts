import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authClient = await createSupabaseServerClient();
        const { data: userData } = await authClient.auth.getUser();
        if (!userData.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await authClient
            .from('profiles')
            .select('role,status')
            .eq('id', userData.user.id)
            .maybeSingle();
        const isAdmin = profile?.role === 'Admin' && profile?.status === 'Active';
        if (!isAdmin) {
            return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
        }

        const admin = await createSupabaseServerClient(true);
        const { id } = await params;
        if (!isUuid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid car id' }, { status: 400 });
        }
        const { imageUrl } = await request.json();
        if (!imageUrl) return NextResponse.json({ success: false, error: 'imageUrl required' }, { status: 400 });
        const { data, error } = await admin
            .from('cars')
            .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('id')
            .maybeSingle();
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        if (!data) return NextResponse.json({ success: false, error: 'Car not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
