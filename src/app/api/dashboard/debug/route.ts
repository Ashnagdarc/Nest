import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized', authError }, { status: 401 });
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError) {
            return NextResponse.json({ error: 'Profile error', profileError }, { status: 500 });
        }

        // Get requests for this user
        const { data: requests, error: requestsError } = await supabase
            .from('gear_requests')
            .select('*')
            .eq('user_id', user.id);

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
            debug: {
                user: {
                    id: user.id,
                    email: user.email,
                    role: profile?.role
                },
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
                    overdueEquipment,
                    currentTime: now.toISOString()
                },
                errors: {
                    authError,
                    profileError,
                    requestsError,
                    gearRequestGearsError,
                    gearsError
                }
            }
        });

    } catch (error) {
        console.error('Debug API error:', error);
        return NextResponse.json({
            error: 'Debug API failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
