import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type Line = { gear_id: string; quantity?: number };

export async function POST(request: NextRequest) {
    try {
        const { requestId, lines } = (await request.json()) as { requestId?: string; lines?: Line[] };
        if (!requestId || !Array.isArray(lines) || lines.length === 0) {
            return NextResponse.json({ success: false, error: 'requestId and lines are required' }, { status: 400 });
        }

        const supabase = await createSupabaseServerClient(true);

        // Try insert with quantity; fallback without if column missing
        const payloadWithQty = lines.map(l => ({ gear_request_id: requestId, gear_id: l.gear_id, quantity: Math.max(1, Number(l.quantity ?? 1)) }));
        let { error } = await supabase.from('gear_request_gears').insert(payloadWithQty);
        if (error) {
            // Retry without quantity column
            const payloadNoQty = lines.map(l => ({ gear_request_id: requestId, gear_id: l.gear_id }));
            const retry = await supabase.from('gear_request_gears').insert(payloadNoQty);
            if (retry.error) {
                return NextResponse.json({ success: false, error: retry.error.message }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}


