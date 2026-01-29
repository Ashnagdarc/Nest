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
    triggerLoginNotification: () => Promise<void>;
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
            console.log('[UserProfileProvider] Auth event:', event, session ? 'has session' : 'no session');
            if (event === 'USER_UPDATED' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                fetchProfile();
                if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && !loginPushSent.current) {
                    console.log('[UserProfileProvider] Triggering login notification');
                    loginPushSent.current = true;
                    // Trigger login notification with token
                    const userSession = session as Session | null;
                    if (userSession?.access_token) {
                        console.log('[UserProfileProvider] Making fetch to login API');
                        fetch('/api/notifications/login', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${userSession.access_token}`
                            }
                        }).then(async response => {
                            console.log('[UserProfileProvider] Login API response:', response.status);
                            if (!response.ok) {
                                const errorText = await response.text();
                                console.error('[UserProfileProvider] Login API error:', errorText);
                            } else {
                                const data = await response.json();
                                console.log('[UserProfileProvider] Login API success:', data);
                            }
                        }).catch(error => {
                            console.error('[UserProfileProvider] Login API fetch error:', error);
                        });
                    } else {
                        console.log('[UserProfileProvider] No access token available');
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

    const triggerLoginNotification = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                console.log('[UserProfileProvider] Manual trigger: Making fetch to login API');
                const response = await fetch('/api/notifications/login', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`
                    }
                });
                console.log('[UserProfileProvider] Manual trigger response:', response.status);
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('[UserProfileProvider] Manual trigger error:', errorText);
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                } else {
                    const data = await response.json();
                    console.log('[UserProfileProvider] Manual trigger success:', data);
                    alert('Login notification triggered successfully! Check for push notification.');
                }
            } else {
                console.log('[UserProfileProvider] Manual trigger: No access token');
                alert('No active session - please log in first');
            }
        } catch (error) {
            console.error('[UserProfileProvider] Manual trigger failed:', error);
            alert(`Failed to trigger login notification: ${error}`);
        }
    }, [supabase]);

    const value = {
        profile,
        isLoading,
        error,
        refreshProfile: fetchProfile,
        setProfile,
        triggerLoginNotification // Add this to context
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