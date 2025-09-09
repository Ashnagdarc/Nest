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

        // Fetch all dashboard data in parallel using existing tables plus cars
        const [
            gearsResult,
            requestsResult,
            gearRequestGearsResult,
            checkinsResult,
            notificationsResult,
            usersResult,
            carsResult,
            carBookingsResult
        ] = await Promise.all([
            // Gears
            supabase
                .from('gears')
                .select('id, name, category, description, quantity, image_url, created_at, status')
                .neq('category', 'Cars')
                .order('created_at', { ascending: false }),
            // Gear requests
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
            // Junction
            supabase
                .from('gear_request_gears')
                .select('id, gear_request_id, gear_id, quantity, created_at, updated_at')
                .order('created_at', { ascending: false }),
            // Checkins
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
            // Notifications
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
            // Users
            isAdmin ? supabase
                .from('profiles')
                .select('id, full_name, email, department, role, status, created_at')
                .order('created_at', { ascending: false })
                : Promise.resolve({ data: [], error: null }),
            // Cars
            supabase.from('cars').select('id, label, plate, active').eq('active', true),
            // Car bookings
            supabase.from('car_bookings').select('*')
        ]);

        if (gearsResult.error) throw gearsResult.error;
        if (requestsResult.error) throw requestsResult.error;
        if (gearRequestGearsResult.error) throw gearRequestGearsResult.error;
        if (checkinsResult.error) throw checkinsResult.error;
        if (notificationsResult.error) throw notificationsResult.error;
        if (usersResult.error) throw usersResult.error;
        if (carsResult.error) throw carsResult.error;
        if (carBookingsResult.error) throw carBookingsResult.error;

        const gears = gearsResult.data || [];
        const requests = requestsResult.data || [];
        const gearRequestGears = gearRequestGearsResult.data || [];
        const checkins = checkinsResult.data || [];
        const notifications = notificationsResult.data || [];
        const users = usersResult.data || [];
        const cars = (carsResult.data || []).filter(c => c.active);
        const carBookings = carBookingsResult.data || [];

        const gearsWithStates = gears.map(gear => ({
            ...gear,
            current_state: {
                status: gear.status || 'Available',
                available_quantity: gear.quantity,
                checked_out_to: null,
                current_request_id: null,
                due_date: null,
                notes: null
            }
        }));

        // Aggregate stats including cars
        const totalGearUnits = gears.reduce((sum, gear) => sum + gear.quantity, 0);
        const totalCars = cars.length;
        const approvedNotDue = requests
            .filter(req => req.status === 'Approved' && req.due_date && new Date(req.due_date) > new Date())
            .reduce((sum, req) => sum + gearRequestGears.filter(grg => grg.gear_request_id === req.id)
                .reduce((gearSum, grg) => gearSum + grg.quantity, 0), 0);

        // Treat approved car bookings for today as active "checked out" units
        const todayIso = new Date().toISOString().slice(0, 10);
        const activeCarsToday = carBookings.filter(b => b.status === 'Approved' && (b.date_of_use || '').slice(0, 10) === todayIso).length;

        const stats = {
            total_equipment: totalGearUnits + totalCars,
            checked_out_equipment: approvedNotDue + activeCarsToday,
            available_equipment: totalGearUnits + totalCars - (approvedNotDue + activeCarsToday),
            under_repair_equipment: checkins.filter(checkin => checkin.condition === 'Damaged' && checkin.status === 'Completed').length,
            retired_equipment: gears.filter(g => g.status === 'Retired').length,
            total_requests: requests.filter(req => req.user_id === user.id).length,
            pending_requests: requests.filter(req => req.user_id === user.id && req.status === 'Pending').length,
            approved_requests: requests.filter(req => req.user_id === user.id && req.status === 'Approved').length,
            rejected_requests: requests.filter(req => req.user_id === user.id && req.status === 'Rejected').length,
            completed_requests: requests.filter(req => req.user_id === user.id && req.status === 'Completed').length,
            total_users: users.length,
            active_users: users.filter(user => user.status === 'Active').length,
            admin_users: users.filter(user => user.role === 'Admin').length,
            total_checkins: checkins.filter(checkin => checkin.user_id === user.id).length,
            pending_checkins: checkins.filter(checkin => checkin.user_id === user.id && checkin.status === 'Pending').length,
            completed_checkins: checkins.filter(checkin => checkin.user_id === user.id && checkin.status === 'Completed').length,
            unread_notifications: notifications.filter(notif => !notif.is_read).length,
            total_notifications: notifications.length,
            pending_car_bookings: carBookings.filter(b => b.status === 'Pending').length
        } as any;

        // Recent activity include car bookings
        const carActivity = carBookings.slice(0, 10).map(b => ({
            id: b.id,
            type: 'car_booking',
            action: `Car booking ${b.status.toLowerCase()}`,
            item: `${b.employee_name} ${b.date_of_use} ${b.start_time && b.end_time ? `${b.start_time.slice(0, 5)}-${b.end_time.slice(0, 5)}` : (b.time_slot || '')}`,
            user: b.employee_name,
            timestamp: b.updated_at || b.created_at,
            status: b.status
        }));

        const gearIdToName = new Map<string, string>();
        for (const g of gears) { if (g?.id && g?.name) gearIdToName.set(g.id, g.name); }

        const recentActivity = [
            ...requests.filter(req => req.user_id === user.id).slice(0, 10).map(req => ({
                id: req.id,
                type: 'request',
                action: `Request ${req.status.toLowerCase()}`,
                item: req.reason,
                user: (req as any).profiles?.full_name || 'Unknown',
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
                item: gearIdToName.get(checkin.gear_id as any) || `Gear`,
                user: profile?.role === 'Admin' ? 'User' : 'You',
                timestamp: checkin.checkin_date,
                status: checkin.status,
                metadata: { condition: checkin.condition, quantity: checkin.quantity }
            })),
            ...carActivity
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);

        return NextResponse.json({
            data: {
                stats,
                gears: gearsWithStates,
                requests: isAdmin ? requests : requests.filter(req => req.user_id === user.id),
                checkins: isAdmin ? checkins : checkins.filter(checkin => checkin.user_id === user.id),
                notifications,
                users: isAdmin ? users : [],
                recent_activity: recentActivity,
                popular_gear: [],
                overdue_items: []
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
