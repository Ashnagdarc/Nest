import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import rateLimit from 'next-rate-limit';

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500, // Max 500 users per minute
});

export async function POST(request: NextRequest) {
    try {
        // Rate limit check
        try {
            limiter.checkNext(request, 5);
        } catch {
            return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 });
        }
        const { email, password, fullName, phone, department } = await request.json();

        if (!email || !password || !fullName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = createRouteHandlerClient({ cookies });

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName },
                emailRedirectTo: `${request.headers.get('origin')}/auth/callback`,
            }
        });

        if (authError) {
            // Specific error handling
            if (authError.message.includes('User already registered')) {
                return NextResponse.json({ success: false, error: 'Email is already registered.' }, { status: 409 });
            } else if (authError.message.includes('Invalid email')) {
                return NextResponse.json({ success: false, error: 'Invalid email address.' }, { status: 400 });
            } else if (authError.message.includes('Password should be at least')) {
                return NextResponse.json({ success: false, error: 'Password does not meet requirements.' }, { status: 400 });
            }
            return NextResponse.json({ success: false, error: authError.message }, { status: 400 });
        }

        if (!authData.user) {
            return NextResponse.json({ success: false, error: 'Failed to create user account' }, { status: 400 });
        }

        // Success: tell frontend to redirect
        return NextResponse.json({
            success: true,
            message: 'User created successfully. Please check your email to verify your account.'
        });

    } catch (error) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
    }
}
