import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const { requestId } = await request.json();
        if (!requestId) {
            return NextResponse.json({ success: false, error: 'requestId is required' }, { status: 400 });
        }

        const supabase = await createSupabaseServerClient(true);

        // Load request with lines (try with quantity, fallback without if column missing)
        let { data: req, error: reqErr } = await supabase
            .from('gear_requests')
            .select('id, user_id, gear_ids, status, due_date, gear_request_gears(gear_id, quantity)')
            .eq('id', requestId)
            .single();
        if (reqErr) {
            const fallback = await supabase
                .from('gear_requests')
                .select('id, user_id, gear_ids, status, due_date, gear_request_gears(gear_id)')
                .eq('id', requestId)
                .single();
            req = fallback.data as any;
            reqErr = fallback.error as any;
        }
        if (reqErr || !req) {
            return NextResponse.json({ success: false, error: `Request not found: ${reqErr?.message || ''}` }, { status: 404 });
        }

        if (req.status && req.status.toLowerCase() === 'approved') {
            return NextResponse.json({ success: true, data: { message: 'Already approved' } });
        }

        // Build allocations by gear name per line
        const allocations: string[] = [];
        if (Array.isArray(req.gear_request_gears)) {
            for (const line of req.gear_request_gears as any[]) {
                // Resolve name anchor from provided gear_id
                const { data: anchor, error: aErr } = await supabase
                    .from('gears')
                    .select('name')
                    .eq('id', line.gear_id)
                    .single();
                if (aErr || !anchor?.name) {
                    return NextResponse.json({ success: false, error: `Unable to resolve gear name for line` }, { status: 400 });
                }

                const needed = Math.max(1, Number((line as any).quantity ?? 1));
                const { data: units, error: unitsErr } = await supabase
                    .from('gears')
                    .select('id')
                    .eq('name', anchor.name)
                    .eq('status', 'Available')
                    .limit(needed);
                if (unitsErr) {
                    return NextResponse.json({ success: false, error: `Allocation query failed: ${unitsErr.message}` }, { status: 500 });
                }
                if (!units || units.length < needed) {
                    return NextResponse.json({ success: false, error: `Not enough available units for ${anchor.name}. Needed ${needed}, found ${units?.length || 0}.` }, { status: 409 });
                }
                allocations.push(...units.map(u => u.id));
            }
        }

        // Update request gear_ids first (preserve existing if no new allocations found)
        const targetIds = allocations.length > 0 ? allocations : (Array.isArray(req.gear_ids) ? req.gear_ids : []);
        const { error: updIdsErr } = await supabase
            .from('gear_requests')
            .update({ gear_ids: targetIds, updated_at: new Date().toISOString() })
            .eq('id', requestId);
        if (updIdsErr) {
            return NextResponse.json({ success: false, error: `Failed to update allocations: ${updIdsErr.message}` }, { status: 500 });
        }

        // Approve request
        const { error: approveErr } = await supabase
            .from('gear_requests')
            .update({ status: 'approved', approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', requestId);
        if (approveErr) {
            return NextResponse.json({ success: false, error: `Failed to approve request: ${approveErr.message}` }, { status: 500 });
        }

        // Status history entry (best effort)
        await supabase
            .from('request_status_history')
            .insert({ request_id: requestId, status: 'approved', changed_at: new Date().toISOString(), note: 'Request approved by admin' });

        return NextResponse.json({ success: true, data: { allocations } });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}


