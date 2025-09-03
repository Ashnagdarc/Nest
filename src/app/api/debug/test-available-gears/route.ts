import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();

        // Test the exact query
        const { data, error, count } = await supabase
            .from('gears')
            .select('*', { count: 'exact' })
            .gt('available_quantity', 0)
            .order('name');

        if (error) {
            return NextResponse.json({
                success: false,
                error: error.message,
                details: error
            }, { status: 500 });
        }

        // Calculate totals
        const totalQuantity = data?.reduce((sum, gear) => sum + (gear.available_quantity || 0), 0) || 0;
        const gearCount = data?.length || 0;

        return NextResponse.json({
            success: true,
            data: {
                gears: data,
                count: gearCount,
                totalQuantity: totalQuantity,
                sampleGear: data?.[0] || null
            },
            error: null
        });

    } catch (error) {
        console.error('Debug endpoint error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error
        }, { status: 500 });
    }
}
