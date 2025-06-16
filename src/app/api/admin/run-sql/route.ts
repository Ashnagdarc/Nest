import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import rateLimit from '@/lib/rate-limit';

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 100 // Max 100 requests per minute
});

export async function POST(request: NextRequest) {
    try {
        // Rate limit check
        try {
            await limiter.check(request, 5); // 5 requests per minute per IP
        } catch {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please try again later.' },
                { status: 429 }
            );
        }

        const { sql } = await request.json();

        if (!sql) {
            return NextResponse.json(
                { error: 'SQL query is required' },
                { status: 400 }
            );
        }

        // Create Supabase client with proper server-side auth
        const supabase = createSupabaseServerClient();

        // Get the user's session
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        // Execute the SQL query
        const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            data,
            message: 'SQL executed successfully'
        });

    } catch (error: any) {
        console.error('Error executing SQL:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to execute SQL' },
            { status: 500 }
        );
    }
} 