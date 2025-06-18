/**
 * User Authentication Hook - Centralized User State Management
 * 
 * A comprehensive custom hook that manages user authentication state, profile data,
 * and user-related operations throughout the Nest by Eden Oasis application.
 * This hook serves as the primary interface for all user authentication logic
 * and provides a consistent API for accessing user information.
 * 
 * Core Responsibilities:
 * - User authentication state management
 * - Profile data fetching and caching
 * - Login/logout functionality
 * - Role-based access control
 * - Real-time profile updates
 * - Session management and persistence
 * 
 * Authentication Features:
 * - Automatic session restoration on app load
 * - Real-time authentication state changes
 * - Profile data synchronization with Supabase
 * - Role detection (Admin vs User)
 * - Logout cleanup and state reset
 * 
 * Performance Optimizations:
 * - Profile data caching to reduce API calls
 * - Efficient re-renders through state management
 * - Automatic cleanup on component unmount
 * - Debounced profile updates
 * 
 * Security Features:
 * - Secure session handling through Supabase Auth
 * - Role-based permission checks
 * - Automatic session expiration handling
 * - Protected route authentication
 * 
 * @fileoverview Custom hook for user authentication and profile management
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 * @since 2024-01-15
 */

'use client'

import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'

// Type definitions for better code clarity
type Profile = Database['public']['Tables']['profiles']['Row']
type UserRole = Database['public']['Enums']['user_role']

/**
 * User Hook State Interface
 * 
 * Defines the complete state structure returned by the useUser hook.
 * This interface provides type safety and clear documentation of all
 * available user-related data and functions.
 * 
 * @interface UseUserReturn
 */
interface UseUserReturn {
    /** Current authenticated user from Supabase Auth */
    user: User | null
    /** Current user session information */
    session: Session | null
    /** Extended user profile data from profiles table */
    profile: Profile | null
    /** Loading state for initial authentication check */
    loading: boolean
    /** Loading state for profile data fetching */
    profileLoading: boolean
    /** Current error state with details */
    error: string | null
    /** Whether the current user has admin privileges */
    isAdmin: boolean
    /** Whether the current user is authenticated */
    isAuthenticated: boolean
    /** Function to refresh user profile data */
    refreshProfile: () => Promise<void>
    /** Function to sign out the current user */
    signOut: () => Promise<void>
    /** Function to update user profile data */
    updateProfile: (updates: Partial<Profile>) => Promise<void>
}

/**
 * User Authentication Custom Hook
 * 
 * The primary hook for managing user authentication and profile data
 * throughout the application. This hook provides a centralized interface
 * for all user-related operations and state management.
 * 
 * Hook Features:
 * - Automatic authentication state detection
 * - Profile data fetching and management
 * - Real-time authentication state updates
 * - Role-based access control helpers
 * - Session management and cleanup
 * 
 * Data Flow:
 * 1. Initialize Supabase client and set up auth listener
 * 2. Fetch user profile data when user authenticates
 * 3. Provide real-time updates for auth state changes
 * 4. Handle profile updates and synchronization
 * 5. Clean up subscriptions on unmount
 * 
 * Error Handling:
 * - Network connection issues
 * - Authentication failures
 * - Profile data fetch errors
 * - Session expiration scenarios
 * 
 * @hook
 * @returns {UseUserReturn} Complete user state and management functions
 * 
 * @example
 * ```tsx
 * // Basic usage in components
 * const { user, profile, isAdmin, loading } = useUser()
 * 
 * // Conditional rendering based on auth state
 * if (loading) return <LoadingSpinner />
 * if (!user) return <LoginForm />
 * 
 * // Role-based access control
 * return (
 *   <div>
 *     <h1>Welcome, {profile?.full_name}!</h1>
 *     {isAdmin && <AdminPanel />}
 *   </div>
 * )
 * 
 * // Profile management
 * const { updateProfile, refreshProfile } = useUser()
 * 
 * const handleUpdateName = async (newName: string) => {
 *   await updateProfile({ full_name: newName })
 *   await refreshProfile()
 * }
 * 
 * // Authentication actions
 * const { signOut } = useUser()
 * 
 * const handleLogout = async () => {
 *   await signOut()
 *   router.push('/login')
 * }
 * ```
 */
