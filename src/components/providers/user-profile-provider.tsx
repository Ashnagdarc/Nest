"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/apiClient';
import { Session } from '@supabase/supabase-js';

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
    const loginPushSent = useRef(false);

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
            setProfile(profileData);
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
    }, [supabase]);

    useEffect(() => {
        fetchProfile();
        // Listen for auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange((event: string, session: unknown) => {
            if (event === 'USER_UPDATED' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                fetchProfile();
                if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && !loginPushSent.current) {
                    loginPushSent.current = true;
                    // Trigger login notification with token
                    const userSession = session as Session | null;
                    if (userSession?.access_token) {
                        fetch('/api/notifications/login', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${userSession.access_token}`
                            }
                        }).catch(console.error);
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                setProfile(null);
                loginPushSent.current = false; // Reset on sign out
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