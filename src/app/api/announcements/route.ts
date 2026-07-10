import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { getRouteAuthContext, requireActiveAdmin } from '@/app/api/_utils/route-auth';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    try {
        const authContext = await getRouteAuthContext();
        if ('errorResponse' in authContext) {
            return authContext.errorResponse;
        }

        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
        const userId = searchParams.get('userId');

        if (userId && userId !== authContext.user.id && !authContext.isActiveAdmin) {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            );
        }

        const supabase = await createSupabaseAdminClient();

        const offset = (page - 1) * limit;

        const query = supabase
            .from('announcements')
            .select('*, profiles!announcements_created_by_fkey(full_name, avatar_url)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (userId) {
            const { data, error, count } = await supabase
                .from('announcements')
                .select(`
          *, 
          profiles!announcements_created_by_fkey(full_name, avatar_url),
          read_announcements!inner(id, user_id, announcement_id)
        `, { count: 'exact' })
                .eq('read_announcements.user_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                console.error('Error fetching read announcements:', error);
                return NextResponse.json(
                    { error: 'Failed to fetch announcements' },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                announcements: data || [],
                pagination: {
                    total: count || 0,
                    page,
                    limit,
                    totalPages: count ? Math.ceil(count / limit) : 0
                }
            });
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching announcements:', error);
            return NextResponse.json(
                { error: 'Failed to fetch announcements' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            announcements: data || [],
            pagination: {
                total: count || 0,
                page,
                limit,
                totalPages: count ? Math.ceil(count / limit) : 0
            }
        });
    } catch (error) {
        console.error('Unexpected error fetching announcements:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const authContext = await requireActiveAdmin();
        if ('errorResponse' in authContext) {
            return authContext.errorResponse;
        }

        const supabase = authContext.adminSupabase;
        const { title, content, author_id, send_notifications = false } = await request.json();

        if (!title || !content) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (author_id && author_id !== authContext.user.id) {
            return NextResponse.json(
                { error: 'author_id must match the authenticated admin user' },
                { status: 400 }
            );
        }

        if (send_notifications) {
            const { AnnouncementService } = await import('@/services/announcement-service');
            const announcementService = new AnnouncementService();

            const result = await announcementService.createAnnouncementWithNotifications(
                title,
                content,
                authContext.user.id
            );

            if (!result.success) {
                return NextResponse.json(
                    {
                        error: 'Failed to create announcement with notifications',
                        details: result.errors
                    },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                announcement: result.announcement,
                stats: {
                    notificationsSent: result.notificationsSent,
                    emailsSent: result.emailsSent,
                    errors: result.errors,
                },
            });
        }

        // Insert announcement using created_by only (author_id column does not exist)
        const { data, error } = await supabase
            .from('announcements')
            .insert([{ title, content, created_by: authContext.user.id }])
            .select();

        if (error) {
            const fkViolation = typeof error.code === 'string' && error.code === '23503';
            console.error('Error creating announcement:', error);
            return NextResponse.json(
                {
                    error: 'Failed to create announcement',
                    details: error.message,
                    hint: fkViolation ? 'Foreign key violation on created_by → profiles(id). Ensure the author profile exists.' : undefined,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({ announcement: data[0] });
    } catch (error: unknown) {
        console.error('Unexpected error creating announcement:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
} 
