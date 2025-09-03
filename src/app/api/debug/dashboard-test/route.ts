import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();

        // Test both API calls that the dashboard uses
        const [checkoutsRes, partiallyCheckedOutRes, availableRes] = await Promise.all([
            supabase
                .from('gears')
                .select('*')
                .eq('status', 'Checked Out'),
            supabase
                .from('gears')
                .select('*')
                .eq('status', 'Partially Checked Out'),
            supabase
                .from('gears')
                .select('*')
                .eq('status', 'Available')
                .gt('available_quantity', 0)
        ]);

        // Calculate what the dashboard should receive
        const checkouts = checkoutsRes.data || [];
        const partiallyCheckedOut = partiallyCheckedOutRes.data || [];
        const available = availableRes.data || [];

        const checkedOutCount = [...checkouts, ...partiallyCheckedOut].reduce((sum, gear) => {
            // Calculate how many of this gear are checked out
            const totalQuantity = gear.quantity ?? 1;
            const availableQuantity = gear.available_quantity ?? 0;
            const checkedOutQuantity = totalQuantity - availableQuantity;
            return sum + Math.max(0, checkedOutQuantity);
        }, 0);
        const availableCount = available.length;
        const availableQuantity = available.reduce((sum, g) => sum + (g.available_quantity ?? 0), 0);

        return NextResponse.json({
            success: true,
            data: {
                checkouts: {
                    count: checkedOutCount,
                    data: checkouts.slice(0, 3) // First 3 for sample
                },
                available: {
                    count: availableCount,
                    totalQuantity: availableQuantity,
                    data: available.slice(0, 3) // First 3 for sample
                },
                summary: {
                    totalGears: availableCount + checkedOutCount,
                    availableGears: availableCount,
                    checkedOutGears: checkedOutCount,
                    availableQuantity: availableQuantity
                }
            },
            error: null
        });

    } catch (error) {
        console.error('Dashboard test endpoint error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error
        }, { status: 500 });
    }
}
