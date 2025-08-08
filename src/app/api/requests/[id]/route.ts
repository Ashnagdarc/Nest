import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
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
        if (requestData.gear_request_gears && Array.isArray(requestData.gear_request_gears)) {
            gearNames = requestData.gear_request_gears
                .map((item: any) => item.gears?.name)
                .filter((name: string) => name && name.trim() !== '')
                .map((name: string) => name.trim());
        }

        // If no gear names found from junction table, try to fetch from gear_ids
        if (gearNames.length === 0 && requestData.gear_ids && Array.isArray(requestData.gear_ids)) {
            const { data: gearsData, error: gearsError } = await supabase
                .from('gears')
                .select('id, name, category')
                .in('id', requestData.gear_ids);

            if (!gearsError && gearsData) {
                gearNames = gearsData.map(gear => gear.name).filter(Boolean);
            }
        }

        // Add gear names to the response
        const enrichedRequestData = {
            ...requestData,
            gearNames: gearNames
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
        const supabase = createSupabaseServerClient();
        const body = await request.json();
        const { data, error } = await supabase.from('gear_requests').update(body).eq('id', params.id).select().single();
        if (error) throw error;
        return NextResponse.json({ data, error: null });
    } catch (error) {
        return NextResponse.json({ data: null, error: 'Failed to update request' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const supabase = createSupabaseServerClient();
        const { error } = await supabase.from('gear_requests').delete().eq('id', params.id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to delete request' }, { status: 500 });
    }
} 