import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendAnnouncementEmail } from '@/lib/email';

export interface AnnouncementData {
    id: string;
    title: string;
    content: string;
    author_id: string;
    created_at: string;
}

export interface UserData {
    id: string;
    email: string;
    full_name: string;
}

/**
 * Announcement Service
 * Handles announcement creation, notifications, and email distribution
 */
export class AnnouncementService {
    /**
     * Create announcement and send notifications/emails to all users
     */
    async createAnnouncementWithNotifications(
        title: string,
        content: string,
        authorId: string
    ): Promise<{
        success: boolean;
        announcement?: AnnouncementData;
        notificationsSent?: number;
        emailsSent?: number;
        errors?: string[];
    }> {
        const errors: string[] = [];
        let notificationsSent = 0;
        let emailsSent = 0;

        try {
            const supabase = await createSupabaseServerClient(true);

            // Create the announcement (map authorId to created_by; no author_id column)
            const { data: announcement, error: announcementError } = await supabase
                .from('announcements')
                .insert([{ title, content, created_by: authorId }])
                .select()
                .single();

            if (announcementError || !announcement) {
                throw new Error(`Failed to create announcement: ${announcementError?.message}`);
            }

            console.log('✅ Announcement created:', announcement.id);

            // Fetch author information for notification metadata
            const { data: author, error: authorError } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', authorId)
                .single();

            if (authorError) {
                console.warn('Could not fetch author info:', authorError.message);
            }

            const authorName = author?.full_name || 'Administrator';

            // Get all active users
            const { data: users, error: usersError } = await supabase
                .from('profiles')
                .select('id, email, full_name')
                .eq('status', 'Active')
                .not('email', 'is', null);

            if (usersError) {
                throw new Error(`Failed to fetch users: ${usersError.message}`);
            }

            // Create notifications for users
            const notificationsPayload = (users || []).map(u => ({
                user_id: u.id,
                type: 'announcement',
                title: title,
                message: content,
                link: `/user/announcements?announcement=${announcement.id}`,
                metadata: { author_name: authorName }
            }));

            if (notificationsPayload.length > 0) {
                const { error: notifyError } = await supabase
                    .from('notifications')
                    .insert(notificationsPayload);
                if (notifyError) {
                    errors.push(`Notification insert failed: ${notifyError.message}`);
                } else {
                    notificationsSent = notificationsPayload.length;
                }
            }

            return {
                success: true,
                announcement,
                notificationsSent,
                emailsSent,
                errors: errors.length ? errors : undefined,
            };
        } catch (e: any) {
            errors.push(e?.message || String(e));
            return { success: false, errors };
        }
    }

    /**
     * Get all active users for announcement distribution
     */
    async getActiveUsers(): Promise<UserData[]> {
        try {
            const supabase = await createSupabaseServerClient(true);
            const { data: users, error } = await supabase
                .from('profiles')
                .select('id, email, full_name')
                .eq('status', 'Active')
                .not('email', 'is', null);

            if (error) {
                throw new Error(`Failed to fetch users: ${error.message}`);
            }

            return users || [];
        } catch (error) {
            console.error('Error fetching active users:', error);
            return [];
        }
    }

    /**
     * Send announcement to specific users
     */
    async sendAnnouncementToUsers(
        announcement: AnnouncementData,
        userIds: string[],
        authorName: string
    ): Promise<{
        success: boolean;
        notificationsSent: number;
        emailsSent: number;
        errors: string[];
    }> {
        const errors: string[] = [];
        let notificationsSent = 0;
        let emailsSent = 0;

        try {
            const supabase = await createSupabaseServerClient(true);

            // Get user details
            const { data: users, error: usersError } = await supabase
                .from('profiles')
                .select('id, email, full_name')
                .in('id', userIds)
                .eq('status', 'Active')
                .not('email', 'is', null);

            if (usersError) {
                throw new Error(`Failed to fetch users: ${usersError.message}`);
            }

            if (!users || users.length === 0) {
                return { success: true, notificationsSent: 0, emailsSent: 0, errors: [] };
            }

            // Create notifications
            const notificationPromises = users.map(async (user: UserData) => {
                try {
                    const { error: notificationError } = await supabase
                        .from('notifications')
                        .insert({
                            user_id: user.id,
                            type: 'Announcement',
                            title: `New Announcement: ${announcement.title}`,
                            message: `A new announcement "${announcement.title}" has been posted by ${authorName}.`,
                            category: 'announcement',
                            priority: 'High',
                            metadata: {
                                announcement_id: announcement.id,
                                author_name: authorName,
                            },
                            link: `/user/announcements?announcement=${announcement.id}`,
                        });

                    if (notificationError) {
                        errors.push(`Notification for ${user.email}: ${notificationError.message}`);
                        return false;
                    }

                    return true;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    errors.push(`Notification for ${user.email}: ${errorMessage}`);
                    return false;
                }
            });

            const notificationResults = await Promise.all(notificationPromises);
            notificationsSent = notificationResults.filter(Boolean).length;

            // Send emails
            const emailPromises = users.map(async (user: UserData) => {
                try {
                    const emailResult = await sendAnnouncementEmail({
                        to: user.email,
                        userName: user.full_name || 'User',
                        announcementTitle: announcement.title,
                        announcementContent: announcement.content,
                        authorName,
                        announcementId: announcement.id,
                    });

                    if (!emailResult.success) {
                        errors.push(`Email to ${user.email}: ${emailResult.error}`);
                        return false;
                    }

                    return true;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    errors.push(`Email to ${user.email}: ${errorMessage}`);
                    return false;
                }
            });

            const emailResults = await Promise.all(emailPromises);
            emailsSent = emailResults.filter(Boolean).length;

            return {
                success: true,
                notificationsSent,
                emailsSent,
                errors,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error in sendAnnouncementToUsers:', error);
            return {
                success: false,
                notificationsSent: 0,
                emailsSent: 0,
                errors: [errorMessage],
            };
        }
    }
}
