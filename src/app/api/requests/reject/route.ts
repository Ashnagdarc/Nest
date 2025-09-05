import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
    try {
        const { requestId, reason } = await req.json();
        if (!requestId || typeof requestId !== 'string') {
            return NextResponse.json({ success: false, error: 'Missing requestId' }, { status: 400 });
        }

        const supabase = await createSupabaseServerClient();

        const { error } = await supabase
            .from('gear_requests')
            .update({
                status: 'Rejected',
                admin_notes: reason ?? null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', requestId);

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
