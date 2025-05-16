import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

type UserProfile = {
    id: string;
    role: string;
    full_name?: string;
    email?: string;
    status?: string;
};

type UserData = {
    user: User | null;
    profile: UserProfile | null;
    isLoading: boolean;
    error: string | null;
};

export function useUser() {
    const supabase = createClient();
    const [userData, setUserData] = useState<UserData>({
        user: null,
        profile: null,
        isLoading: true,
        error: null
    });

    useEffect(() => {
        async function loadUser() {
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();

                if (userError) {
                    throw userError;
                }

                if (!user) {
                    setUserData({
                        user: null,
                        profile: null,
                        isLoading: false,
                        error: null
                    });
                    return;
                }

                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, role, full_name, email, status')
                    .eq('id', user.id)
                    .single();

                if (profileError) {
                    throw profileError;
                }

                setUserData({
                    user,
                    profile,
                    isLoading: false,
                    error: null
                });
            } catch (error: any) {
                console.error("Error loading user data:", error.message);
                setUserData({
                    user: null,
                    profile: null,
                    isLoading: false,
                    error: error.message
                });
            }
        }

        loadUser();

        // Set up auth state change listener
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, session: Session | null) => {
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    // Reload user data
                    loadUser();
                } else if (event === 'SIGNED_OUT') {
                    setUserData({
                        user: null,
                        profile: null,
                        isLoading: false,
                        error: null
                    });
                }
            }
        );

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [supabase]);

    return userData;
} 