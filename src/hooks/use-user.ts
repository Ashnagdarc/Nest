// Custom hook for user authentication and profile management in Nest by Eden Oasis.

'use client'

import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'
import { apiGet } from '@/lib/apiClient';

type Profile = Database['public']['Tables']['profiles']['Row']

interface UseUserReturn {
    user: User | null
    session: Session | null
    profile: Profile | null
    loading: boolean
    profileLoading: boolean
    error: string | null
    isAdmin: boolean
    isAuthenticated: boolean
    refreshProfile: () => Promise<void>
    signOut: () => Promise<void>
    updateProfile: (updates: Partial<Profile>) => Promise<void>
}

export function useUser(): UseUserReturn {
    const supabase = createClient()
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [profileLoading, setProfileLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isAuthenticated = !!user
    const isAdmin = profile?.role === 'Admin'

    // Fetch user profile from API
    const fetchProfile = async (userId: string): Promise<void> => {
        setProfileLoading(true)
        setError(null)
        try {
            const { data, error: profileError } = await apiGet<{ data: Profile | null; error: string | null }>(`/api/users/${userId}`)
            if (profileError) throw new Error(`Failed to fetch profile: ${profileError}`)
            setProfile(data)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profile'
            setError(errorMessage)
            console.error('Profile fetch error:', err)
        } finally {
            setProfileLoading(false)
        }
    }

    const refreshProfile = async (): Promise<void> => {
        if (!user) throw new Error('No authenticated user to refresh profile for')
        await fetchProfile(user.id)
    }

    const updateProfile = async (updates: Partial<Profile>): Promise<void> => {
        if (!user) throw new Error('No authenticated user to update profile for')
        setError(null)
        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', user.id)
            if (updateError) throw new Error(`Failed to update profile: ${updateError.message}`)
            await fetchProfile(user.id)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update profile'
            setError(errorMessage)
            console.error('Profile update error:', err)
            throw err
        }
    }

    const signOut = async (): Promise<void> => {
        setError(null)
        try {
            const { error: signOutError } = await supabase.auth.signOut()
            if (signOutError) throw new Error(`Failed to sign out: ${signOutError.message}`)
            setUser(null)
            setSession(null)
            setProfile(null)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to sign out'
            setError(errorMessage)
            console.error('Sign out error:', err)
            throw err
        }
    }

    // Auth state management effect
    useEffect(() => {
        let mounted = true
        const handleAuthChange = async (_event: unknown, session: Session | null) => {
            if (!mounted) return
            setSession(session)
            if (session?.user) {
                setUser(session.user)
                await fetchProfile(session.user.id)
            } else {
                setUser(null)
                setProfile(null)
            }
            setLoading(false)
        }
        const initializeAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession()
                if (error) throw new Error(`Failed to get session: ${error.message}`)
                await handleAuthChange('INITIAL_SESSION', session)
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to initialize authentication'
                setError(errorMessage)
                console.error('Auth initialization error:', err)
                setLoading(false)
            }
        }
        initializeAuth()
        const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange)
        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [supabase.auth])

    return {
        user,
        session,
        profile,
        loading,
        profileLoading,
        error,
        isAdmin,
        isAuthenticated,
        refreshProfile,
        signOut,
        updateProfile
    }
} 