import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient(true);

        // Get all approved requests
        const { data: approvedRequests, error: requestsError } = await supabase
            .from('gear_requests')
            .select('*')
            .eq('status', 'approved');

        if (requestsError) {
            return NextResponse.json({
                error: `Failed to fetch approved requests: ${requestsError.message}`
            }, { status: 500 });
        }

        const fixResults = [];
        let totalGearsUpdated = 0;

        // Fix each approved request's gears
        for (const request of approvedRequests || []) {
            if (request.gear_ids && request.gear_ids.length > 0) {
                // Update all gears in this approved request
                const { data: updatedGears, error: updateError } = await supabase
                    .from('gears')
                    .update({
                        status: 'Checked Out',
                        checked_out_to: request.user_id,
                        current_request_id: request.id,
                        last_checkout_date: request.approved_at || new Date().toISOString(),
                        due_date: request.due_date || null,
                        updated_at: new Date().toISOString()
                    })
                    .in('id', request.gear_ids)
                    .select('id, name, status, checked_out_to, current_request_id');

                if (updateError) {
                    fixResults.push({
                        requestId: request.id,
                        error: updateError.message,
                        gearsUpdated: 0
                    });
                } else {
                    fixResults.push({
                        requestId: request.id,
                        gearsUpdated: updatedGears?.length || 0,
                        updatedGears: updatedGears
                    });
                    totalGearsUpdated += updatedGears?.length || 0;
                }
            }
        }

        return NextResponse.json({
            success: true,
            summary: {
                totalApprovedRequests: approvedRequests?.length || 0,
                totalGearsUpdated,
                fixResults
            }
        });

    } catch (error) {
        console.error('Fix API error:', error);
        return NextResponse.json({
            error: 'Internal server error during fix'
        }, { status: 500 });
    }
}
