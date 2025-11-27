import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Use proper server client with user authentication
        const supabase = await createSupabaseServerClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user profile to check role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError) {
            return NextResponse.json({ error: 'Failed to get user profile' }, { status: 500 });
        }

        const isAdmin = profile?.role === 'Admin';

        // Get basic data with proper RLS
        const { data: gears, error: gearsError } = await supabase
            .from('gears')
            .select('id, name, category, quantity, available_quantity, status')
            .limit(10);

        // Only admins can see all profiles
        const { data: profiles, error: profilesError } = isAdmin
            ? await supabase
                .from('profiles')
                .select('id, full_name, email, role')
                .limit(10)
            : { data: [], error: null };

        if (gearsError) {
            console.error('Gears error:', gearsError);
        }
        if (profilesError) {
            console.error('Profiles error:', profilesError);
        }

        // Get requests and checkins for proper calculations
        const { data: requests, error: requestsError } = await supabase
            .from('gear_requests')
            .select('*')
            .eq(isAdmin ? '1' : 'user_id', isAdmin ? '1' : user.id);

        const { data: checkins, error: checkinsError } = await supabase
            .from('checkins')
            .select('*')
            .eq(isAdmin ? '1' : 'user_id', isAdmin ? '1' : user.id);

        // Get gear request gears for proper quantity calculations
        const { data: gearRequestGears, error: gearRequestGearsError } = await supabase
            .from('gear_request_gears')
            .select('*');

        // Simple stats with proper role-based access
        const totalEquipment = gears?.reduce((sum, gear) => sum + gear.quantity, 0) || 0;
        const totalUsers = isAdmin ? (profiles?.length || 0) : 0;

        // Calculate checked out equipment based on actual gear status and available_quantity
        // This is the correct way - look at the gears table, not requests
        const checkedOutEquipment = gears?.filter(gear => {
            const status = (gear as any).status || 'Available';
            return status === 'Checked Out' || status === 'Partially Checked Out' || status === 'Partially Available';
        }).reduce((sum, gear) => {
            const totalQuantity = gear.quantity ?? 1;
            const availableQuantity = (gear as any).available_quantity ?? totalQuantity;
            const checkedOutQuantity = totalQuantity - availableQuantity;
            return sum + Math.max(0, checkedOutQuantity);
        }, 0) || 0;

        // Debug logging
        console.log('Simple API Debug:', {
            userId: user.id,
            requestsCount: requests?.length || 0,
            checkedOutEquipment,
            requests: requests?.map(r => ({ id: r.id, status: r.status, due_date: r.due_date }))
        });

        return NextResponse.json({
            data: {
                stats: {
                    total_equipment: totalEquipment,
                    available_equipment: totalEquipment - checkedOutEquipment,
                    checked_out_equipment: checkedOutEquipment,
                    under_repair_equipment: checkins?.filter(c => c.condition === 'Damaged').length || 0,
                    retired_equipment: 0,
                    total_requests: requests?.length || 0,
                    pending_requests: requests?.filter(req => req.status === 'Pending').length || 0,
                    approved_requests: requests?.filter(req => req.status === 'Approved').length || 0,
                    rejected_requests: requests?.filter(req => req.status === 'Rejected').length || 0,
                    completed_requests: requests?.filter(req => req.status === 'Completed').length || 0,
                    total_users: totalUsers,
                    active_users: totalUsers,
                    admin_users: profiles?.filter(p => p.role === 'Admin').length || 0,
                    total_checkins: checkins?.length || 0,
                    pending_checkins: checkins?.filter(c => c.status === 'Pending').length || 0,
                    completed_checkins: checkins?.filter(c => c.status === 'Completed').length || 0,
                    unread_notifications: 0,
                    total_notifications: 0
                },
                gears: gears?.map(gear => ({
                    ...gear,
                    current_state: {
                        status: (gear as any).status || 'Available',
                        available_quantity: (gear as any).available_quantity ?? gear.quantity,
                        checked_out_to: null,
                        current_request_id: null,
                        due_date: null,
                        notes: null
                    }
                })) || [],
                requests: requests || [],
                checkins: checkins || [],
                notifications: [],
                users: isAdmin ? (profiles || []) : [],
                recent_activity: [],
                popular_gear: [],
                overdue_items: requests?.filter(req =>
                    req.due_date &&
                    new Date(req.due_date) < new Date() &&
                    req.status === 'Approved'
                ).flatMap(req => {
                    const requestGears = gearRequestGears?.filter(grg => grg.gear_request_id === req.id) || [];
                    return requestGears.map(grg => {
                        const gear = gears?.find(g => g.id === grg.gear_id);
                        return {
                            gear_id: grg.gear_id,
                            gear_name: gear?.name || 'Unknown Gear',
                            checked_out_to: req.user_id,
                            due_date: req.due_date,
                            status: req.status,
                            quantity: grg.quantity,
                            request_id: req.id
                        };
                    });
                }) || []
            },
            error: null
        });

    } catch (error) {
        console.error('Simple dashboard API error:', error);
        return NextResponse.json(
            {
                data: null,
                error: 'Failed to fetch dashboard data',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
