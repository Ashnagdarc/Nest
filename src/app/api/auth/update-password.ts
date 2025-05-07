import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'next-rate-limit';
import { NextRequest } from 'next/server';

// Only use this route server-side and protect/remove after use!

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500, // Max 500 users per minute
});

export async function POST(request: NextRequest) {
    // Rate limit check
    try {
        limiter.checkNext(request, 5);
    } catch {
        return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 });
    }
    const { userId, password, email, redirectTo } = await request.json();
    // If email is provided, treat as password reset request
    if (email) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !anonKey) {
            return NextResponse.json({ success: false, error: 'Supabase environment variables not set.' }, { status: 500 });
        }
        const client = createClient(supabaseUrl, anonKey);
        const { data, error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: redirectTo || `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password`,
        });
        if (error) {
            if (error.message.includes('User not found')) {
                return NextResponse.json({ success: false, error: 'No user found with this email.' }, { status: 404 });
            }
            return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }
        return NextResponse.json({ success: true, message: 'Password reset email sent.' });
    }

    if (!userId || !password) {
        return NextResponse.json({ success: false, error: 'User ID and password are required.' }, { status: 400 });
    }

    // Get service role key from environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return NextResponse.json({ success: false, error: 'Supabase environment variables not set.' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Update the user's password
    const { data, error } = await adminClient.auth.admin.updateUserById(userId, { password });

    if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
} 