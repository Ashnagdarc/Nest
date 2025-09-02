// User authentication API endpoint for Nest by Eden Oasis. Handles secure login, rate limiting, and profile retrieval.

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import rateLimit from 'next-rate-limit';

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute window
    uniqueTokenPerInterval: 500,
});

export async function POST(request: NextRequest) {
    try {
        // Rate limiting: 5 attempts per minute
        try {
            limiter.checkNext(request, 5);
        } catch {
            return NextResponse.json({
                success: false,
                error: 'Too many requests. Please try again later.'
            }, { status: 429 });
        }

        // Parse and validate credentials
        const { email, password } = await request.json();
        if (!email || !password) {
            return NextResponse.json({
                success: false,
                error: 'Missing email or password.'
            }, { status: 400 });
        }

        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
            } else if (error.message.includes('Email not confirmed')) {
                return NextResponse.json({ success: false, error: 'Please verify your email before logging in.' }, { status: 403 });
            }
            return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }

        if (!data.user) {
            return NextResponse.json({
                success: false,
                error: 'Login succeeded but user data missing.'
            }, { status: 500 });
        }

        // Fetch user profile (only needed fields)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, role, status, full_name')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.error('Error fetching profile:', profileError);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch user profile.'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            user: data.user,
            profile
        });

    } catch (error: unknown) {
        // Global error handler
        let message = 'Login failed';
        if (error instanceof Error) message = error.message;
        console.error('Error during login:', error);
        return NextResponse.json(
            {
                success: false,
                error: message
            },
            { status: 500 }
        );
    }
}
