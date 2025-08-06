import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = createSupabaseServerClient();
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

        let query = supabase
            .from('gear_activity_log')
            .select(`
        *,
        profiles(id, full_name, avatar_url),
        gears(id, name, category, status)
      `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .gte('created_at', dateLimit.toISOString())
            .range(offset, offset + limit - 1);

        // Apply filters if provided
        if (userId) {
            query = query.eq('user_id', userId);
        }

        if (type) {
            query = query.eq('action', type);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching activities:', error);
            return NextResponse.json(
                { error: 'Failed to fetch activities' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            activities: data || [],
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