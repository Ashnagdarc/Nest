import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    try {
        const supabase = await createSupabaseServerClient();
        
        // Verify authentication - RLS requires authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }
        
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const userId = searchParams.get('userId');
        const gearId = searchParams.get('gearId');

        // If no date range is specified, use a wide range to get all bookings
        // This allows the calendar to fetch all existing bookings
        const defaultStartDate = startDate || '1900-01-01';
        const defaultEndDate = endDate || '2100-12-31';

        // Use the secure function that applies RLS logic
        const { data, error } = await supabase.rpc('get_calendar_bookings_with_profiles', {
            start_date_param: defaultStartDate,
            end_date_param: defaultEndDate,
            user_id_param: userId || null,
            gear_id_param: gearId || null
        });

        if (error) {
            console.error('Error fetching calendar bookings:', error);
            return NextResponse.json(
                { error: 'Failed to fetch calendar bookings' },
                { status: 500 }
            );
        }

        return NextResponse.json(data || []);
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
        const supabase = await createSupabaseServerClient();
        
        // Verify authentication - RLS requires authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }
        
        const { user_id, gear_id, title, start_date, end_date, notes } = await request.json();

        if (!user_id || !gear_id || !title || !start_date || !end_date) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check gear availability using the new comprehensive function
        const { data: availabilityResult, error: availabilityError } = await supabase
            .rpc('check_gear_availability', {
                p_gear_id: gear_id,
                p_start_date: start_date,
                p_end_date: end_date
            });

        if (availabilityError) {
            console.error('Error checking gear availability:', availabilityError);
            return NextResponse.json(
                { error: 'Failed to check gear availability' },
                { status: 500 }
            );
        }

        if (!availabilityResult?.available) {
            return NextResponse.json(
                { 
                    error: availabilityResult?.error || 'Gear is not available during this time period',
                    details: availabilityResult
                },
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