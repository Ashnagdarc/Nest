import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { requireActiveAdminRouteUser } from '@/lib/api-auth';

type WeeklyActivityRow = {
    action: string;
};

type UserActivityRow = {
    profiles: {
        id: string;
    };
};

export async function GET(request: NextRequest) {
    try {
        const authContext = await requireActiveAdminRouteUser();
        if ('errorResponse' in authContext) {
            return authContext.errorResponse;
        }

        const supabase = await createSupabaseAdminClient();
        const { searchParams } = new URL(request.url);
        const rawDays = searchParams.get('days');
        const days = rawDays ? parseInt(rawDays, 10) : 7;

        if (!Number.isFinite(days) || days < 1 || days > 365) {
            return NextResponse.json(
                { error: 'days must be an integer between 1 and 365' },
                { status: 400 }
            );
        }

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get gear activity data
        const { data: gearActivity, error: gearError } = await supabase
            .rpc('get_weekly_activity_report', {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString()
            });

        if (gearError) {
            console.error('Error fetching gear activity:', gearError);
            return NextResponse.json(
                { error: 'Failed to fetch gear activity data' },
                { status: 500 }
            );
        }

        // Get user activity data from checkins table (serves as activity log)
        const { data: userActivity, error: userError } = await supabase
            .from('checkins')
            .select(`
        id,
        action,
        created_at,
        profiles!inner(id, full_name, email, avatar_url, department)
      `)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false });

        if (userError) {
            console.error('Error fetching user activity:', userError);
            return NextResponse.json(
                { error: 'Failed to fetch user activity data' },
                { status: 500 }
            );
        }

        // Get popular gear data
        const { data: popularGear, error: popularError } = await supabase
            .rpc('get_popular_gears', {
                days_limit: days
            });

        if (popularError) {
            console.error('Error fetching popular gear:', popularError);
            return NextResponse.json(
                { error: 'Failed to fetch popular gear data' },
                { status: 500 }
            );
        }

        // Get damage reports
        const { data: damageReports, error: damageError } = await supabase
            .from('gear_maintenance')
            .select(`
        id,
        created_at,
        issue_description,
        status,
        gears(id, name, category),
        profiles(id, full_name)
      `)
            .eq('type', 'Damage Report')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false });

        if (damageError) {
            console.error('Error fetching damage reports:', damageError);
            return NextResponse.json(
                { error: 'Failed to fetch damage reports' },
                { status: 500 }
            );
        }

        // Calculate summary metrics
        const typedGearActivity = (gearActivity || []) as WeeklyActivityRow[];
        const totalRequests = typedGearActivity.filter((item) => item.action === 'Request').length;
        const totalCheckouts = typedGearActivity.filter((item) => item.action === 'Checkout').length;
        const totalCheckins = typedGearActivity.filter((item) => item.action === 'Checkin').length;
        const totalDamageReports = damageReports?.length || 0;

        // Calculate active users (users with at least one activity)
        const activeUsers = new Set<string>();
        ((userActivity || []) as unknown as UserActivityRow[]).forEach((item) => {
            activeUsers.add(item.profiles.id);
        });

        return NextResponse.json({
            period: {
                days,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            },
            summary: {
                totalRequests,
                totalCheckouts,
                totalCheckins,
                totalDamageReports,
                activeUsers: activeUsers.size
            },
            gearActivity: gearActivity || [],
            userActivity: userActivity || [],
            popularGear: popularGear || [],
            damageReports: damageReports || []
        });
    } catch (error) {
        console.error('Unexpected error fetching weekly report:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
} 
