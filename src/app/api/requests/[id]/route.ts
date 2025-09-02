import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        console.log('🔍 Fetching request details for ID:', params.id);

        const supabase = await createSupabaseServerClient(true);

        // First, get the request with junction table data
        const { data: requestData, error: requestError } = await supabase
            .from('gear_requests')
            .select(`
        *,
        profiles:user_id (full_name, email),
        gear_request_gears (
          gear_id,
          quantity,
          gears (
            id,
            name,
            category,
            description,
            serial_number
          )
        )
      `)
            .eq('id', params.id)
            .single();

        if (requestError) {
            console.error('❌ Error fetching request:', requestError);
            return NextResponse.json({ data: null, error: `Failed to fetch request: ${requestError.message}` }, { status: 500 });
        }

        if (!requestData) {
            return NextResponse.json({ data: null, error: 'Request not found' }, { status: 404 });
        }

        // Extract gear names from junction table
        let gearNames: string[] = [];
        const lineItems: Array<{ id?: string; name: string; category?: string; serial_number?: string | null; quantity: number }> = [];
        if (requestData.gear_request_gears && Array.isArray(requestData.gear_request_gears)) {
            // Aggregate by name and count quantities (fallback to 1 if column missing)
            const counts: Record<string, number> = {};
            for (const item of requestData.gear_request_gears as Array<{ quantity?: number; gears?: { name?: string; category?: string; serial_number?: string | null } }>) {
                const nm = (item.gears?.name || '').trim();
                if (!nm) continue;
                const q = Math.max(1, Number(item.quantity ?? 1));
                counts[nm] = (counts[nm] || 0) + q;
            }
            gearNames = Object.entries(counts).map(([n, q]) => (q > 1 ? `${n} x ${q}` : n));

            // Build line items from aggregated counts to ensure modal can render
            for (const [name, qty] of Object.entries(counts)) {
                lineItems.push({ name, quantity: qty });
            }
        }

        // If no gear names found from junction table, try to fetch from gear_ids
        if (gearNames.length === 0 && requestData.gear_ids && Array.isArray(requestData.gear_ids)) {
            const { data: gearsData, error: gearsError } = await supabase
                .from('gears')
                .select('id, name, category')
                .in('id', requestData.gear_ids);

            if (!gearsError && gearsData) {
                // Aggregate counts by name from concrete ids
                const counts: Record<string, number> = {};
                for (const g of gearsData) {
                    const nm = (g.name || '').trim();
                    if (!nm) continue;
                    counts[nm] = (counts[nm] || 0) + 1;
                }
                gearNames = Object.entries(counts).map(([n, q]) => (q > 1 ? `${n} x ${q}` : n));
                // Also produce lineItems for modal list
                lineItems.push(...gearsData.map(g => ({ id: g.id, name: g.name, category: g.category, serial_number: undefined, quantity: 1 })));
            }
        }

        // Add gear names to the response
        const enrichedRequestData = {
            ...requestData,
            gearNames: gearNames,
            lineItems
        };

        console.log('✅ Successfully fetched request details with gear names:', gearNames);

        return NextResponse.json({ data: enrichedRequestData, error: null });
    } catch (error) {
        console.error('❌ Unexpected error in /api/requests/[id]:', error);
        return NextResponse.json({ data: null, error: 'Failed to fetch request details' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const supabase = await createSupabaseServerClient();
        const body = await request.json();
        const { data, error } = await supabase.from('gear_requests').update(body).eq('id', params.id).select().single();
        if (error) throw error;
        return NextResponse.json({ data, error: null });
    } catch {
        return NextResponse.json({ data: null, error: 'Failed to update request' }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const supabase = await createSupabaseServerClient();
        const { error } = await supabase.from('gear_requests').delete().eq('id', params.id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false, error: 'Failed to delete request' }, { status: 500 });
    }
} 