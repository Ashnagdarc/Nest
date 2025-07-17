import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type StatusBreakdownItem = {
    status: string;
    count: string;
};

export async function GET(request: NextRequest) {
    try {
        const supabase = createSupabaseServerClient();
        const searchParams = request.nextUrl.searchParams;
        const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 30;

        // Get total gear count
        const { count: totalGearCount, error: countError } = await supabase
            .from('gears')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error('Error counting gears:', countError);
            return NextResponse.json(
                { error: 'Failed to fetch gear count' },
                { status: 500 }
            );
        }

        // Get utilized gear count (checked out at least once in the period)
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);

        const { data: utilizedGears, error: utilizedError } = await supabase
            .from('gear_checkouts')
            .select('gear_id')
            .gte('created_at', dateLimit.toISOString())
            .order('gear_id')
            .limit(1000);

        if (utilizedError) {
            console.error('Error fetching utilized gears:', utilizedError);
            return NextResponse.json(
                { error: 'Failed to fetch utilized gears' },
                { status: 500 }
            );
        }

        // Count unique gear IDs
        const uniqueGearIds = new Set();
        utilizedGears?.forEach(checkout => uniqueGearIds.add(checkout.gear_id));
        const utilizedCount = uniqueGearIds.size;

        // Get gear status breakdown using raw SQL query
        const { data: statusBreakdown, error: statusError } = await supabase
            .rpc('get_gear_status_breakdown');

        if (statusError) {
            console.error('Error fetching status breakdown:', statusError);
            return NextResponse.json(
                { error: 'Failed to fetch status breakdown' },
                { status: 500 }
            );
        }

        // Format status breakdown
        const formattedStatusBreakdown = (statusBreakdown as StatusBreakdownItem[] || []).reduce(
            (acc: Record<string, number>, item: StatusBreakdownItem) => {
                acc[item.status] = parseInt(item.count);
                return acc;
            },
            {} as Record<string, number>
        );

        // Calculate utilization rate
        const utilizationRate = totalGearCount ? (utilizedCount / totalGearCount) * 100 : 0;

        return NextResponse.json({
            totalGearCount: totalGearCount || 0,
            utilizedCount,
            utilizationRate: Math.round(utilizationRate * 100) / 100, // Round to 2 decimal places
            statusBreakdown: formattedStatusBreakdown,
            period: {
                days,
                from: dateLimit.toISOString(),
                to: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Unexpected error fetching utilization data:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
} 