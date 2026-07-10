import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAdminRouteUser } from '@/lib/api-auth';

const ALLOWED_UPDATE_FIELDS = ['full_name', 'role', 'status', 'phone', 'department'] as const;

type AllowedUpdateField = (typeof ALLOWED_UPDATE_FIELDS)[number];

function pickAllowedUpdates(body: Record<string, unknown>) {
    const updates: Partial<Record<AllowedUpdateField, unknown>> = {};
    for (const field of ALLOWED_UPDATE_FIELDS) {
        if (field in body) {
            updates[field] = body[field];
        }
    }
    return updates;
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const adminContext = await requireActiveAdminRouteUser();
        if ('errorResponse' in adminContext) {
            return adminContext.errorResponse;
        }

        const { data, error } = await adminContext.adminSupabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return NextResponse.json({ data, error: null });
    } catch {
        return NextResponse.json({ data: null, error: 'Failed to fetch user' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const adminContext = await requireActiveAdminRouteUser();
        if ('errorResponse' in adminContext) {
            return adminContext.errorResponse;
        }

        const body = (await request.json()) as Record<string, unknown>;
        const updates = pickAllowedUpdates(body);

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ data: null, error: 'No valid fields to update' }, { status: 400 });
        }

        const { data, error } = await adminContext.adminSupabase
            .from('profiles')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .maybeSingle();

        if (error) {
            console.error('Failed to update user:', error);
            return NextResponse.json({ data: null, error: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ data: null, error: 'User not found or update not permitted' }, { status: 404 });
        }

        return NextResponse.json({ data, error: null });
    } catch (error) {
        console.error('Failed to update user:', error);
        const message = error instanceof Error ? error.message : 'Failed to update user';
        return NextResponse.json({ data: null, error: message }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const adminContext = await requireActiveAdminRouteUser();
        if ('errorResponse' in adminContext) {
            return adminContext.errorResponse;
        }

        const { adminSupabase, user } = adminContext;
        if (user.id === id) {
            return NextResponse.json({ success: false, error: 'You cannot delete your own account' }, { status: 400 });
        }

        const { error: softErr } = await adminSupabase
            .from('profiles')
            .update({ deleted_at: new Date().toISOString(), status: 'Inactive' })
            .eq('id', id);
        if (softErr) console.error('Soft-delete profile failed (non-fatal):', softErr);

        const { error: authDelErr } = await adminSupabase.auth.admin.deleteUser(id);
        if (authDelErr) {
            console.error('Auth delete failed:', authDelErr);
            return NextResponse.json({ success: false, error: 'Failed to delete auth user' }, { status: 500 });
        }

        return NextResponse.json({ success: true, error: null });
    } catch (err) {
        console.error('API DELETE error:', err);
        return NextResponse.json({ success: false, error: 'Failed to delete user' }, { status: 500 });
    }
}
