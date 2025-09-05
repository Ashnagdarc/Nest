import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient();

        // Test basic connection
        const { data: gears, error } = await supabase
            .from('gears')
            .select('id, name, category, quantity')
            .limit(5);

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json({
                error: `Database error: ${error.message}`,
                details: error
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: {
                gears: gears || [],
                count: gears?.length || 0
            },
            error: null
        });

    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({
            error: 'Failed to fetch test data',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
