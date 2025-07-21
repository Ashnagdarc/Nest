import { NextResponse } from 'next/server';

export async function GET() {
    const envInfo = {
        RESEND_API_KEY_EXISTS: !!process.env.RESEND_API_KEY,
        RESEND_API_KEY_LENGTH: process.env.RESEND_API_KEY?.length || 0,
        RESEND_API_KEY_START: process.env.RESEND_API_KEY?.substring(0, 3) || 'undefined',
        RESEND_API_KEY_END: process.env.RESEND_API_KEY?.substring(-3) || 'undefined',
        NODE_ENV: process.env.NODE_ENV,
        // Don't log the full key for security
    };

    console.log('[Debug API] Environment check:', envInfo);

    return NextResponse.json({
        message: 'Environment variables debug info',
        data: envInfo,
        timestamp: new Date().toISOString()
    });
} 