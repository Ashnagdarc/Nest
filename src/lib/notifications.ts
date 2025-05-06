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

    const { error } = await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_type: 'gear',
        p_title: title,
        p_message: message
    });

    if (error) {
        console.error('Error creating notification:', error);
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

    const { error } = await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_type: 'profile',
        p_title: title,
        p_message: message
    });

    if (error) {
        console.error('Error creating notification:', error);
    }
}

export async function createSystemNotification(
    userId: string,
    title: string,
    message: string
) {
    const supabase = createClient();

    const { error } = await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_type: 'system',
        p_title: title,
        p_message: message
    });

    if (error) {
        console.error('Error creating notification:', error);
    }
} 