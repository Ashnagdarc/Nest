import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import rateLimit from 'next-rate-limit';
import { NextRequest } from 'next/server';
import { requireActiveAdminRouteUser } from '@/lib/api-auth';

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

        const adminContext = await requireActiveAdminRouteUser();
        if ('errorResponse' in adminContext) {
            return adminContext.errorResponse;
        }

        const supabase = await createSupabaseAdminClient();

        // 1. Create user in auth.users
        const { data: authData, error: createUserError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                full_name: fullName
            }
        });

        if (createUserError) {
            // Specific error handling
            if (createUserError.message.includes('User already registered')) {
                return NextResponse.json({ error: 'Email is already registered.' }, { status: 409 });
            } else if (createUserError.message.includes('Invalid email')) {
                return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
            } else if (createUserError.message.includes('Password should be at least')) {
                return NextResponse.json({ error: 'Password does not meet requirements.' }, { status: 400 });
            }
            return NextResponse.json({ error: createUserError.message }, { status: 400 });
        }

        if (!authData.user) {
            return NextResponse.json(
                { error: 'Failed to create user' },
                { status: 500 }
            );
        }

        // The profile will be automatically created by the handle_new_user trigger
        // But we can verify it was created
        const { data: createdProfile, error: createdProfileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (createdProfileError) {
            console.error('Error fetching created profile:', createdProfileError);
            // Don't fail the request, as the trigger might just be taking time
        }

        return NextResponse.json({
            user: authData.user,
            profile: createdProfile
        });

    } catch (error) {
        console.error('Unexpected error during user creation:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 
