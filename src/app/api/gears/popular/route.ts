import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAdminRoute } from '@/lib/api/route-auth';

export async function GET(request: NextRequest) {
    try {
        const authContext = await requireActiveAdminRoute();
        if ('errorResponse' in authContext) {
            return authContext.errorResponse;
        }

        const supabase = await createSupabaseServerClient(true);
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;

        if (!startDate || !endDate) {
            console.error('Missing required parameters for popular gears:', { startDate, endDate });
            return NextResponse.json({
                error: 'Missing required parameters: start_date and end_date are required'
            }, { status: 400 });
        }

        // Check if the function exists first
        const { data: functions, error: functionError } = await supabase
            .from('pg_catalog.pg_proc')
            .select('proname')
            .eq('proname', 'get_popular_gears')
            .limit(1);

        if (functionError) {
            console.error('Error checking for get_popular_gears function:', functionError);
            return NextResponse.json({
                error: 'Database error: Could not verify function existence',
                details: functionError.message
            }, { status: 500 });
        }

        if (!functions || functions.length === 0) {
            console.error('Function get_popular_gears does not exist in the database');
            return NextResponse.json({
                error: 'Function get_popular_gears does not exist in the database. Please run the migration first.'
            }, { status: 500 });
        }

        // Call the get_popular_gears function
        const { data, error } = await supabase.rpc('get_popular_gears', {
            start_date: startDate,
            end_date: endDate,
            limit_count: limit
        });

        if (error) {
            console.error('Error fetching popular gears:', error);
            return NextResponse.json({
                error: 'Failed to fetch popular gears',
                details: error.message,
                code: error.code
            }, { status: 500 });
        }

        // If no data, return empty array instead of null
        return NextResponse.json(data || []);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch popular gears';
        const stack = error instanceof Error ? error.stack : undefined;
        console.error('Unexpected error in popular gears endpoint:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch popular gears',
                message,
                stack: process.env.NODE_ENV === 'development' ? stack : undefined
            },
            { status: 500 }
        );
    }
} 
