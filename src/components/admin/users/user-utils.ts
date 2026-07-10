import type { UserRole, UserStatus } from '@/components/admin/users/types';

export function normalizeRoleFilter(value: string): string | null {
    switch (value.toLowerCase()) {
        case 'admin':
            return 'Admin';
        case 'user':
            return 'User';
        case 'manager':
            return 'Manager';
        default:
            return null;
    }
}

export function normalizeUserRole(role: string | null | undefined): UserRole {
    switch (String(role || 'User').toLowerCase()) {
        case 'admin':
            return 'Admin';
        case 'manager':
            return 'Manager';
        default:
            return 'User';
    }
}

export function normalizeUserStatus(status: string | null | undefined): UserStatus {
    switch (String(status || 'Active').toLowerCase()) {
        case 'inactive':
            return 'Inactive';
        case 'suspended':
            return 'Suspended';
        default:
            return 'Active';
    }
}

export function getUserInitials(name: string | null | undefined): string {
    if (!name?.trim()) return 'U';
    return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}
