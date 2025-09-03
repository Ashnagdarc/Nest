import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Get environment variables
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing Supabase environment variables');
            return NextResponse.json({
                data: null,
                error: 'Database configuration error'
            }, { status: 500 });
        }

        // Create Supabase client with admin privileges
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseServiceKey) {
            console.error('Missing Supabase service role key');
            return NextResponse.json({
                data: null,
                error: 'Database configuration error'
            }, { status: 500 });
        }

        // Use service role key to bypass RLS
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Execute the authenticated query (RLS policies will now work)
        const { data, error } = await supabase
            .from('gears')
            .select(`
                *,
                gear_states (
                    status,
                    available_quantity,
                    checked_out_to,
                    due_date
                )
            `)
            .order('created_at', { ascending: false })
            .order('name');

        if (error) {
            console.error('Supabase query error:', error);
            return NextResponse.json({
                data: null,
                error: 'Database query failed'
            }, { status: 500 });
        }

        // Filter available gears in JavaScript
        const availableGears = (data || []).filter(gear => {
            // Show any gear that has available quantity > 0, regardless of status
            // This includes gear with status "Available", "Partially Checked Out", etc.
            return gear.available_quantity > 0;
        });

        // Return successful response
        return NextResponse.json({
            data: availableGears,
            error: null
        });

    } catch (error) {
        console.error('Unexpected error in available gears endpoint:', error);
        return NextResponse.json({
            data: null,
            error: 'Internal server error'
        }, { status: 500 });
    }
} 