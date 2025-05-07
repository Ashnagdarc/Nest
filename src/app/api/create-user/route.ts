import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import rateLimit from 'next-rate-limit';
import { NextRequest } from 'next/server';

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
            return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }
        const { email, password, fullName } = await request.json();

        // Create Supabase client with service role key
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // 1. Create user in auth.users
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                full_name: fullName
            }
        });

        if (authError) {
            // Specific error handling
            if (authError.message.includes('User already registered')) {
                return NextResponse.json({ error: 'Email is already registered.' }, { status: 409 });
            } else if (authError.message.includes('Invalid email')) {
                return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
            } else if (authError.message.includes('Password should be at least')) {
                return NextResponse.json({ error: 'Password does not meet requirements.' }, { status: 400 });
            }
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        if (!authData.user) {
            return NextResponse.json(
                { error: 'Failed to create user' },
                { status: 500 }
            );
        }

        // The profile will be automatically created by the handle_new_user trigger
        // But we can verify it was created
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (profileError) {
            console.error('Error fetching created profile:', profileError);
            // Don't fail the request, as the trigger might just be taking time
        }

        return NextResponse.json({
            user: authData.user,
            profile
        });

    } catch (error) {
        console.error('Unexpected error during user creation:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 