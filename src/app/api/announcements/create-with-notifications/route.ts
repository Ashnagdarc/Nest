import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AnnouncementService } from '@/services/announcement-service';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || profile.role !== 'Admin') {
            return NextResponse.json(
                { error: 'Only administrators can create announcements' },
                { status: 403 }
            );
        }

        const { title, content } = await request.json();

        if (!title || !content) {
            return NextResponse.json(
                { error: 'Title and content are required' },
                { status: 400 }
            );
        }

        // Create announcement with notifications and emails
        const announcementService = new AnnouncementService();
        const result = await announcementService.createAnnouncementWithNotifications(
            title,
            content,
            user.id
        );

        if (!result.success) {
            return NextResponse.json(
                {
                    error: 'Failed to create announcement',
                    details: result.errors
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            announcement: result.announcement,
            stats: {
                notificationsSent: result.notificationsSent,
                emailsSent: result.emailsSent,
                errors: result.errors,
            },
        });
    } catch (error) {
        console.error('Error creating announcement with notifications:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
