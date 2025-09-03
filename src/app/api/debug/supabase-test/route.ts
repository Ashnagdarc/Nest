import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        // Check environment variables
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const envCheck = {
            supabaseUrl: supabaseUrl ? 'Present' : 'Missing',
            supabaseKey: supabaseKey ? 'Present' : 'Missing',
            serviceRoleKey: serviceRoleKey ? 'Present' : 'Missing',
            nodeEnv: process.env.NODE_ENV || 'Not set'
        };

        // Test basic database connection without Supabase client
        return NextResponse.json({
            success: true,
            message: 'Environment check completed',
            environment: envCheck,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Debug endpoint error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error
        }, { status: 500 });
    }
}
