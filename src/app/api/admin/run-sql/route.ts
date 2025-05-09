import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import rateLimit from '@/lib/rate-limit';

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 100 // Max 100 requests per minute
});

export async function POST(request: Request) {
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

        const { sql, userId } = await request.json();

        // Input validation
        if (!sql) {
            return NextResponse.json(
                { error: 'Missing SQL parameter' },
                { status: 400 }
            );
        }

        if (sql.toLowerCase().includes('drop') || sql.toLowerCase().includes('truncate')) {
            return NextResponse.json(
                { error: 'Destructive SQL operations are not allowed' },
                { status: 403 }
            );
        }

        console.log("API - SQL execution request received");

        // Get supabase client
        const supabase = createRouteHandlerClient({ cookies });

        // Verify user is authenticated and is an admin
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error("API - Authentication error:", authError);
            return NextResponse.json(
                { error: 'Unauthorized access' },
                { status: 401 }
            );
        }

        // Check if user is admin using the secure function
        const { data: isAdmin, error: adminCheckError } = await supabase
            .rpc('is_admin', { uid: user.id });

        if (adminCheckError || !isAdmin) {
            console.error("API - Authorization error:", adminCheckError);
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        console.log("API - Admin verification successful, executing SQL");

        // Execute the SQL with timeout
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), 30000)
        );

        const queryPromise = supabase.rpc('execute_sql', { sql_query: sql });
        const result = await Promise.race([queryPromise, timeoutPromise]);

        return NextResponse.json({ success: true, result });

    } catch (error) {
        console.error("API - Unexpected error:", error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? error : undefined
            },
            { status: 500 }
        );
    }
} 