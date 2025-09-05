import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        // Use proper server client with user authentication
        const supabase = await createSupabaseServerClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user profile to determine role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError) {
            return NextResponse.json({ error: 'Failed to get user profile' }, { status: 500 });
        }

        const isAdmin = profile?.role === 'Admin';

        // Fetch data from the correct tables
        const [
            gearsResult,
            requestsResult,
            checkinsResult,
            notificationsResult,
            usersResult
        ] = await Promise.all([
            // Get all gears with their current state
            supabase
                .from('gears')
                .select('*')
                .order('name'),

            // Get requests (filtered by user role)
            supabase
                .from('gear_requests')
                .select('*')
                .eq(isAdmin ? '1' : 'user_id', isAdmin ? '1' : user.id)
                .order('created_at', { ascending: false }),

            // Get checkins (filtered by user role)
            supabase
                .from('checkins')
                .select('*')
                .eq(isAdmin ? '1' : 'user_id', isAdmin ? '1' : user.id)
                .order('created_at', { ascending: false }),

            // Get notifications (user's own)
            supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false }),

            // Get users (admin only)
            isAdmin ? supabase
                .from('profiles')
                .select('id, full_name, email, role, status, created_at')
                .order('created_at', { ascending: false })
                : Promise.resolve({ data: [], error: null })
        ]);

        // Handle errors
        if (gearsResult.error) throw gearsResult.error;
        if (requestsResult.error) throw requestsResult.error;
        if (checkinsResult.error) throw checkinsResult.error;
        if (notificationsResult.error) throw notificationsResult.error;
        if (usersResult.error) throw usersResult.error;

        const gears = gearsResult.data || [];
        const requests = requestsResult.data || [];
        const checkins = checkinsResult.data || [];
        const notifications = notificationsResult.data || [];
        const users = usersResult.data || [];

        // Calculate stats using the gears table directly
        const now = new Date();

        // Get user's checked out gears (where checked_out_to = user.id)
        const userCheckedOutGears = gears.filter(gear =>
            gear.checked_out_to === user.id &&
            gear.due_date &&
            new Date(gear.due_date) > now
        );

        // Get user's overdue gears (where checked_out_to = user.id and due_date < now)
        const userOverdueGears = gears.filter(gear =>
            gear.checked_out_to === user.id &&
            gear.due_date &&
            new Date(gear.due_date) < now
        );

        // Calculate total available equipment
        const totalAvailableEquipment = gears.reduce((sum, gear) => sum + gear.available_quantity, 0);
        const totalEquipment = gears.reduce((sum, gear) => sum + gear.quantity, 0);

        // Calculate stats
        const stats = {
            // Equipment stats - using gears table directly
            total_equipment: totalEquipment,
            available_equipment: totalAvailableEquipment,
            checked_out_equipment: userCheckedOutGears.reduce((sum, gear) => sum + (gear.quantity - gear.available_quantity), 0),
            under_repair_equipment: gears.filter(gear => gear.condition === 'Damaged').length,
            retired_equipment: gears.filter(gear => gear.status === 'Retired').length,

            // Request stats
            total_requests: requests.length,
            pending_requests: requests.filter(req => req.status === 'Pending').length,
            approved_requests: requests.filter(req => req.status === 'Approved').length,
            rejected_requests: requests.filter(req => req.status === 'Rejected').length,
            completed_requests: requests.filter(req => req.status === 'Completed').length,

            // User stats (admin only)
            total_users: users.length,
            active_users: users.filter(user => user.status === 'Active').length,
            admin_users: users.filter(user => user.role === 'Admin').length,

            // Checkin stats
            total_checkins: checkins.length,
            pending_checkins: checkins.filter(checkin => checkin.status === 'Pending').length,
            completed_checkins: checkins.filter(checkin => checkin.status === 'Completed').length,

            // Notification stats
            unread_notifications: notifications.filter(notif => !notif.is_read).length,
            total_notifications: notifications.length
        };

        // Get recent activity (combine requests and checkins)
        const recentActivity = [
            ...requests.map(req => ({
                id: req.id,
                type: 'request',
                action: req.status === 'Approved' ? 'approved' : req.status.toLowerCase(),
                item: req.reason,
                user: user.id,
                timestamp: req.updated_at || req.created_at,
                status: req.status,
                metadata: { request_id: req.id }
            })),
            ...checkins.map(checkin => ({
                id: checkin.id,
                type: 'checkin',
                action: checkin.action,
                item: `Gear ${checkin.gear_id}`,
                user: checkin.user_id,
                timestamp: checkin.checkin_date,
                status: checkin.status,
                metadata: { checkin_id: checkin.id, gear_id: checkin.gear_id }
            }))
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 20);

        // Get overdue items from gears table
        const overdueItems = userOverdueGears.map(gear => ({
            gear_id: gear.id,
            gear_name: gear.name,
            checked_out_to: gear.checked_out_to,
            due_date: gear.due_date,
            status: gear.status,
            quantity: gear.quantity - gear.available_quantity
        }));

        // Get popular gear (most requested)
        const gearRequestCounts = requests.reduce((acc, req) => {
            // This would need gear_request_gears data for accurate counting
            return acc;
        }, {} as Record<string, number>);

        const popularGear = Object.entries(gearRequestCounts)
            .map(([gearId, count]) => {
                const gear = gears.find(g => g.id === gearId);
                return gear ? { ...gear, request_count: count } : null;
            })
            .filter(Boolean)
            .sort((a, b) => (b as any).request_count - (a as any).request_count)
            .slice(0, 5);

        // Debug logging
        console.log('Rebuild API Debug:', {
            userId: user.id,
            isAdmin,
            gearsCount: gears.length,
            userCheckedOutGears: userCheckedOutGears.length,
            userOverdueGears: userOverdueGears.length,
            stats
        });

        return NextResponse.json({
            data: {
                stats,
                gears: gears.map(gear => ({
                    ...gear,
                    current_state: {
                        status: gear.status,
                        available_quantity: gear.available_quantity,
                        checked_out_to: gear.checked_out_to,
                        current_request_id: gear.current_request_id,
                        due_date: gear.due_date,
                        notes: gear.condition
                    }
                })),
                requests: isAdmin ? requests : requests.filter(req => req.user_id === user.id),
                checkins: isAdmin ? checkins : checkins.filter(checkin => checkin.user_id === user.id),
                notifications,
                users: isAdmin ? users : [],
                recent_activity: recentActivity,
                popular_gear: popularGear,
                overdue_items: overdueItems
            },
            error: null
        });

    } catch (error) {
        console.error('Rebuild dashboard API error:', error);
        return NextResponse.json({
            error: 'Failed to fetch dashboard data',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
