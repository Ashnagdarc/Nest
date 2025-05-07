import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import rateLimit from 'next-rate-limit';

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
});

export async function POST(request: NextRequest) {
    try {
        // Rate limit check
        try {
            limiter.checkNext(request, 5);
        } catch {
            return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const { email, password } = await request.json();
        if (!email || !password) {
            return NextResponse.json({ success: false, error: 'Missing email or password.' }, { status: 400 });
        }

        const supabase = createRouteHandlerClient({ cookies });
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            if (authError.message.includes('Invalid login credentials')) {
                return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
            } else if (authError.message.includes('Email not confirmed')) {
                return NextResponse.json({ success: false, error: 'Please verify your email before logging in.' }, { status: 403 });
            }
            return NextResponse.json({ success: false, error: authError.message }, { status: 400 });
        }

        if (!authData.user) {
            return NextResponse.json({ success: false, error: 'Login succeeded but user data missing.' }, { status: 500 });
        }

        // Optionally, fetch profile and return it
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();

        if (profileError || !profile) {
            return NextResponse.json({ success: false, error: 'Could not fetch user profile.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, user: authData.user, profile });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
