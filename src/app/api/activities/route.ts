import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
    try {
        // Create Supabase client with service role key to bypass RLS
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );
        const { searchParams } = new URL(request.url);
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
        const userId = searchParams.get('userId');
        const type = searchParams.get('type');
        const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 30;

        const offset = (page - 1) * limit;

        // Calculate date limit if days is provided
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);

        // Get activity data from checkins table (serves as activity log)
        const { data: activityData, error: activityError, count } = await supabase
            .from('checkins')
            .select(`
                *,
                profiles!inner (
                    id,
                    full_name,
                    avatar_url
                ),
                gears!inner (
                    id,
                    name,
                    category
                )
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .gte('created_at', dateLimit.toISOString())
            .range(offset, offset + limit - 1);

        if (activityError) {
            console.error('Error fetching activity data:', activityError);
            return NextResponse.json(
                { error: 'Failed to fetch activities' },
                { status: 500 }
            );
        }

        // Get unique user IDs and gear IDs for batch fetching
        const userIds = [...new Set(activityData?.map(a => a.user_id).filter(Boolean))];
        const gearIds = [...new Set(activityData?.map(a => a.gear_id).filter(Boolean))];

        // Fetch profiles and gears in parallel
        const [profilesResult, gearsResult] = await Promise.all([
            userIds.length > 0 ? supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', userIds) : { data: [], error: null },
            gearIds.length > 0 ? supabase
                .from('gears')
                .select('id, name, category, status')
                .in('id', gearIds) : { data: [], error: null }
        ]);

        if (profilesResult.error || gearsResult.error) {
            console.error('Error fetching related data:', profilesResult.error || gearsResult.error);
            return NextResponse.json(
                { error: 'Failed to fetch related data' },
                { status: 500 }
            );
        }

        // Create lookup maps
        const profilesMap = new Map(profilesResult.data?.map(p => [p.id, p]) || []);
        const gearsMap = new Map(gearsResult.data?.map(g => [g.id, g]) || []);

        // Combine the data
        const data = activityData?.map(activity => ({
            ...activity,
            profiles: activity.user_id ? profilesMap.get(activity.user_id) : null,
            gears: activity.gear_id ? gearsMap.get(activity.gear_id) : null
        }));

        // Apply filters to the combined data
        let filteredData = data || [];

        if (userId) {
            filteredData = filteredData.filter(activity => activity.user_id === userId);
        }

        if (type) {
            filteredData = filteredData.filter(activity => activity.activity_type === type);
        }

        return NextResponse.json({
            activities: filteredData,
            pagination: {
                total: count || 0,
                page,
                limit,
                totalPages: count ? Math.ceil(count / limit) : 0
            }
        });
    } catch (error) {
        console.error('Unexpected error fetching activities:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}