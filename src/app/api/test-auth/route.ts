import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        console.log('[Test Auth API] Starting authentication test...');

        const supabase = await createSupabaseServerClient();
        console.log('[Test Auth API] Supabase client created successfully');

        // Test 1: Check if we can get user from auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        console.log('[Test Auth API] Auth check result:', {
            hasUser: !!user,
            userId: user?.id,
            userEmail: user?.email,
            error: authError?.message
        });

        if (authError || !user) {
            return NextResponse.json({
                success: false,
                step: 'authentication',
                error: 'Authentication failed',
                details: authError?.message || 'No user found'
            }, { status: 401 });
        }

        // Test 2: Check if we can access profiles table
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name, role, status')
            .eq('id', user.id)
            .single();

        console.log('[Test Auth API] Profile check result:', {
            profile,
            error: profileError?.message
        });

        if (profileError) {
            return NextResponse.json({
                success: false,
                step: 'profile_access',
                error: 'Profile access failed',
                details: profileError.message
            }, { status: 500 });
        }

        // Test 3: Check if user is admin
        const isAdmin = profile?.role === 'Admin';
        console.log('[Test Auth API] Admin check result:', {
            role: profile?.role,
            isAdmin
        });

        // Test 4: Try to access calendar bookings (if admin)
        let calendarAccess = false;
        let calendarError = null;

        if (isAdmin) {
            try {
                const { data: calendarData, error: calendarErr } = await supabase.rpc('get_calendar_bookings_with_profiles', {
                    start_date_param: '2020-01-01',
                    end_date_param: '2030-12-31',
                    user_id_param: null,
                    gear_id_param: null
                });

                calendarAccess = !calendarErr;
                calendarError = calendarErr?.message;

                console.log('[Test Auth API] Calendar access result:', {
                    success: calendarAccess,
                    dataCount: calendarData?.length || 0,
                    error: calendarError
                });
            } catch (err) {
                calendarError = err instanceof Error ? err.message : 'Unknown error';
                console.error('[Test Auth API] Calendar access exception:', err);
            }
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email
            },
            profile: {
                id: profile.id,
                email: profile.email,
                full_name: profile.full_name,
                role: profile.role,
                status: profile.status
            },
            permissions: {
                isAdmin,
                calendarAccess: isAdmin ? calendarAccess : 'N/A'
            },
            tests: {
                authentication: 'PASSED',
                profile_access: 'PASSED',
                admin_check: isAdmin ? 'PASSED' : 'FAILED (not admin)',
                calendar_access: isAdmin ? (calendarAccess ? 'PASSED' : `FAILED: ${calendarError}`) : 'SKIPPED'
            }
        });

    } catch (error) {
        console.error('[Test Auth API] Unexpected error:', error);
        return NextResponse.json({
            success: false,
            step: 'unexpected_error',
            error: 'Unexpected error occurred',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
