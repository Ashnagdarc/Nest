import { useState, useCallback } from 'react'
import type {
    Gear,
    Profile,
    GearRequest,
    ActivityLog,
    Notification,
    LoadingStates,
    PerformanceState
} from '@/types/dashboard'
import { apiGet } from '@/lib/apiClient'

/**
 * Custom hook for dashboard data management
 */
export function useDashboardData() {
    // Data State
    const [gears, setGears] = useState<Gear[]>([])
    const [users, setUsers] = useState<Profile[]>([])
    const [requests, setRequests] = useState<GearRequest[]>([])
    const [activities, setActivities] = useState<ActivityLog[]>([])
    const [notifications, setNotifications] = useState<Notification[]>([])

    // Loading States
    const [loadingStates, setLoadingStates] = useState<LoadingStates>({
        gears: false,
        users: false,
        requests: false,
        activities: false,
        notifications: false,
        stats: false,
        initialLoad: false
    })

    // Performance tracking
    const [performance, setPerformance] = useState<PerformanceState>({
        averageQueryTime: 0,
        totalQueries: 0,
        failedQueries: 0,
        cacheHitRate: 0
    })

    // Performance tracking utility
    const trackPerformance = useCallback((queryTime: number, failed: boolean = false) => {
        setPerformance(prev => ({
            averageQueryTime: (prev.averageQueryTime * prev.totalQueries + queryTime) / (prev.totalQueries + 1),
            totalQueries: prev.totalQueries + 1,
            failedQueries: prev.failedQueries + (failed ? 1 : 0),
            cacheHitRate: prev.cacheHitRate // Updated elsewhere
        }))
    }, [])

    // Data fetching functions
    const fetchGears = useCallback(async () => {
        setLoadingStates(prev => ({ ...prev, gears: true }))
        const startTime = Date.now()

        try {
            // Fetch all gears (no pagination)
            const { data, error } = await apiGet<{ data: Gear[]; error: string | null }>(`/api/gears?pageSize=1000`)
            const queryTime = Date.now() - startTime
            trackPerformance(queryTime, !!error)

            if (error) throw new Error(error)
            setGears(data || [])
        } catch (error) {
            console.error('Failed to fetch gears:', error)
            throw error
        } finally {
            setLoadingStates(prev => ({ ...prev, gears: false }))
        }
    }, [trackPerformance])

    const fetchUsers = useCallback(async () => {
        setLoadingStates(prev => ({ ...prev, users: true }))
        const startTime = Date.now()

        try {
            // Fetch all users (no pagination)
            const { data, error } = await apiGet<{ data: Profile[]; error: string | null }>(`/api/users?pageSize=1000`)
            const queryTime = Date.now() - startTime
            trackPerformance(queryTime, !!error)

            if (error) throw new Error(error)
            setUsers(data || [])
        } catch (error) {
            console.error('Failed to fetch users:', error)
            throw error
        } finally {
            setLoadingStates(prev => ({ ...prev, users: false }))
        }
    }, [trackPerformance])

    const fetchRequests = useCallback(async () => {
        setLoadingStates(prev => ({ ...prev, requests: true }))
        const startTime = Date.now()

        try {
            // Use centralized API client and RESTful endpoint
            const { data, error } = await apiGet<{ data: GearRequest[]; error: string | null }>(`/api/requests`)
            const queryTime = Date.now() - startTime
            trackPerformance(queryTime, !!error)

            if (error) throw new Error(error)
            setRequests(data || [])
        } catch (error) {
            console.error('Failed to fetch requests:', error)
            throw error
        } finally {
            setLoadingStates(prev => ({ ...prev, requests: false }))
        }
    }, [trackPerformance])

    const fetchActivities = useCallback(async () => {
        setLoadingStates(prev => ({ ...prev, activities: true }))
        const startTime = Date.now()

        try {
            // Use centralized API client and RESTful endpoint
            const { data, error } = await apiGet<{ data: ActivityLog[]; error: string | null }>(`/api/dashboard/activities`)
            const queryTime = Date.now() - startTime
            trackPerformance(queryTime, !!error)

            if (error) throw new Error(error)
            setActivities(data || [])
        } catch (error) {
            console.error('Failed to fetch activities:', error)
            throw error
        } finally {
            setLoadingStates(prev => ({ ...prev, activities: false }))
        }
    }, [trackPerformance])

    const fetchNotifications = useCallback(async () => {
        setLoadingStates(prev => ({ ...prev, notifications: true }))
        const startTime = Date.now()

        try {
            // Use centralized API client and RESTful endpoint
            const { data, error } = await apiGet<{ data: Notification[]; error: string | null }>(`/api/notifications`)
            const queryTime = Date.now() - startTime
            trackPerformance(queryTime, !!error)

            if (error) throw new Error(error)
            setNotifications(data || [])
        } catch (error) {
            console.error('Failed to fetch notifications:', error)
            throw error
        } finally {
            setLoadingStates(prev => ({ ...prev, notifications: false }))
        }
    }, [trackPerformance])

    // Refresh all data
    const refreshData = useCallback(async () => {
        await Promise.all([
            fetchGears(),
            fetchUsers(),
            fetchRequests(),
            fetchActivities(),
            fetchNotifications()
        ])
    }, [fetchGears, fetchUsers, fetchRequests, fetchActivities, fetchNotifications])

    // Calculate overall loading state
    const loading = Object.values(loadingStates).some(state => state)

    return {
        // Data
        gears,
        users,
        requests,
        activities,
        notifications,

        // Loading states
        loading,
        loadingStates,

        // Performance
        performance,

        // Actions
        fetchGears,
        fetchUsers,
        fetchRequests,
        fetchActivities,
        fetchNotifications,
        refreshData
    }
} 