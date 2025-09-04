import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();

        // Test the database function directly
        const { data, error } = await supabase.rpc('get_calendar_bookings_with_profiles', {
            start_date_param: '2020-01-01',
            end_date_param: '2030-12-31',
            user_id_param: null,
            gear_id_param: null
        });

        if (error) {
            console.error('Test API: Database function error:', error);
            return NextResponse.json(
                { error: 'Database function failed', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Database function working correctly',
            data: data || [],
            count: data ? data.length : 0
        });
    } catch (error) {
        console.error('Test API: Unexpected error:', error);
        return NextResponse.json(
            { error: 'Unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
