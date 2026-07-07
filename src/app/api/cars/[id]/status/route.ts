import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const ALLOWED_CAR_STATUSES = new Set(['Available', 'In Service', 'Retired', 'Maintenance']);

function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
        // Next.js dynamic API routes: params must be awaited
        const { id } = await params;
        if (!isUuid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid car id' }, { status: 400 });
        }
        const { status } = await request.json();
        if (!status) return NextResponse.json({ success: false, error: 'status required' }, { status: 400 });
        if (!ALLOWED_CAR_STATUSES.has(String(status))) {
            return NextResponse.json({ success: false, error: 'Invalid status value' }, { status: 400 });
        }
        const { data, error } = await admin
            .from('cars')
            .update({ status, updated_at: new Date().toISOString() })
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
