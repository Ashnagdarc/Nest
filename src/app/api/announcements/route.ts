import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    try {
        const supabase = await createSupabaseServerClient(true);
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
        const userId = searchParams.get('userId');

        const offset = (page - 1) * limit;

        const query = supabase
            .from('announcements')
            .select('*, profiles(full_name, avatar_url)')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (userId) {
            const { data, error, count } = await supabase
                .from('announcements')
                .select(`
          *, 
          profiles(full_name, avatar_url),
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
        const supabase = await createSupabaseServerClient(true);
        const { title, content, author_id, send_notifications = false } = await request.json();

        if (!title || !content || !author_id) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (send_notifications) {
            const { AnnouncementService } = await import('@/services/announcement-service');
            const announcementService = new AnnouncementService();

            const result = await announcementService.createAnnouncementWithNotifications(
                title,
                content,
                author_id
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
            .insert([{ title, content, created_by: author_id }])
            .select();

        if (error) {
            const fkViolation = (error as any)?.code === '23503';
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
    } catch (error: any) {
        console.error('Unexpected error creating announcement:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred', details: String(error?.message || error) },
            { status: 500 }
        );
    }
} 