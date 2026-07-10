import { isAccountActive } from '@/lib/auth/account-status';

type ProfileRole = {
    role?: string | null;
    status?: string | null;
};

const USER_TO_ADMIN_PATH: Record<string, string> = {
    '/user/dashboard': '/admin/dashboard',
    '/user/settings': '/admin/settings',
    '/user/notifications': '/admin/notifications',
    '/user/live-bus': '/admin/live-bus',
    '/user/announcements': '/admin/announcements',
};

export function isActiveAdminProfile(profile: ProfileRole | null | undefined): boolean {
    return profile?.role === 'Admin' && isAccountActive(profile.status);
}

export function getDashboardPathForProfile(
    profile: ProfileRole | null | undefined,
): '/admin/dashboard' | '/user/dashboard' {
    return profile?.role === 'Admin' ? '/admin/dashboard' : '/user/dashboard';
}

/** Map a user-portal path to the closest admin equivalent, if any. */
export function getAdminRedirectForUserPath(pathname: string): string | null {
    if (!pathname.startsWith('/user')) {
        return null;
    }

    if (USER_TO_ADMIN_PATH[pathname]) {
        return USER_TO_ADMIN_PATH[pathname];
    }

    return '/admin/dashboard';
}

export function getSettingsPathForProfile(profile: ProfileRole | null | undefined): string {
    return isActiveAdminProfile(profile) ? '/admin/settings' : '/user/settings';
}
