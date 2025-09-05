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

        // Fetch all dashboard data in parallel using existing tables
        const [
            gearsResult,
            requestsResult,
            gearRequestGearsResult,
            checkinsResult,
            notificationsResult,
            usersResult
        ] = await Promise.all([
            // Get all gears with basic info
            supabase
                .from('gears')
                .select('id, name, category, description, quantity, image_url, created_at')
                .order('created_at', { ascending: false }),

            // Get gear requests with user info
            supabase
                .from('gear_requests')
                .select(`
                    id,
                    user_id,
                    reason,
                    destination,
                    expected_duration,
                    team_members,
                    status,
                    created_at,
                    updated_at,
                    due_date,
                    approved_at,
                    admin_notes,
                    updated_by,
                    profiles:user_id (
                        id,
                        full_name,
                        email,
                        department
                    )
                `)
                .order('created_at', { ascending: false }),

            // Get gear request gears (junction table)
            supabase
                .from('gear_request_gears')
                .select('id, gear_request_id, gear_id, quantity, created_at, updated_at')
                .order('created_at', { ascending: false }),

            // Get recent checkins
            supabase
                .from('checkins')
                .select(`
                    id,
                    user_id,
                    gear_id,
                    request_id,
                    action,
                    checkin_date,
                    status,
                    notes,
                    condition,
                    damage_notes,
                    quantity,
                    approved_by,
                    approved_at,
                    created_at,
                    updated_at
                `)
                .order('checkin_date', { ascending: false })
                .limit(50),

            // Get notifications (user's own notifications)
            supabase
                .from('notifications')
                .select(`
                    id,
                    user_id,
                    type,
                    title,
                    message,
                    is_read,
                    link,
                    metadata,
                    category,
                    priority,
                    expires_at,
                    created_at,
                    updated_at
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20),

            // Get users (admin only)
            isAdmin ? supabase
                .from('profiles')
                .select('id, full_name, email, department, role, status, created_at')
                .order('created_at', { ascending: false })
                : Promise.resolve({ data: [], error: null })
        ]);

        // Handle errors
        if (gearsResult.error) throw gearsResult.error;
        if (requestsResult.error) throw requestsResult.error;
        if (gearRequestGearsResult.error) throw gearRequestGearsResult.error;
        if (checkinsResult.error) throw checkinsResult.error;
        if (notificationsResult.error) throw notificationsResult.error;
        if (usersResult.error) throw usersResult.error;

        // Process and combine data
        const gears = gearsResult.data || [];
        const requests = requestsResult.data || [];
        const gearRequestGears = gearRequestGearsResult.data || [];
        const checkins = checkinsResult.data || [];
        const notifications = notificationsResult.data || [];
        const users = usersResult.data || [];

        // Create simple gear states from existing data
        // For now, assume all gears are available since we don't have gear_states populated
        const gearsWithStates = gears.map(gear => ({
            ...gear,
            current_state: {
                status: 'Available',
                available_quantity: gear.quantity,
                checked_out_to: null,
                current_request_id: null,
                due_date: null,
                notes: null
            }
        }));

        // Calculate statistics using existing data
        const stats = {
            // Equipment stats - calculate from actual data
            total_equipment: gears.reduce((sum, gear) => sum + gear.quantity, 0),

            // Calculate checked out equipment from approved requests (current user only)
            checked_out_equipment: requests
                .filter(req => req.user_id === user.id && req.status === 'Approved' && req.due_date && new Date(req.due_date) > new Date())
                .reduce((sum, req) => {
                    const requestGears = gearRequestGears.filter(grg => grg.gear_request_id === req.id);
                    return sum + requestGears.reduce((gearSum, grg) => gearSum + grg.quantity, 0);
                }, 0),

            // Calculate available equipment (total - checked out)
            available_equipment: gears.reduce((sum, gear) => sum + gear.quantity, 0) -
                requests
                    .filter(req => req.status === 'Approved' && req.due_date && new Date(req.due_date) > new Date())
                    .reduce((sum, req) => {
                        const requestGears = gearRequestGears.filter(grg => grg.gear_request_id === req.id);
                        return sum + requestGears.reduce((gearSum, grg) => gearSum + grg.quantity, 0);
                    }, 0),

            under_repair_equipment: checkins.filter(checkin => checkin.condition === 'Damaged' && checkin.status === 'Completed').length,
            retired_equipment: 0, // Will be calculated from checkins later

            // Request stats (current user only)
            total_requests: requests.filter(req => req.user_id === user.id).length,
            pending_requests: requests.filter(req => req.user_id === user.id && req.status === 'Pending').length,
            approved_requests: requests.filter(req => req.user_id === user.id && req.status === 'Approved').length,
            rejected_requests: requests.filter(req => req.user_id === user.id && req.status === 'Rejected').length,
            completed_requests: requests.filter(req => req.user_id === user.id && req.status === 'Completed').length,

            // User stats (admin only)
            total_users: users.length,
            active_users: users.filter(user => user.status === 'Active').length,
            admin_users: users.filter(user => user.role === 'Admin').length,

            // Checkin stats (current user only)
            total_checkins: checkins.filter(checkin => checkin.user_id === user.id).length,
            pending_checkins: checkins.filter(checkin => checkin.user_id === user.id && checkin.status === 'Pending').length,
            completed_checkins: checkins.filter(checkin => checkin.user_id === user.id && checkin.status === 'Completed').length,

            // Notification stats
            unread_notifications: notifications.filter(notif => !notif.is_read).length,
            total_notifications: notifications.length
        };

        // Get recent activity (combine requests and checkins) - current user only
        const recentActivity = [
            ...requests.filter(req => req.user_id === user.id).slice(0, 10).map(req => ({
                id: req.id,
                type: 'request',
                action: `Request ${req.status.toLowerCase()}`,
                item: req.reason,
                user: req.profiles?.full_name || 'Unknown',
                timestamp: req.created_at,
                status: req.status,
                metadata: {
                    destination: req.destination,
                    expected_duration: req.expected_duration
                }
            })),
            ...checkins.filter(checkin => checkin.user_id === user.id).slice(0, 10).map(checkin => ({
                id: checkin.id,
                type: 'checkin',
                action: checkin.action,
                item: `Gear ${checkin.gear_id}`,
                user: 'Current User', // Will be populated with actual user name
                timestamp: checkin.checkin_date,
                status: checkin.status,
                metadata: {
                    condition: checkin.condition,
                    quantity: checkin.quantity
                }
            }))
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 20);

        // Get popular gear (most requested)
        const gearRequestCounts = requests.reduce((acc, req) => {
            // This would need to be enhanced with gear_request_gears data
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

        // Get overdue items from requests with proper gear information
        const overdueItems = requests
            .filter(req => req.due_date && new Date(req.due_date) < new Date() && req.status === 'Approved')
            .flatMap(req => {
                const requestGears = gearRequestGears.filter(grg => grg.gear_request_id === req.id);
                return requestGears.map(grg => {
                    const gear = gears.find(g => g.id === grg.gear_id);
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
            });

        return NextResponse.json({
            data: {
                stats,
                gears: gearsWithStates,
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
        console.error('Error fetching unified dashboard data:', error);
        return NextResponse.json(
            { data: null, error: 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
}
