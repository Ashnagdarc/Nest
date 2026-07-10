"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/apiClient';
import { isAccountActive, normalizeAccountStatus } from '@/lib/auth/account-status';
import { getAdminRedirectForUserPath } from '@/lib/auth/role-routing';
export type UserProfile = {
    id: string;
    email?: string;
    full_name?: string;
    avatar_url?: string;
    role?: string;
    [key: string]: any;
};

interface UserProfileContextType {
    profile: UserProfile | null;
    isLoading: boolean;
    error: string | null;
    refreshProfile: () => Promise<void>;
    setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const supabase = createClient();
    const router = useRouter();
    const pathname = usePathname();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Check for active session first to avoid 401
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setProfile(null);
                setIsLoading(false);
                return;
            }

            // Fetch profile from API
            const { data: profileData, error: profileError } = await apiGet<{ data: UserProfile | null; error: string | null }>(`/api/users/profile`);
            if (profileError && profileError !== '') throw new Error(profileError);

            if (profileData && !isAccountActive(profileData.status)) {
                await supabase.auth.signOut();
                setProfile(null);
                const blockedStatus = normalizeAccountStatus(profileData.status) ?? 'inactive';
                const params = new URLSearchParams({
                    accountStatus: blockedStatus,
                });
                if (profileData.full_name?.trim()) {
                    params.set('name', profileData.full_name.trim());
                }
                if (pathname !== '/login') {
                    router.replace(`/login?${params.toString()}`);
                }
                return;
            }

            setProfile(profileData);

            if (
                profileData?.role === 'Admin' &&
                isAccountActive(profileData.status) &&
                pathname.startsWith('/user')
            ) {
                const adminPath = getAdminRedirectForUserPath(pathname);
                if (adminPath) {
                    router.replace(adminPath);
                }
            }
        } catch (err: any) {
            // Check if error is 401 (Unauthorized) which might happen if session is barely expired
            if (err.message && err.message.includes('401')) {
                setProfile(null);
            } else {
                setError(err.message || 'Failed to load user profile');
                setProfile(null);
            }
        } finally {
            setIsLoading(false);
        }
    }, [pathname, router, supabase]);

    useEffect(() => {
        fetchProfile();
        // Listen for auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange((event: string) => {
            if (event === 'USER_UPDATED' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                fetchProfile();
            } else if (event === 'SIGNED_OUT') {
                setProfile(null);
            }
        });
        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [fetchProfile, supabase]);

    const value = {
        profile,
        isLoading,
        error,
        refreshProfile: fetchProfile,
        setProfile,
    };

    return (
        <UserProfileContext.Provider value={value}>
            {children}
        </UserProfileContext.Provider>
    );

}

export function useUserProfile() {
    const ctx = useContext(UserProfileContext);
    if (!ctx) throw new Error('useUserProfile must be used within a UserProfileProvider');
    return ctx;
}