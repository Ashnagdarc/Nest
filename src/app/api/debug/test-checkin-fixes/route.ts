import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient(true);

        // Get current user for testing
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({
                error: 'Not authenticated',
                message: 'Please log in to test check-in fixes'
            });
        }

        const userId = user.id;

        // Test 1: Check what gears the user currently sees
        const { data: userGears, error: userGearsError } = await supabase
            .from('gears')
            .select('*')
            .eq('checked_out_to', userId)
            .in('status', ['Checked Out', 'Pending Check-in'])
            .order('name');

        // Test 2: Check for problematic gears (Available/Needs Repair with checked_out_to set)
        const { data: problematicGears, error: problematicError } = await supabase
            .from('gears')
            .select('id, name, status, checked_out_to, due_date')
            .in('status', ['Available', 'Needs Repair'])
            .not('checked_out_to', 'is', null);

        // Test 3: Check all gears for this user regardless of status
        const { data: allUserGears, error: allUserGearsError } = await supabase
            .from('gears')
            .select('id, name, status, checked_out_to, due_date')
            .eq('checked_out_to', userId)
            .order('status, name');

        // Test 4: Check check-in history
        const { data: checkinHistory, error: checkinError } = await supabase
            .from('checkins')
            .select(`
                id,
                checkin_date,
                status,
                condition,
                notes,
                gear_id,
                gears!inner (
                    name
                )
            `)
            .eq('user_id', userId)
            .order('checkin_date', { ascending: false })
            .limit(5);

        return NextResponse.json({
            userId,
            tests: {
                userGears: {
                    data: userGears,
                    error: userGearsError,
                    count: userGears?.length || 0
                },
                problematicGears: {
                    data: problematicGears,
                    error: problematicError,
                    count: problematicGears?.length || 0
                },
                allUserGears: {
                    data: allUserGears,
                    error: allUserGearsError,
                    count: allUserGears?.length || 0
                },
                checkinHistory: {
                    data: checkinHistory,
                    error: checkinError,
                    count: checkinHistory?.length || 0
                }
            },
            summary: {
                gearsUserShouldSee: userGears?.length || 0,
                problematicGearsFound: problematicGears?.length || 0,
                totalGearsForUser: allUserGears?.length || 0,
                recentCheckins: checkinHistory?.length || 0
            }
        });

    } catch (error) {
        console.error('Error in test-checkin-fixes:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
