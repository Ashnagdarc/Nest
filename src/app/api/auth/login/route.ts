import { createSupabaseServerClient } from '@/lib/supabase/server';
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

        // Create Supabase client with proper server-side auth
        const supabase = createSupabaseServerClient();

        // Attempt to sign in
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
            } else if (error.message.includes('Email not confirmed')) {
                return NextResponse.json({ success: false, error: 'Please verify your email before logging in.' }, { status: 403 });
            }
            return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }

        if (!data.user) {
            return NextResponse.json({ success: false, error: 'Login succeeded but user data missing.' }, { status: 500 });
        }

        // Check if user has a profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.error('Error fetching profile:', profileError);
            return NextResponse.json({ success: false, error: 'Failed to fetch user profile.' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            user: data.user,
            profile
        });
    } catch (error: any) {
        console.error('Error during login:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Login failed' },
            { status: 500 }
        );
    }
}
