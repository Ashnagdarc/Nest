import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import rateLimit from 'next-rate-limit';
import { NextRequest } from 'next/server';
import { requireActiveAdminRouteUser } from '@/lib/api-auth';

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500, // Max 500 users per minute
});

const ALLOWED_ROLES = new Set(['User', 'Admin']);
const ALLOWED_STATUSES = new Set(['Active', 'Inactive', 'Suspended']);

export async function POST(request: NextRequest) {
    try {
        // Rate limit check
        try {
            limiter.checkNext(request, 5);
        } catch {
            return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }
        const { email, password, fullName, role, status } = await request.json();

        const adminContext = await requireActiveAdminRouteUser();
        if ('errorResponse' in adminContext) {
            return adminContext.errorResponse;
        }

        const safeRole = typeof role === 'string' && ALLOWED_ROLES.has(role) ? role : 'User';
        const safeStatus = typeof status === 'string' && ALLOWED_STATUSES.has(status) ? status : 'Active';

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

        const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({ role: safeRole, status: safeStatus })
            .eq('id', authData.user.id);
        if (profileUpdateError) {
            console.error('Error updating created profile:', profileUpdateError);
        }

        const { data: createdProfile, error: createdProfileError } = await supabase
            .from('profiles')
            .select('id, email, full_name, role, status')
            .eq('id', authData.user.id)
            .single();

        if (createdProfileError) {
            console.error('Error fetching created profile:', createdProfileError);
        }

        return NextResponse.json({
            user: {
                id: authData.user.id,
                email: authData.user.email,
            },
            profile: createdProfile ?? {
                id: authData.user.id,
                email: authData.user.email ?? email,
                full_name: fullName ?? null,
                role: safeRole,
                status: safeStatus,
            },
        });

    } catch (error) {
        console.error('Unexpected error during user creation:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
