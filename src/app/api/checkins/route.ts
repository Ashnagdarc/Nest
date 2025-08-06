import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    try {
        const supabase = createSupabaseServerClient();
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
        const userId = searchParams.get('userId');
        const status = searchParams.get('status');

        const offset = (page - 1) * limit;

        let query = supabase
            .from('checkins')
            .select(`
        *,
        profiles(id, full_name, avatar_url),
        gears(id, name, category, status, condition)
      `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply filters if provided
        if (userId) {
            query = query.eq('user_id', userId);
        }

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching check-ins:', error);
            return NextResponse.json(
                { error: 'Failed to fetch check-ins' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            checkins: data || [],
            pagination: {
                total: count || 0,
                page,
                limit,
                totalPages: count ? Math.ceil(count / limit) : 0
            }
        });
    } catch (error) {
        console.error('Unexpected error fetching check-ins:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = createSupabaseServerClient();
        const { user_id, gear_id, condition, notes } = await request.json();

        if (!user_id || !gear_id) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Create the check-in record
        const { data, error } = await supabase
            .from('checkins')
            .insert([{
                user_id,
                gear_id,
                condition: condition || 'Good',
                notes,
                status: 'Completed'
            }])
            .select();

        if (error) {
            console.error('Error creating check-in:', error);
            return NextResponse.json(
                { error: 'Failed to create check-in' },
                { status: 500 }
            );
        }

        // Notify admins via API trigger
        if (data && data[0]) {
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/notifications/trigger`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'INSERT',
                    table: 'checkins',
                    record: data[0],
                }),
            });
        }

        // Update gear status to Available
        const { error: gearError } = await supabase
            .from('gears')
            .update({ status: 'Available' })
            .eq('id', gear_id);

        if (gearError) {
            console.error('Error updating gear status:', gearError);
            // Don't fail the request if gear update fails
        }

        return NextResponse.json({ checkin: data[0] });
    } catch (error) {
        console.error('Unexpected error creating check-in:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
} 