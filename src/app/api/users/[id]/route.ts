import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 8) + '...');

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params;
    try {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (error) throw error;
        return NextResponse.json({ data, error: null });
    } catch {
        return NextResponse.json({ data: null, error: 'Failed to fetch user' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params;
    try {
        const supabase = await createSupabaseServerClient();
        const body = await request.json();
        // Only update users that are not soft-deleted
        const { data, error } = await supabase.from('profiles').update(body).eq('id', id).is('deleted_at', null).select().single();
        if (error) throw error;
        return NextResponse.json({ data, error: null });
    } catch {
        return NextResponse.json({ data: null, error: 'Failed to update user' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params;
    try {
        // Verify caller is admin
        const supabaseServer = await createSupabaseServerClient();
        const {
            data: { user },
        } = await supabaseServer.auth.getUser();
        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        const { data: profile } = await supabaseServer.from('profiles').select('role').eq('id', user.id).single();
        if (!profile || String(profile.role).toLowerCase() !== 'admin') {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        // Use service role for privileged operations
        const supabaseAdmin = await createSupabaseAdminClient();

        // Best-effort: mark profile as deleted (soft delete) to preserve history
        const { error: softErr } = await supabaseAdmin
            .from('profiles')
            .update({ deleted_at: new Date().toISOString(), status: 'Inactive' })
            .eq('id', id);
        if (softErr) console.error('Soft-delete profile failed (non-fatal):', softErr);

        // Hard-delete auth user (removes from auth.users). This requires service role
        const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (authDelErr) {
            console.error('Auth delete failed:', authDelErr);
            return NextResponse.json({ success: false, error: 'Failed to delete auth user' }, { status: 500 });
        }

        // If you maintain user-owned storage, clean-up can be added here
        // (non-blocking in this implementation)

        return NextResponse.json({ success: true, error: null });
    } catch (err) {
        console.error('API DELETE error:', err);
        return NextResponse.json({ success: false, error: 'Failed to delete user' }, { status: 500 });
    }
} 