import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Simple Reports API called');
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

        const { searchParams } = new URL(request.url);
        const fromDate = searchParams.get('from');
        const toDate = searchParams.get('to');

        if (!fromDate || !toDate) {
            return NextResponse.json({ data: null, error: 'Missing date range parameters' }, { status: 400 });
        }

        console.log(' Generating simple report for date range:', fromDate, 'to', toDate);

        // Fetch all data in parallel
        const [
            gearsResult,
            requestsResult,
            checkinsResult,
            maintenanceResult,
            usersResult
        ] = await Promise.all([
            // Get all gears
            supabase
                .from('gears')
                .select('id, name, category, quantity, available_quantity, status, created_at')
                .order('created_at', { ascending: false }),

            // Get requests in date range
            supabase
                .from('gear_requests')
                .select(`
                    id,
                    status,
                    created_at,
                    updated_at,
                    due_date,
                    profiles:user_id (id, full_name, email)
                `)
                .gte('created_at', fromDate)
                .lte('created_at', toDate)
                .order('created_at', { ascending: false }),

            // Get checkins in date range
            supabase
                .from('checkins')
                .select(`
                    id,
                    action,
                    status,
                    checkin_date,
                    quantity,
                    gears (id, name, category),
                    profiles:user_id (id, full_name, email)
                `)
                .gte('checkin_date', fromDate)
                .lte('checkin_date', toDate)
                .order('checkin_date', { ascending: false }),

            // Get maintenance records in date range
            supabase
                .from('gear_maintenance')
                .select(`
                    id,
                    status,
                    description,
                    date,
                    gears (id, name, category)
                `)
                .gte('date', fromDate)
                .lte('date', toDate)
                .order('date', { ascending: false }),

            // Get all users
            supabase
                .from('profiles')
                .select('id, full_name, email, role, created_at')
                .order('created_at', { ascending: false })
        ]);

        // Handle errors gracefully
        const gears = gearsResult.data || [];
        const requests = requestsResult.data || [];
        const checkins = checkinsResult.data || [];
        const maintenance = maintenanceResult.data || [];
        const users = usersResult.data || [];

        // Calculate basic metrics
        const totalGears = gears.length;
        const totalAvailableGears = gears.reduce((sum, gear) => sum + (gear.available_quantity || 0), 0);
        const totalCheckedOutGears = gears.reduce((sum, gear) => sum + ((gear.quantity || 0) - (gear.available_quantity || 0)), 0);
        const utilizationRate = totalGears > 0 ? ((totalCheckedOutGears / totalGears) * 100).toFixed(1) : '0.0';

        // Request metrics
        const totalRequests = requests.length;
        const pendingRequests = requests.filter(r => r.status === 'Pending').length;
        const approvedRequests = requests.filter(r => r.status === 'Approved').length;
        const rejectedRequests = requests.filter(r => r.status === 'Rejected').length;

        // Check-in metrics
        const totalCheckins = checkins.length;
        const checkouts = checkins.filter(c => c.action === 'checkout').length;
        const checkins_count = checkins.filter(c => c.action === 'checkin').length;

        // Maintenance metrics
        const totalMaintenance = maintenance.length;
        const damageReports = maintenance.filter(m => m.status === 'Damage Report').length;

        // User metrics
        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.role !== 'Inactive').length;

        // Popular gears (from requests)
        const gearRequestCounts: Record<string, { name: string; category?: string; count: number }> = {};
        requests.forEach(request => {
            // We need to get gear details from gear_request_gears
            // For now, we'll use a simplified approach
        });

        // Get gear request details
        const requestIds = requests.map(r => r.id);
        let gearRequestDetails: any[] = [];
        if (requestIds.length > 0) {
            const { data: gearRequestGearsData } = await supabase
                .from('gear_request_gears')
                .select(`
                    gear_request_id,
                    quantity,
                    gears (id, name, category)
                `)
                .in('gear_request_id', requestIds);

            gearRequestDetails = gearRequestGearsData || [];

            // Calculate popular gears
            gearRequestDetails.forEach(item => {
                if (item.gears) {
                    const gearName = item.gears.name;
                    const category = item.gears.category;
                    const quantity = item.quantity || 1;

                    if (!gearRequestCounts[gearName]) {
                        gearRequestCounts[gearName] = { name: gearName, category, count: 0 };
                    }
                    gearRequestCounts[gearName].count += quantity;
                }
            });
        }

        const popularGears = Object.values(gearRequestCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Recent activity (combine requests, checkins, and maintenance)
        const recentActivity = [
            ...requests.map(req => ({
                id: req.id,
                type: 'Request',
                timestamp: req.created_at,
                status: req.status,
                userName: req.profiles?.full_name || 'Unknown User',
                gearName: 'Multiple Items',
                gearCategory: undefined,
                notes: `${req.status.toLowerCase()} request`,
                details: { requestId: req.id }
            })),
            ...checkins.map(checkin => ({
                id: checkin.id,
                type: checkin.action === 'checkout' ? 'Check-out' : 'Check-in',
                timestamp: checkin.checkin_date,
                status: checkin.status,
                userName: checkin.profiles?.full_name || 'Unknown User',
                gearName: checkin.gears?.name || 'Unknown Gear',
                gearCategory: checkin.gears?.category,
                notes: `${checkin.action} ${checkin.gears?.name || 'gear'}`,
                details: { checkinId: checkin.id, quantity: checkin.quantity }
            })),
            ...maintenance.map(maint => ({
                id: maint.id,
                type: 'Maintenance',
                timestamp: maint.date,
                status: maint.status,
                userName: 'System',
                gearName: maint.gears?.name || 'Unknown Gear',
                gearCategory: maint.gears?.category,
                notes: maint.description,
                details: { maintenanceId: maint.id }
            }))
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 20);

        // Weekly trends (simplified)
        const weeklyTrends = [
            {
                week: 'Current Week',
                weekLabel: 'This Week',
                requests: totalRequests,
                damages: damageReports,
                checkouts: checkouts,
                checkins: checkins_count
            }
        ];

        const reportData = {
            // Summary metrics
            totalGears,
            totalAvailableGears,
            totalCheckedOutGears,
            utilizationRate: parseFloat(utilizationRate),
            totalUsers,
            activeUsers,

            // Request metrics
            totalRequests,
            pendingRequests,
            approvedRequests,
            rejectedRequests,

            // Activity metrics
            totalCheckins,
            checkouts,
            checkins_count,
            totalMaintenance,
            damageReports,

            // Data arrays
            popularGears,
            recentActivity,
            weeklyTrends,

            // Raw data for detailed analysis
            gears: gears.slice(0, 10), // Limit for performance
            requests: requests.slice(0, 10),
            checkins: checkins.slice(0, 10),
            maintenance: maintenance.slice(0, 10)
        };

        console.log('✅ Simple report generated successfully:', {
            totalGears,
            totalRequests,
            totalCheckins,
            totalMaintenance,
            popularGearsCount: popularGears.length,
            recentActivityCount: recentActivity.length
        });

        return NextResponse.json({
            data: reportData,
            success: true,
            error: null
        });

    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ Exception in GET /api/admin/simple-reports:', err);
        return NextResponse.json({ data: null, error: msg }, { status: 500 });
    }
}
