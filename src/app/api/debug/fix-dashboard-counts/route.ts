import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { calculateAccurateDashboardCounts, updateGearAvailableQuantities } from '@/lib/utils/fix-dashboard-counts';

export async function POST() {
    try {
        const supabase = await createSupabaseServerClient();

        // Check if user is admin
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || profile?.role !== 'Admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        // Get current counts before fix
        const beforeCounts = await calculateAccurateDashboardCounts();

        // Update gear available quantities
        await updateGearAvailableQuantities();

        // Get counts after fix
        const afterCounts = await calculateAccurateDashboardCounts();

        // Get pending check-ins for context
        const { data: pendingCheckins, error: checkinsError } = await supabase
            .from('checkins')
            .select(`
                id,
                gear_id,
                user_id,
                status,
                created_at,
                gears!inner(name)
            `)
            .eq('status', 'Pending Admin Approval');

        if (checkinsError) {
            console.error('Error fetching pending check-ins:', checkinsError);
        }

        return NextResponse.json({
            success: true,
            message: 'Dashboard counts have been fixed',
            before: beforeCounts,
            after: afterCounts,
            pendingCheckins: pendingCheckins || [],
            summary: {
                totalEquipment: afterCounts.totalEquipment,
                availableEquipment: afterCounts.availableEquipment,
                checkedOutEquipment: afterCounts.checkedOutEquipment,
                underRepairEquipment: afterCounts.underRepairEquipment,
                pendingCheckinEquipment: afterCounts.pendingCheckinEquipment,
                pendingCheckinsCount: pendingCheckins?.length || 0
            }
        });

    } catch (error) {
        console.error('Error fixing dashboard counts:', error);
        return NextResponse.json(
            { error: 'Failed to fix dashboard counts' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient();

        // Check if user is admin
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || profile?.role !== 'Admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        // Get current counts
        const counts = await calculateAccurateDashboardCounts();

        // Get pending check-ins for context
        const { data: pendingCheckins, error: checkinsError } = await supabase
            .from('checkins')
            .select(`
                id,
                gear_id,
                user_id,
                status,
                created_at,
                gears!inner(name),
                profiles!inner(full_name)
            `)
            .eq('status', 'Pending Admin Approval')
            .order('created_at', { ascending: false });

        if (checkinsError) {
            console.error('Error fetching pending check-ins:', checkinsError);
        }

        // Get gears with incorrect available_quantity
        const { data: gearsWithIssues, error: gearsError } = await supabase
            .from('gears')
            .select(`
                id,
                name,
                status,
                quantity,
                available_quantity,
                checked_out_to
            `)
            .or('available_quantity.is.null,available_quantity.eq.0')
            .eq('status', 'Available');

        if (gearsError) {
            console.error('Error fetching gears with issues:', gearsError);
        }

        return NextResponse.json({
            success: true,
            currentCounts: counts,
            pendingCheckins: pendingCheckins || [],
            gearsWithIssues: gearsWithIssues || [],
            summary: {
                totalEquipment: counts.totalEquipment,
                availableEquipment: counts.availableEquipment,
                checkedOutEquipment: counts.checkedOutEquipment,
                underRepairEquipment: counts.underRepairEquipment,
                pendingCheckinEquipment: counts.pendingCheckinEquipment,
                pendingCheckinsCount: pendingCheckins?.length || 0,
                gearsWithIssuesCount: gearsWithIssues?.length || 0
            }
        });

    } catch (error) {
        console.error('Error getting dashboard counts:', error);
        return NextResponse.json(
            { error: 'Failed to get dashboard counts' },
            { status: 500 }
        );
    }
}
