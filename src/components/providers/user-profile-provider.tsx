"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/apiClient';

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
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetch profile from API
            const { data: profileData, error: profileError } = await apiGet<{ data: UserProfile | null; error: string | null }>(`/api/users/profile`);
            if (profileError) throw new Error(profileError);
            setProfile(profileData);
        } catch (err: any) {
            setError(err.message || 'Failed to load user profile');
            setProfile(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
        // Listen for auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange((event: string, session: unknown) => {
            if (event === 'USER_UPDATED' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                fetchProfile();
            } else if (event === 'SIGNED_OUT') {
                setProfile(null);
            }
        });
        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [fetchProfile, supabase]);

    return (
        <UserProfileContext.Provider value={{ profile, isLoading, error, refreshProfile: fetchProfile, setProfile }}>
            {children}
        </UserProfileContext.Provider>
    );
};

export function useUserProfile() {
    const ctx = useContext(UserProfileContext);
    if (!ctx) throw new Error('useUserProfile must be used within a UserProfileProvider');
    return ctx;
} 