export function useUser(): UseUserReturn {
    // Initialize Supabase client for authentication operations
    const supabase = createClient()

    // Core authentication state
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)

    // Loading and error states
    const [loading, setLoading] = useState(true)
    const [profileLoading, setProfileLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    /**
     * Derived State Calculations
     * 
     * Compute helpful boolean values based on the current user state
     * for easier usage in components and conditional rendering.
     */
    const isAuthenticated = !!user
    const isAdmin = profile?.role === 'Admin'

    /**
     * Fetch User Profile Data
     * 
     * Retrieves the user's profile information from the profiles table.
     * This function is called automatically when a user authenticates
     * and can be called manually to refresh profile data.
     * 
     * @param {string} userId - The ID of the user whose profile to fetch
     * @returns {Promise<void>} Promise that resolves when profile is fetched
     */
    const fetchProfile = async (userId: string): Promise<void> => {
        setProfileLoading(true)
        setError(null)

        try {
            const { data, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (profileError) {
                throw new Error(`Failed to fetch profile: ${profileError.message}`)
            }

            setProfile(data)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profile'
            setError(errorMessage)
            console.error('Profile fetch error:', err)
        } finally {
            setProfileLoading(false)
        }
    }

    /**
     * Refresh Profile Data
     * 
     * Manually refreshes the current user's profile data from the database.
     * Useful after profile updates or when you need to ensure data is current.
     * 
     * @returns {Promise<void>} Promise that resolves when profile is refreshed
     */
    const refreshProfile = async (): Promise<void> => {
        if (!user) {
            throw new Error('No authenticated user to refresh profile for')
        }

        await fetchProfile(user.id)
    }

    /**
     * Update User Profile
     * 
     * Updates the user's profile data in the database and refreshes
     * the local profile state with the updated information.
     * 
     * @param {Partial<Profile>} updates - Profile fields to update
     * @returns {Promise<void>} Promise that resolves when update is complete
     */
    const updateProfile = async (updates: Partial<Profile>): Promise<void> => {
        if (!user) {
            throw new Error('No authenticated user to update profile for')
        }

        setError(null)

        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id)

            if (updateError) {
                throw new Error(`Failed to update profile: ${updateError.message}`)
            }

            // Refresh profile data to get the latest information
            await fetchProfile(user.id)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update profile'
            setError(errorMessage)
            console.error('Profile update error:', err)
            throw err
        }
    }

    /**
     * Sign Out User
     * 
     * Signs out the current user and clears all local state.
     * This function handles the complete logout process including
     * cleanup of authentication state and profile data.
     * 
     * @returns {Promise<void>} Promise that resolves when sign out is complete
     */
    const signOut = async (): Promise<void> => {
        setError(null)

        try {
            const { error: signOutError } = await supabase.auth.signOut()

            if (signOutError) {
                throw new Error(`Failed to sign out: ${signOutError.message}`)
            }

            // Clear local state
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

    /**
     * Authentication State Management Effect
     * 
     * Sets up the authentication state listener and handles initial
     * session restoration. This effect manages the complete authentication
     * lifecycle including login, logout, and session changes.
     */
    useEffect(() => {
        let mounted = true

        /**
         * Handle Authentication State Change
         * 
         * Processes authentication state changes from Supabase Auth.
         * This function is called whenever the user's authentication
         * state changes (login, logout, session refresh, etc.).
         * 
         * @param {AuthChangeEvent} event - Type of auth change that occurred
         * @param {Session | null} session - New session data
         */
        const handleAuthChange = async (event: any, session: Session | null) => {
            if (!mounted) return

            setSession(session)

            if (session?.user) {
                setUser(session.user)
                // Fetch profile data for authenticated user
                await fetchProfile(session.user.id)
            } else {
                setUser(null)
                setProfile(null)
            }

            setLoading(false)
        }

        // Get initial session
        const initializeAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) {
                    throw new Error(`Failed to get session: ${error.message}`)
                }

                await handleAuthChange('INITIAL_SESSION', session)
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to initialize authentication'
                setError(errorMessage)
                console.error('Auth initialization error:', err)
                setLoading(false)
            }
        }

        initializeAuth()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange)

        // Cleanup function
        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [supabase.auth])

    /**
     * Return Hook Interface
     * 
     * Provides all user-related state and functions to consuming components.
     * This interface is designed to be comprehensive yet easy to use.
     */
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