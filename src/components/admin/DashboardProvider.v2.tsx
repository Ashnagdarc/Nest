'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'

// Types
import type { EnhancedDashboardContextType } from '@/types/dashboard'

// Custom Hooks
import { useDashboardData } from '@/hooks/dashboard/use-dashboard-data'
import { useDashboardRealtime } from '@/hooks/dashboard/use-dashboard-realtime'
import { useDashboardStats } from '@/hooks/dashboard/use-dashboard-stats'

/**
 * Dashboard Context
 */
const DashboardContext = createContext<EnhancedDashboardContextType | undefined>(undefined)

/**
 * Enhanced Dashboard Provider v2.0 - Clean & Modular
 * 
 * This simplified provider orchestrates data management, real-time subscriptions,
 * and statistics calculation through dedicated custom hooks.
 */
export function DashboardProvider({ children }: { children: React.ReactNode }) {
    const { toast } = useToast()

    // Error handling state
    const [error, setError] = useState<string | null>(null)
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Cache management
    const cacheRef = useRef<Map<string, { data: any; timestamp: Date; ttl: number }>>(new Map())

    // Custom hooks for modular functionality
    const {
        gears,
        users,
        requests,
        activities,
        notifications,
        loading,
        loadingStates,
        performance,
        fetchGears,
        fetchUsers,
        fetchRequests,
        fetchActivities,
        fetchNotifications,
        refreshData
    } = useDashboardData()

    const {
        realTimeEnabled,
        realTimeState,
        setupRealtimeSubscriptions,
        toggleRealTime,
        cleanup: cleanupRealtime
    } = useDashboardRealtime()

    // Calculate statistics using the dedicated hook
    const stats = useDashboardStats(gears, users, requests, activities, notifications, performance, errors)

    // Error handling functions
    const clearError = useCallback(() => {
        setError(null)
        setErrors({})
    }, [])

    const clearSpecificError = useCallback((type: string) => {
        setErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors[type]
            return newErrors
        })
    }, [])

    // Enhanced toggle with toast notifications
    const enhancedToggleRealTime = useCallback((enabled: boolean) => {
        toggleRealTime(enabled)

        if (enabled) {
            toast({
                title: "Real-time Updates Enabled",
                description: "Dashboard will update automatically",
            })
        } else {
            toast({
                title: "Real-time Updates Disabled",
                description: "Dashboard will require manual refresh",
            })
        }
    }, [toggleRealTime, toast])

    // Cache management functions
    const clearCache = useCallback(() => {
        cacheRef.current.clear()
    }, [])

    const getCacheStatus = useCallback(() => {
        const status: Record<string, { size: number; lastUpdated: Date }> = {}
        cacheRef.current.forEach((value, key) => {
            status[key] = {
                size: JSON.stringify(value.data).length,
                lastUpdated: value.timestamp
            }
        })
        return status
    }, [])

    // Initial data load effect
    useEffect(() => {
        let mounted = true

        const initializeData = async () => {
            if (!mounted) return

            console.log('Initializing dashboard data...')

            try {
                // Load critical data first
                await fetchGears()
                if (!mounted) return

                await fetchUsers()
                if (!mounted) return

                await fetchRequests()
                if (!mounted) return

                // Load non-critical data
                await fetchActivities()
                await fetchNotifications()

                console.log('Dashboard initialization complete')
            } catch (error) {
                console.error('Failed to initialize dashboard:', error)
                if (mounted) {
                    setError('Failed to load dashboard data')
                }
            }
        }

        initializeData()

        return () => {
            mounted = false
        }
    }, []) // Empty dependency array - only run once

    // Real-time setup effect
    useEffect(() => {
        if (realTimeEnabled && !realTimeState.connected) {
            setupRealtimeSubscriptions()
        }

        return cleanupRealtime
    }, [realTimeEnabled, realTimeState.connected, setupRealtimeSubscriptions, cleanupRealtime])

    // Context value with minimal dependencies
    const contextValue = useMemo((): EnhancedDashboardContextType => ({
        // Data
        gears,
        users,
        requests,
        activities,
        notifications,
        stats,

        // Loading
        loading,
        loadingStates,

        // Error handling
        error,
        errors,
        clearError,
        clearSpecificError,

        // Data actions
        refreshData,
        refreshGears: fetchGears,
        refreshUsers: fetchUsers,
        refreshRequests: fetchRequests,
        refreshActivities: fetchActivities,
        refreshNotifications: fetchNotifications,

        // Real-time
        realTimeEnabled,
        realTimeState,
        toggleRealTime: enhancedToggleRealTime,

        // Performance
        performance,

        // Cache
        clearCache,
        getCacheStatus
    }), [
        gears, users, requests, activities, notifications, stats,
        loading, loadingStates, error, errors,
        clearError, clearSpecificError, refreshData,
        fetchGears, fetchUsers, fetchRequests, fetchActivities, fetchNotifications,
        realTimeEnabled, realTimeState, enhancedToggleRealTime,
        performance, clearCache, getCacheStatus
    ])

    return (
        <DashboardContext.Provider value={contextValue}>
            {children}
        </DashboardContext.Provider>
    )
}

/**
 * Custom hook to use the dashboard context
 */
export function useDashboard(): EnhancedDashboardContextType {
    const context = useContext(DashboardContext)
    if (context === undefined) {
        throw new Error('useDashboard must be used within a DashboardProvider')
    }
    return context
} 