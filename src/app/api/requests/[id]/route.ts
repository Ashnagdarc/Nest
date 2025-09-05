import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        console.log('🔍 Fetching request details for ID:', id);

        // Create direct Supabase client with service role key to bypass RLS
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase environment variables');
            return NextResponse.json({ data: null, error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // First, get the request with user profile data
        const { data: requestData, error: requestError } = await supabase
            .from('gear_requests')
            .select(`
        *,
        profiles:user_id (full_name, email)
      `)
            .eq('id', id)
            .maybeSingle();

        if (requestError) {
            console.error('❌ Error fetching request:', requestError);
            return NextResponse.json({ data: null, error: `Failed to fetch request: ${requestError.message}` }, { status: 500 });
        }

        if (!requestData) {
            console.error('❌ Request not found for ID:', id);
            return NextResponse.json({ data: null, error: 'Request not found' }, { status: 404 });
        }

        console.log('✅ Request found:', { id: requestData.id, status: requestData.status, userId: requestData.user_id });

        // Then, get the gear data from the junction table
        const { data: gearRequestGears, error: gearError } = await supabase
            .from('gear_request_gears')
            .select(`
        gear_id,
        quantity,
        gears (
          id,
          name,
          category,
          description,
          serial_number,
          quantity,
          available_quantity,
          status,
          checked_out_to,
          current_request_id,
          due_date
        )
      `)
            .eq('gear_request_id', id);

        if (gearError) {
            console.error('❌ Error fetching gear data:', gearError);
            return NextResponse.json({ data: null, error: `Failed to fetch gear data: ${gearError.message}` }, { status: 500 });
        }

        console.log('✅ Gear data fetched:', gearRequestGears?.length || 0, 'items');

        // Extract gear names from junction table
        let gearNames: string[] = [];
        const lineItems: Array<{ id?: string; name: string; category?: string; serial_number?: string | null; quantity: number }> = [];
        if (gearRequestGears && Array.isArray(gearRequestGears)) {
            // Aggregate by name and count quantities (fallback to 1 if column missing)
            const counts: Record<string, number> = {};
            for (const item of gearRequestGears as Array<{ quantity?: number; gears?: { name?: string; category?: string; serial_number?: string | null } }>) {
                const nm = (item.gears?.name || '').trim();
                if (!nm) continue;
                const q = Math.max(1, Number(item.quantity ?? 1));
                counts[nm] = (counts[nm] || 0) + q;
            }
            gearNames = Object.entries(counts).map(([n, q]) => (q > 1 ? `${n} x ${q}` : n));

            // Build line items from the actual gear data
            for (const item of gearRequestGears as Array<{ quantity?: number; gears?: { id?: string; name?: string; category?: string; serial_number?: string | null } }>) {
                if (item.gears?.name) {
                    lineItems.push({
                        id: item.gears.id,
                        name: item.gears.name,
                        category: item.gears.category,
                        serial_number: item.gears.serial_number,
                        quantity: Math.max(1, Number(item.quantity ?? 1))
                    });
                }
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

        // Add gear names and junction table data to the response
        const enrichedRequestData = {
            ...requestData,
            gearNames: gearNames,
            lineItems,
            gear_request_gears: gearRequestGears
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