import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type Line = { gear_id: string; quantity?: number };

export async function POST(request: NextRequest) {
    try {
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

        const supabase = await createSupabaseServerClient(true);

        // Verify gear IDs exist and check available quantities
        const uniqueIds = Array.from(new Set(sanitized.map(l => l.gear_id)));
        const check = await supabase
            .from('gears')
            .select(`
                id,
                quantity,
                gear_states!inner (
                    available_quantity,
                    status
                )
            `)
            .in('id', uniqueIds)
            .order('created_at', { foreignTable: 'gear_states', ascending: false })
            .limit(1, { foreignTable: 'gear_states' });

        if (check.error) {
            return NextResponse.json({ success: false, error: `Gear validation failed: ${check.error.message}` }, { status: 500 });
        }

        // Verify gears exist and have sufficient quantity
        const gearMap = new Map(check.data?.map(g => [g.id, g]) || []);
        for (const line of sanitized) {
            const gear = gearMap.get(line.gear_id);
            if (!gear) {
                return NextResponse.json({ success: false, error: `Unknown gear_id ${line.gear_id}` }, { status: 400 });
            }
            const state = gear.gear_states?.[0];
            if (!state || state.available_quantity < line.quantity) {
                return NextResponse.json({
                    success: false,
                    error: `Insufficient quantity for gear ${line.gear_id}. Requested: ${line.quantity}, Available: ${state?.available_quantity || 0}`
                }, { status: 400 });
            }
        }

        // Insert all lines (primary path)
        const payload = sanitized.map(l => ({
            gear_request_id: requestId,
            gear_id: l.gear_id,
            quantity: l.quantity
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


