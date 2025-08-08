import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient();

        // Get recent approved requests
        const { data: approvedRequests, error: requestsError } = await supabase
            .from('gear_requests')
            .select(`
                id,
                user_id,
                status,
                approved_at,
                gear_ids,
                due_date
            `)
            .eq('status', 'approved')
            .order('approved_at', { ascending: false })
            .limit(10);

        if (requestsError) {
            return NextResponse.json({ error: requestsError.message }, { status: 500 });
        }

        const results = [];

        for (const request of approvedRequests || []) {
            const gearDetails = [];

            if (request.gear_ids && request.gear_ids.length > 0) {
                const { data: gears, error: gearsError } = await supabase
                    .from('gears')
                    .select('id, name, status, checked_out_to, current_request_id, due_date')
                    .in('id', request.gear_ids);

                if (!gearsError && gears) {
                    gearDetails.push(...gears);
                }
            }

            results.push({
                request: {
                    id: request.id,
                    user_id: request.user_id,
                    status: request.status,
                    approved_at: request.approved_at,
                    gear_ids: request.gear_ids,
                    due_date: request.due_date
                },
                gears: gearDetails
            });
        }

        return NextResponse.json({
            success: true,
            data: results
        });

    } catch (error) {
        console.error('Debug API error:', error);
        return NextResponse.json({
            error: 'Internal server error during debug check'
        }, { status: 500 });
    }
}
