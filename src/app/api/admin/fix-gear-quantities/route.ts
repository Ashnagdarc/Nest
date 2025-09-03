import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { emergencyFixGearQuantities, validateGearQuantities } from '@/lib/utils/fix-gear-quantities';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient(true);

        // Verify admin access
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin (you may need to adjust this based on your admin check logic)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || profile.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
        }

        // Get the action from request body
        const { action = 'fix' } = await request.json();

        if (action === 'validate') {
            // Just validate the current state
            const validation = await validateGearQuantities();
            return NextResponse.json({
                success: true,
                action: 'validation',
                ...validation
            });
        } else if (action === 'fix') {
            // Run the emergency fix
            const result = await emergencyFixGearQuantities();
            return NextResponse.json({
                success: true,
                action: 'fix',
                ...result
            });
        } else {
            return NextResponse.json({
                success: false,
                error: 'Invalid action. Use "fix" or "validate"'
            }, { status: 400 });
        }

    } catch (error) {
        console.error('Error in fix-gear-quantities API:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json({
            success: false,
            error: errorMessage
        }, { status: 500 });
    }
}

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient(true);

        // Verify admin access
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || profile.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
        }

        // Return validation results
        const validation = await validateGearQuantities();
        return NextResponse.json({
            success: true,
            action: 'validation',
            ...validation
        });

    } catch (error) {
        console.error('Error in fix-gear-quantities API:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json({
            success: false,
            error: errorMessage
        }, { status: 500 });
    }
}
