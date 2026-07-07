import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';
import { getRouteAuthContext } from '@/app/api/_utils/route-auth';

type Line = { gear_id: string; quantity?: number };

export async function POST(request: NextRequest) {
    try {
        const authContext = await getRouteAuthContext();
        if ('errorResponse' in authContext) {
            return authContext.errorResponse;
        }

        const { requestId, lines } = (await request.json()) as { requestId?: string; lines?: Line[] };
        if (!requestId || !Array.isArray(lines) || lines.length === 0) {
            return NextResponse.json({ success: false, error: 'requestId and lines are required', details: { requestIdPresent: !!requestId, linesType: typeof lines, linesIsArray: Array.isArray(lines) } }, { status: 400 });
        }

        console.log('🔍 Received request:', { requestId, lines });

        // Basic validation
        const sanitized = lines.map((l, idx) => {
            const gear_id = String(l.gear_id || '').trim();
            const quantity = Math.max(1, Number(l.quantity ?? 1));
            console.log('🔍 Processing line:', { idx, gear_id, quantity, raw: l });
            if (!gear_id) {
                throw new Error(`Invalid line at index ${idx}: missing gear_id`);
            }
            if (!Number.isFinite(quantity) || quantity < 1) {
                throw new Error(`Invalid line at index ${idx}: quantity must be >= 1`);
            }
            return { gear_id, quantity };
        });

        const requestedByGear = new Map<string, number>();
        for (const line of sanitized) {
            requestedByGear.set(line.gear_id, (requestedByGear.get(line.gear_id) || 0) + line.quantity);
        }

        if (!authContext.isActiveAdmin) {
            const { data: requestRow, error: requestLookupError } = await authContext.authSupabase
                .from('gear_requests')
                .select('user_id')
                .eq('id', requestId)
                .maybeSingle();

            if (requestLookupError) {
                return NextResponse.json({ success: false, error: 'Failed to verify request ownership' }, { status: 500 });
            }

            if (!requestRow) {
                return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
            }

            if (requestRow.user_id !== authContext.user.id) {
                return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
            }
        }

        const supabase = await createSupabaseServerClient(true);

        // Verify gear IDs exist and check available quantities
        const uniqueIds = Array.from(requestedByGear.keys());
        const check = await supabase
            .from('gears')
            .select(`
                id,
                name,
                quantity,
                available_quantity,
                status
            `)
            .in('id', uniqueIds);

        if (check.error) {
            return NextResponse.json({ success: false, error: `Gear validation failed: ${check.error.message}` }, { status: 500 });
        }

        // Verify gears exist and have sufficient quantity
        const gearMap = new Map((check.data || []).map(g => [g.id, g]));
        for (const [gearId, requestedQty] of requestedByGear.entries()) {
            const gear = gearMap.get(gearId);
            if (!gear) {
                return NextResponse.json({ success: false, error: `Unknown gear_id ${gearId}` }, { status: 400 });
            }
            const availableQty = Math.max(0, Number(gear.available_quantity ?? gear.quantity ?? 0));
            if (availableQty < requestedQty) {
                return NextResponse.json({
                    success: false,
                    error: `Insufficient quantity for ${gear.name || gearId}. Requested: ${requestedQty}, Available: ${availableQty}`,
                    details: {
                        gear_id: gearId,
                        requested: requestedQty,
                        available: availableQty,
                        status: gear.status
                    }
                }, { status: 400 });
            }
        }

        // Insert all lines (primary path)
        const payload = Array.from(requestedByGear.entries()).map(([gear_id, quantity]) => ({
            gear_request_id: requestId,
            gear_id,
            quantity
        })) satisfies Database['public']['Tables']['gear_request_gears']['Insert'][];

        console.log('🔍 Inserting gear request lines:', payload);

        // Try direct insert first
        const primary = await supabase
            .from('gear_request_gears')
            .insert(payload)
            .select('gear_request_id, gear_id, quantity');

        console.log('🔍 Primary insert result:', primary.data, 'Error:', primary.error);

        if (primary.error) {
            // Fallback: use SECURITY DEFINER RPC to bypass RLS safely
            console.log('🔍 Attempting RPC fallback with payload:', payload);
            const rpc = await supabase.rpc('insert_gear_request_lines', {
                p_request_id: requestId,
                p_lines: payload
            });
            console.log('🔍 RPC result:', rpc.data, 'Error:', rpc.error);

            if (rpc.error) {
                console.error('🔍 RPC failed:', rpc.error);
                return NextResponse.json({ success: false, error: rpc.error.message, details: { primaryError: primary.error.message, rpcError: rpc.error.message } }, { status: 500 });
            }
            return NextResponse.json({ success: true, data: rpc.data || [], fallback: 'rpc' });
        }

        return NextResponse.json({ success: true, data: primary.data || [], fallback: null });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }
}
