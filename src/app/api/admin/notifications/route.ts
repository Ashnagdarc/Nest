import { NextRequest, NextResponse } from 'next/server';
import { normalizeNotificationInsert } from '@/lib/notification-type';
import { requireActiveAdminRouteUser } from '@/lib/api-auth';

async function requireAdmin() {
    const adminContext = await requireActiveAdminRouteUser();
    if ('errorResponse' in adminContext) {
        const body = await adminContext.errorResponse.json();
        return {
            errorResponse: NextResponse.json({ data: null, error: body.error }, { status: adminContext.errorResponse.status })
        };
    }

    return { adminSupabase: adminContext.adminSupabase };
}

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Admin Notifications API called');
        const { adminSupabase, errorResponse } = await requireAdmin();
        if (errorResponse) {
            return errorResponse;
        }

        // Extract query parameters
        const { searchParams } = new URL(request.url);
        const unreadOnly = searchParams.get('unreadOnly') === 'true';
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
        const userId = searchParams.get('userId') || undefined;

        console.log('📊 Fetching admin notifications with filters:', { unreadOnly, limit, userId });

        // Build the query; support optional userId scoping
        let query = adminSupabase
            .from('notifications')
            .select(`
                id,
                type,
                title,
                message,
                is_read,
                created_at,
                link,
                metadata,
                category,
                priority,
                expires_at,
                profiles:user_id (
                    id,
                    full_name,
                    email,
                    role
                )
            `);

        if (userId) {
            query = query.eq('user_id', userId);
        }

        if (unreadOnly) {
            query = query.eq('is_read', false);
        }

        if (limit && !isNaN(limit)) {
            query = query.limit(limit);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Database error fetching admin notifications:', error);
            return NextResponse.json({ data: null, error: `Database error: ${error.message}` }, { status: 500 });
        }

        console.log('✅ Admin notifications fetched successfully:', {
            totalCount: data?.length || 0,
            unreadCount: data?.filter(n => !n.is_read).length || 0
        });

        return NextResponse.json({
            data: data || [],
            error: null,
            meta: {
                total: data?.length || 0,
                unread: data?.filter(n => !n.is_read).length || 0
            }
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Exception in GET /api/admin/notifications:', error);
        return NextResponse.json({ data: null, error: msg }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        console.log('🔍 Admin Create Notification API called');
        const { adminSupabase, errorResponse } = await requireAdmin();
        if (errorResponse) {
            return errorResponse;
        }

        const body = await request.json();
        const {
            user_id,
            type,
            title,
            message,
            link,
            metadata,
            category,
            priority = 'Normal',
            expires_at
        } = body;

        // Validate required fields
        if (!user_id || !type || !title || !message) {
            return NextResponse.json({
                data: null,
                error: 'Missing required fields: user_id, type, title, message'
            }, { status: 400 });
        }

        console.log('📝 Creating admin notification:', { user_id, type, title });

        // Create the notification
        const { data, error } = await adminSupabase
            .from('notifications')
            .insert(normalizeNotificationInsert({
                user_id,
                type,
                title,
                message,
                link,
                metadata,
                category,
                priority,
                expires_at,
                is_read: false
            }))
            .select(`
                id,
                type,
                title,
                message,
                is_read,
                created_at,
                link,
                metadata,
                category,
                priority,
                expires_at,
                profiles:user_id (
                    id,
                    full_name,
                    email,
                    role
                )
            `)
            .single();

        if (error) {
            console.error('❌ Error creating admin notification:', error);
            return NextResponse.json({ data: null, error: `Failed to create notification: ${error.message}` }, { status: 500 });
        }

        console.log('✅ Admin notification created successfully:', data.id);

        return NextResponse.json({
            data,
            error: null
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Exception in POST /api/admin/notifications:', error);
        return NextResponse.json({ data: null, error: msg }, { status: 500 });
    }
}
