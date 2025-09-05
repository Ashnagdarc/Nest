import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Use service role key to bypass authentication for testing
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // Test with Daniel Samuel's user ID
        const userId = '883edf0b-4418-4a39-a13e-f4dd8dd27033';

        // Get requests for this user
        const { data: requests, error: requestsError } = await supabase
            .from('gear_requests')
            .select('*')
            .eq('user_id', userId);

        // Get gear request gears
        const { data: gearRequestGears, error: gearRequestGearsError } = await supabase
            .from('gear_request_gears')
            .select('*');

        // Get gears
        const { data: gears, error: gearsError } = await supabase
            .from('gears')
            .select('id, name')
            .limit(5);

        // Calculate stats
        const now = new Date();
        const checkedOutRequests = requests?.filter(req =>
            req.status === 'Approved' &&
            req.due_date &&
            new Date(req.due_date) > now
        ) || [];

        const overdueRequests = requests?.filter(req =>
            req.due_date &&
            new Date(req.due_date) < now &&
            req.status === 'Approved'
        ) || [];

        const checkedOutEquipment = checkedOutRequests.reduce((sum, req) => {
            const requestGears = gearRequestGears?.filter(grg => grg.gear_request_id === req.id) || [];
            return sum + requestGears.reduce((gearSum, grg) => gearSum + grg.quantity, 0);
        }, 0);

        const overdueEquipment = overdueRequests.reduce((sum, req) => {
            const requestGears = gearRequestGears?.filter(grg => grg.gear_request_id === req.id) || [];
            return sum + requestGears.reduce((gearSum, grg) => gearSum + grg.quantity, 0);
        }, 0);

        return NextResponse.json({
            test: {
                userId,
                currentTime: now.toISOString(),
                requests: {
                    total: requests?.length || 0,
                    checkedOut: checkedOutRequests.length,
                    overdue: overdueRequests.length,
                    all: requests
                },
                gearRequestGears: gearRequestGears?.length || 0,
                gears: gears?.length || 0,
                calculations: {
                    checkedOutEquipment,
                    overdueEquipment
                },
                errors: {
                    requestsError,
                    gearRequestGearsError,
                    gearsError
                }
            }
        });

    } catch (error) {
        console.error('Test direct API error:', error);
        return NextResponse.json({
            error: 'Test direct API failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
