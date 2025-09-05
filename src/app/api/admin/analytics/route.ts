import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Admin analytics API called');

        // Create direct Supabase client with service role key to bypass RLS
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

        // Extract query parameters
        const { searchParams } = new URL(request.url);
        const fromDate = searchParams.get('from');
        const toDate = searchParams.get('to');

        if (!fromDate || !toDate) {
            return NextResponse.json({ data: null, error: 'Missing date range parameters' }, { status: 400 });
        }

        console.log('📊 Fetching analytics data for date range:', fromDate, 'to', toDate);

        // Get total requests count
        const { data: requestsData, error: requestsError } = await supabase
            .from('gear_requests')
            .select('id')
            .gte('created_at', fromDate)
            .lte('created_at', toDate);

        if (requestsError) {
            console.error('❌ Error fetching requests:', requestsError);
            return NextResponse.json({ data: null, error: `Failed to fetch requests: ${requestsError.message}` }, { status: 500 });
        }

        // Get total damage reports count (optional - table might not exist)
        let damageData: any[] = [];
        try {
            const { data: damageResult, error: damageError } = await supabase
                .from('gear_maintenance')
                .select('id')
                .eq('type', 'Damage Report')
                .gte('created_at', fromDate)
                .lte('created_at', toDate);

            if (damageError) {
                console.warn('⚠️ Warning: Could not fetch damage reports:', damageError.message);
                // Continue without damage data instead of failing
                damageData = [];
            } else {
                damageData = damageResult || [];
            }
        } catch (error) {
            console.warn('⚠️ Warning: gear_maintenance table might not exist:', error);
            damageData = [];
        }

        // Get popular gears with detailed information
        let popularGears: Array<{ name: string; count: number; fullName: string; category?: string; image_url?: string }> = [];
        try {
            const { data: popularGearsData, error: popularGearsError } = await supabase
                .from('gear_request_gears')
                .select(`
                    quantity,
                    gears (
                        id,
                        name,
                        category,
                        image_url
                    )
                `)
                .gte('created_at', fromDate)
                .lte('created_at', toDate);

            if (!popularGearsError && popularGearsData) {
                const gearCounts: Record<string, { count: number; category?: string; image_url?: string }> = {};
                popularGearsData.forEach(item => {
                    const gearName = item.gears?.name || 'Unknown';
                    const quantity = item.quantity || 1;
                    const category = item.gears?.category;
                    const image_url = item.gears?.image_url;

                    if (!gearCounts[gearName]) {
                        gearCounts[gearName] = { count: 0, category, image_url };
                    }
                    gearCounts[gearName].count += quantity;
                });

                popularGears = Object.entries(gearCounts)
                    .map(([name, data]) => ({
                        name,
                        count: data.count,
                        fullName: name,
                        category: data.category,
                        image_url: data.image_url
                    }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);
            }
        } catch (error) {
            console.warn('⚠️ Warning: Could not fetch popular gears:', error);
            popularGears = [];
        }

        // Get recent activity with detailed gear information
        let recentActivity: Array<{
            id: string;
            type: string;
            timestamp: string;
            status: string;
            gearName: string;
            userName: string;
            gearCategory?: string;
            gearImage?: string;
            userAvatar?: string;
            notes?: string;
            details?: Record<string, unknown>;
        }> = [];

        try {
            // Get recent requests with gear details
            const { data: recentRequestsData, error: recentRequestsError } = await supabase
                .from('gear_requests')
                .select(`
                    id,
                    status,
                    created_at,
                    updated_at,
                    profiles:user_id (
                        full_name,
                        avatar_url
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(15);

            if (!recentRequestsError && recentRequestsData) {
                // Get gear details for each request
                const requestIds = recentRequestsData.map(req => req.id);

                const { data: gearRequestGearsData, error: gearRequestGearsError } = await supabase
                    .from('gear_request_gears')
                    .select(`
                        gear_request_id,
                        quantity,
                        gears (
                            id,
                            name,
                            category,
                            image_url
                        )
                    `)
                    .in('gear_request_id', requestIds);

                if (!gearRequestGearsError && gearRequestGearsData) {
                    // Create a map of request ID to gear details
                    const requestGearsMap = new Map<string, Array<{ name: string, category?: string, image_url?: string, quantity: number }>>();

                    gearRequestGearsData.forEach(item => {
                        if (item.gears) {
                            const requestId = item.gear_request_id;
                            if (!requestGearsMap.has(requestId)) {
                                requestGearsMap.set(requestId, []);
                            }
                            requestGearsMap.get(requestId)!.push({
                                name: item.gears.name,
                                category: item.gears.category,
                                image_url: item.gears.image_url,
                                quantity: item.quantity || 1
                            });
                        }
                    });

                    // Note: We're using simple initials instead of external avatar URLs to avoid CORS issues

                    // Map requests to activity entries
                    recentActivity = recentRequestsData.map(request => {
                        const gears = requestGearsMap.get(request.id) || [];
                        const userName = request.profiles?.full_name || 'Unknown User';

                        // Create meaningful gear description
                        let gearDescription = 'No items';
                        if (gears.length === 1) {
                            const gear = gears[0];
                            gearDescription = gear.quantity > 1 ? `${gear.name} (${gear.quantity})` : gear.name;
                        } else if (gears.length > 1) {
                            const totalItems = gears.reduce((sum, gear) => sum + gear.quantity, 0);
                            gearDescription = `${gears.length} different items (${totalItems} total)`;
                        }

                        // Determine activity type and description
                        let activityType = 'Request';
                        let activityDescription = `requested ${gearDescription}`;

                        if (request.status === 'Approved') {
                            activityType = 'Approval';
                            activityDescription = `approved request for ${gearDescription}`;
                        } else if (request.status === 'Rejected') {
                            activityType = 'Rejection';
                            activityDescription = `rejected request for ${gearDescription}`;
                        } else if (request.status === 'Pending') {
                            activityType = 'Request';
                            activityDescription = `submitted request for ${gearDescription}`;
                        }

                        return {
                            id: request.id,
                            type: activityType,
                            timestamp: request.created_at,
                            status: request.status || 'Unknown',
                            gearName: gears.length > 0 ? gears[0].name : 'Unknown',
                            gearCategory: gears.length > 0 ? gears[0].category : undefined,
                            gearImage: gears.length > 0 ? gears[0].image_url : undefined,
                            userName: userName,
                            userAvatar: undefined, // Using initials instead of external avatars
                            notes: activityDescription,
                            details: {
                                gearCount: gears.length,
                                totalQuantity: gears.reduce((sum, gear) => sum + gear.quantity, 0),
                                gears: gears
                            }
                        };
                    });
                }
            }
        } catch (error) {
            console.warn('⚠️ Warning: Could not fetch recent activity:', error);
            recentActivity = [];
        }

        // Get weekly trends (simplified)
        const weeklyTrends = [
            { week: '2025-W35', weekLabel: 'Week 35', requests: requestsData?.length || 0, damages: damageData?.length || 0 }
        ];

        const analyticsData = {
            totalRequests: requestsData?.length || 0,
            totalDamageReports: damageData?.length || 0,
            popularGears,
            weeklyTrends,
            recentActivity
        };

        console.log('✅ Analytics data fetched successfully:', {
            totalRequests: analyticsData.totalRequests,
            totalDamageReports: analyticsData.totalDamageReports,
            popularGearsCount: analyticsData.popularGears.length,
            recentActivityCount: analyticsData.recentActivity.length
        });

        return NextResponse.json({ data: analyticsData, error: null });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('❌ Analytics API error:', errorMessage);
        return NextResponse.json({ data: null, error: errorMessage }, { status: 500 });
    }
}
