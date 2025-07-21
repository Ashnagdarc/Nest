import { createClient } from './supabase/client';

export async function createGearNotification(
    userId: string,
    gearName: string,
    action: 'checkout' | 'return' | 'damage' | 'repair' | 'add' | 'update' | 'delete'
) {
    const supabase = createClient();

    let title = '';
    let message = '';

    switch (action) {
        case 'checkout':
            title = 'Gear Checked Out';
            message = `You have checked out "${gearName}"`;
            break;
        case 'return':
            title = 'Gear Returned';
            message = `You have returned "${gearName}"`;
            break;
        case 'damage':
            title = 'Gear Damaged';
            message = `"${gearName}" has been marked as damaged`;
            break;
        case 'repair':
            title = 'Gear Repaired';
            message = `"${gearName}" has been repaired`;
            break;
        case 'add':
            title = 'New Gear Added';
            message = `"${gearName}" has been added to the inventory`;
            break;
        case 'update':
            title = 'Gear Updated';
            message = `"${gearName}" has been updated`;
            break;
        case 'delete':
            title = 'Gear Removed';
            message = `"${gearName}" has been removed from the inventory`;
            break;
    }

    const { error } = await supabase
        .from('notifications')
        .insert({
            user_id: userId,
            title,
            message,
            type: 'gear',
            is_read: false,
            created_at: new Date().toISOString(),
            category: 'equipment'
        });

    if (error) {
        console.error('Error creating gear notification:', error);
    }
}

export async function createProfileNotification(
    userId: string,
    action: 'update' | 'role_change' | 'status_change'
) {
    const supabase = createClient();

    let title = '';
    let message = '';

    switch (action) {
        case 'update':
            title = 'Profile Updated';
            message = 'Your profile has been updated';
            break;
        case 'role_change':
            title = 'Role Changed';
            message = 'Your role has been updated';
            break;
        case 'status_change':
            title = 'Status Changed';
            message = 'Your account status has been updated';
            break;
    }

    const { error } = await supabase
        .from('notifications')
        .insert({
            user_id: userId,
            title,
            message,
            type: 'profile',
            is_read: false,
            created_at: new Date().toISOString(),
            category: 'system'
        });

    if (error) {
        console.error('Error creating profile notification:', error);
    }
}

export async function createSystemNotification(
    userIdOrTitle: string,
    messageOrMessage: string,
    typeOrType: string = 'system',
    userIds?: string[]
) {
    const supabase = createClient();

    try {
        // Handle both old and new function signatures
        let title: string;
        let message: string;
        let type: string;
        let targetUserIds: string[] | undefined;

        if (userIds) {
            // New signature: createSystemNotification(title, message, type, userIds?)
            title = userIdOrTitle;
            message = messageOrMessage;
            type = typeOrType;
            targetUserIds = userIds;
        } else {
            // Old signature: createSystemNotification(userId, title, message)
            const userId = userIdOrTitle;
            title = messageOrMessage;
            message = typeOrType;
            type = 'system';
            targetUserIds = [userId];
        }

        // If no specific userIds provided, get all admin users
        if (!targetUserIds || targetUserIds.length === 0) {
            const { data: adminUsers, error: adminError } = await supabase
                .from('profiles')
                .select('id')
                .in('role', ['Admin', 'SuperAdmin'])
                .eq('status', 'active');

            if (adminError) {
                console.error('Error fetching admin users:', adminError);
                return;
            }

            targetUserIds = adminUsers?.map(user => user.id) || [];
        }

        if (targetUserIds.length === 0) {
            console.warn('No target users found for system notification');
            return;
        }

        // Create notifications for all target users
        const notifications = targetUserIds.map(userId => ({
            user_id: userId,
            title,
            message,
            type,
            is_read: false,
            created_at: new Date().toISOString(),
            category: 'system'
        }));

        const { error } = await supabase
            .from('notifications')
            .insert(notifications);

        if (error) {
            console.error('Error creating notifications:', error);
        } else {
            console.log(`Created ${notifications.length} system notifications`);
        }
    } catch (error) {
        console.error('Error in createSystemNotification:', error);
    }
} 