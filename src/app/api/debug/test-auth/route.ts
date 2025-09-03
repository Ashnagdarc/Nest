import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        // Get environment variables
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({
                success: false,
                error: 'Missing environment variables'
            }, { status: 500 });
        }

        // Create authenticated Supabase client
        const cookieStore = await cookies();
        const supabase = createServerClient(supabaseUrl, supabaseKey, {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set() {
                    // No-op for API routes
                },
                remove() {
                    // No-op for API routes
                },
            },
        });

        // Test authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
            return NextResponse.json({
                success: false,
                error: 'Authentication failed',
                details: authError.message
            }, { status: 401 });
        }

        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'No user found'
            }, { status: 401 });
        }

        // Test a simple query to verify RLS works
        const { data, error: queryError } = await supabase
            .from('gears')
            .select('count')
            .eq('status', 'Available')
            .gt('available_quantity', 0)
            .limit(1);

        if (queryError) {
            return NextResponse.json({
                success: false,
                error: 'Query failed',
                details: queryError.message
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Authentication and query working',
            user: {
                id: user.id,
                email: user.email
            },
            queryResult: data
        });

    } catch (error) {
        console.error('Test auth endpoint error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
