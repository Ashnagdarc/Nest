export interface UserProfile {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    status: string | null;
    avatar_url?: string | null;
    phone?: string | null;
    department?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export type UserRole = 'Admin' | 'User' | 'Manager';
export type UserStatus = 'Active' | 'Inactive' | 'Suspended';

export const USER_ROLES: UserRole[] = ['Admin', 'User', 'Manager'];
export const USER_STATUSES: UserStatus[] = ['Active', 'Inactive', 'Suspended'];
