import { isAccountActive } from '@/lib/auth/account-status';

type ProfileRole = {
    role?: string | null;
    status?: string | null;
};

const USER_TO_ADMIN_PATH: Record<string, string> = {
    '/user/dashboard': '/admin/dashboard',
    '/user/settings': '/admin/settings',
    '/user/notifications': '/admin/notifications',
    '/user/announcements': '/admin/announcements',
};

/** Staff-only pages that land on the admin dashboard, with the admin screen to use instead. */
export const USER_ONLY_ROUTE_HINTS: Record<string, { href: string; label: string }> = {
    '/user/browse': { href: '/admin/manage-gears', label: 'Manage gears' },
    '/user/request': { href: '/admin/manage-requests', label: 'Manage requests' },
    '/user/car-booking': { href: '/admin/manage-car-bookings', label: 'Car bookings' },
};

export function adminRedirectUrl(pathname: string): string | null {
    const adminPath = getAdminRedirectForUserPath(pathname);
    if (!adminPath) return null;
    if (adminPath === '/admin/dashboard' && pathname !== '/user/dashboard') {
        return `${adminPath}?redirectedFrom=${encodeURIComponent(pathname)}`;
    }
    return adminPath;
}

export function isActiveAdminProfile(profile: ProfileRole | null | undefined): boolean {
    return profile?.role === 'Admin' && isAccountActive(profile.status);
}

export function getDashboardPathForProfile(
    profile: ProfileRole | null | undefined,
): '/admin/dashboard' | '/user/dashboard' {
    return isActiveAdminProfile(profile) ? '/admin/dashboard' : '/user/dashboard';
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
