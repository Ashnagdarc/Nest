import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    try {
        const supabase = createSupabaseServerClient();
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const userId = searchParams.get('userId');
        const gearId = searchParams.get('gearId');

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: 'Start date and end date are required' },
                { status: 400 }
            );
        }

        let query = supabase
            .from('gear_calendar_bookings')
            .select(`
        *,
        profiles(id, full_name, avatar_url, email),
        gears(id, name, category, status)
      `)
            .gte('start_date', startDate)
            .lte('end_date', endDate);

        // Apply filters if provided
        if (userId) {
            query = query.eq('user_id', userId);
        }

        if (gearId) {
            query = query.eq('gear_id', gearId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching calendar bookings:', error);
            return NextResponse.json(
                { error: 'Failed to fetch calendar bookings' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            bookings: data || []
        });
    } catch (error) {
        console.error('Unexpected error fetching calendar bookings:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = createSupabaseServerClient();
        const { user_id, gear_id, title, start_date, end_date, notes } = await request.json();

        if (!user_id || !gear_id || !title || !start_date || !end_date) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check for booking conflicts
        const { data: conflicts, error: conflictError } = await supabase
            .from('gear_calendar_bookings')
            .select('id')
            .eq('gear_id', gear_id)
            .or(`start_date.lte.${end_date},end_date.gte.${start_date}`);

        if (conflictError) {
            console.error('Error checking for booking conflicts:', conflictError);
            return NextResponse.json(
                { error: 'Failed to check for booking conflicts' },
                { status: 500 }
            );
        }

        if (conflicts && conflicts.length > 0) {
            return NextResponse.json(
                { error: 'Booking conflict: The gear is already booked during this time period' },
                { status: 409 }
            );
        }

        // Create the booking
        const { data, error } = await supabase
            .from('gear_calendar_bookings')
            .insert([{
                user_id,
                gear_id,
                title,
                start_date,
                end_date,
                notes: notes || ''
            }])
            .select();

        if (error) {
            console.error('Error creating calendar booking:', error);
            return NextResponse.json(
                { error: 'Failed to create calendar booking' },
                { status: 500 }
            );
        }

        return NextResponse.json({ booking: data[0] });
    } catch (error) {
        console.error('Unexpected error creating calendar booking:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
} 