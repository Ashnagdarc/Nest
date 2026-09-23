import { NextRequest, NextResponse } from 'next/server';
import { AnnouncementService } from '@/services/announcement-service';
import { requireActiveAdminRouteUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
    try {
        const authContext = await requireActiveAdminRouteUser();
        if ('errorResponse' in authContext) {
            return authContext.errorResponse;
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
            authContext.user.id
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
