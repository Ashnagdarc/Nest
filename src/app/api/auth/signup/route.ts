import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import rateLimit from 'next-rate-limit';
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';

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
            return NextResponse.json({ error: 'Email, password, and full name are required' }, { status: 400 });
        }

        // Create Supabase client with proper server-side auth
        const supabase = createSupabaseServerClient();

        // Attempt to sign up
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            }
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (!data.user) {
            return NextResponse.json({ error: 'Signup succeeded but user data missing' }, { status: 500 });
        }

        // Wait for profile to be created by trigger, or create it manually if needed
        let profileCreated = false;
        let attempts = 0;
        const maxAttempts = 5;

        while (!profileCreated && attempts < maxAttempts) {
            attempts++;

            // Check if profile exists
            const { data: existingProfile, error: profileCheckError } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', data.user.id)
                .single();

            if (existingProfile) {
                profileCreated = true;
                break;
            }

            // If profile doesn't exist and this is the last attempt, create it manually
            if (attempts === maxAttempts) {
                const { error: profileCreateError } = await supabase
                    .from('profiles')
                    .insert({
                        id: data.user.id,
                        email: email,
                        full_name: fullName,
                        phone: phone || null,
                        department: department || null,
                        role: 'User', // Default role
                        status: 'Active',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });

                if (!profileCreateError) {
                    profileCreated = true;
                }
            } else {
                // Wait a bit before next attempt
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        // Create profile in profiles table
        if (data.user && !data.user.email_confirmed_at) {
            // User needs to verify email first
            return NextResponse.json({
                message: 'Please check your email to verify your account before logging in.',
                user: data.user,
                needsVerification: true
            });
        }

        // Send Google Chat notification for new user sign up
        await notifyGoogleChat(NotificationEventType.USER_SIGNUP, {
            userName: fullName,
            userEmail: email,
            signUpDate: new Date().toISOString(),
        });

        return NextResponse.json({
            message: 'Account created successfully!',
            user: data.user
        });

    } catch (error: any) {
        console.error('Error during signup:', error);
        return NextResponse.json(
            { error: error.message || 'Signup failed' },
            { status: 500 }
        );
    }
}
