import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Use service role key to bypass authentication for testing
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // Test with Daniel Samuel's user ID
        const userId = '883edf0b-4418-4a39-a13e-f4dd8dd27033';

        // Get gears for this user
        const { data: gears, error: gearsError } = await supabase
            .from('gears')
            .select('*')
            .eq('checked_out_to', userId);

        // Calculate stats
        const now = new Date();
        const userCheckedOutGears = gears?.filter(gear =>
            gear.checked_out_to === userId &&
            gear.quantity > gear.available_quantity
        ) || [];

        const userOverdueGears = gears?.filter(gear =>
            gear.checked_out_to === userId &&
            gear.due_date &&
            new Date(gear.due_date) < now
        ) || [];

        const checkedOutEquipment = userCheckedOutGears.reduce((sum, gear) =>
            sum + (gear.quantity - gear.available_quantity), 0
        );

        return NextResponse.json({
            test: {
                userId,
                currentTime: now.toISOString(),
                gears: gears?.map(g => ({
                    id: g.id,
                    name: g.name,
                    quantity: g.quantity,
                    available_quantity: g.available_quantity,
                    checked_out_quantity: g.quantity - g.available_quantity,
                    due_date: g.due_date,
                    is_future: g.due_date ? new Date(g.due_date) > now : false,
                    is_past: g.due_date ? new Date(g.due_date) < now : false
                })) || [],
                calculations: {
                    userCheckedOutGears: userCheckedOutGears.length,
                    userOverdueGears: userOverdueGears.length,
                    checkedOutEquipment
                },
                errors: {
                    gearsError
                }
            }
        });

    } catch (error) {
        console.error('Test final API error:', error);
        return NextResponse.json({
            error: 'Test final API failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
