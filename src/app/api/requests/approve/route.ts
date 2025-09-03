import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const { requestId } = await request.json();
        if (!requestId) {
            return NextResponse.json({ success: false, error: 'requestId is required' }, { status: 400 });
        }

        const supabase = await createSupabaseServerClient(true);

        // Load request with lines
        const { data: req, error: reqErr } = await supabase
            .from('gear_requests')
            .select('id, user_id, status, due_date, gear_request_gears(gear_id, quantity)')
            .eq('id', requestId)
            .single();
        if (reqErr || !req) {
            return NextResponse.json({ success: false, error: `Request not found: ${reqErr?.message || ''}` }, { status: 404 });
        }

        if ((req.status || '').toLowerCase() === 'approved') {
            return NextResponse.json({ success: true, data: { message: 'Already approved' } });
        }

        const lines: Array<{ gear_id: string; quantity: number }> = Array.isArray(req.gear_request_gears)
            ? (req.gear_request_gears as any[]).map(l => ({ gear_id: l.gear_id as string, quantity: Math.max(1, Number(l.quantity ?? 1)) }))
            : [];

        if (lines.length === 0) {
            return NextResponse.json({ success: false, error: 'No line items recorded for this request.' }, { status: 400 });
        }

        // Validate availability and collect updates
        const updates: Array<{ gear_id: string; newAvailable: number; newStatus: string }> = [];
        for (const line of lines) {
            const { data: g, error: gErr } = await supabase
                .from('gears')
                .select('id, name, available_quantity, quantity, status')
                .eq('id', line.gear_id)
                .single();
            if (gErr || !g) {
                return NextResponse.json({ success: false, error: `Gear not found for line` }, { status: 400 });
            }
            if ((g.available_quantity ?? 0) < line.quantity) {
                return NextResponse.json({ success: false, error: `Not enough available units for ${g.name}. Requested ${line.quantity}, available ${g.available_quantity}.` }, { status: 409 });
            }
            const newAvailable = Math.max(0, (g.available_quantity ?? 0) - line.quantity);
            const newStatus = newAvailable > 0 ? 'Partially Checked Out' : 'Checked Out';
            updates.push({ gear_id: g.id, newAvailable, newStatus });
        }

        // Apply updates
        for (const upd of updates) {
            const { error: uErr } = await supabase
                .from('gears')
                .update({
                    available_quantity: upd.newAvailable,
                    status: upd.newStatus,
                    current_request_id: requestId,
                    last_checkout_date: new Date().toISOString(),
                    due_date: req.due_date ?? null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', upd.gear_id);
            if (uErr) {
                return NextResponse.json({ success: false, error: `Failed to update gear availability: ${uErr.message}` }, { status: 500 });
            }
        }

        // Update request with involved gear ids and approve
        const distinctGearIds = Array.from(new Set(lines.map(l => l.gear_id)));
        const { error: updIdsErr } = await supabase
            .from('gear_requests')
            .update({ gear_ids: distinctGearIds, updated_at: new Date().toISOString() })
            .eq('id', requestId);
        if (updIdsErr) {
            return NextResponse.json({ success: false, error: `Failed to update request gear_ids: ${updIdsErr.message}` }, { status: 500 });
        }

        const { error: approveErr } = await supabase
            .from('gear_requests')
            .update({ status: 'approved', approved_at: new Date().toISOString(), checkout_date: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', requestId);
        if (approveErr) {
            return NextResponse.json({ success: false, error: `Failed to approve request: ${approveErr.message}` }, { status: 500 });
        }

        // Status history entry (best effort)
        await supabase
            .from('request_status_history')
            .insert({ request_id: requestId, status: 'approved', changed_at: new Date().toISOString(), note: 'Request approved by admin (quantity-based).' });

        return NextResponse.json({ success: true, data: { updated: updates.length, gear_ids: distinctGearIds } });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}


