/**
 * Admin Dashboard Provider v2.0 - Enhanced Real-Time State Management (SIMPLIFIED FOR DEBUGGING)
 * 
 * A comprehensive React Context provider that manages all state, data fetching,
 * and real-time synchronization for the admin dashboard. This enhanced version
 * provides robust real-time functionality while avoiding server import conflicts
 * by staying strictly client-side.
 * 
 * @fileoverview Enhanced centralized state management provider for admin dashboard
 * @author Daniel Chinonso Samuel
 * @version 2.0.0 - Enhanced Real-Time Edition - Simplified
 * @since 2024-01-15
 */

'use client'

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef
} from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'
import { useToast } from '@/hooks/use-toast'
import { apiGet } from '@/lib/apiClient'
import { calculateAccurateDashboardCounts } from '@/lib/utils/fix-dashboard-counts';

// Type definitions for cleaner code and better IntelliSense
type Gear = Database['public']['Tables']['gears']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']
type GearRequest = Database['public']['Tables']['gear_requests']['Row']
type ActivityLog = Database['public']['Tables']['gear_activity_log']['Row']
type Notification = Database['public']['Tables']['notifications']['Row']

/**
 * Enhanced Dashboard Statistics Interface
 */
interface EnhancedDashboardStats {
    totalEquipment: number
    availableEquipment: number
    checkedOutEquipment: number
    underRepairEquipment: number
    retiredEquipment: number
    utilizationRate: number
    pendingRequests: number
    approvedRequests: number
    rejectedRequests: number
    overdueRequests: number
    totalRequests: number
    approvalRate: number
    totalUsers: number
    activeUsers: number
    adminUsers: number
    regularUsers: number
    engagementRate: number
    unreadNotifications: number
    totalActivities: number
    systemHealth: 'excellent' | 'good' | 'warning' | 'critical'
    lastUpdated: Date
    dataFreshness: number
    queryPerformance: number
}

/**
 * Loading States Interface
 */
interface LoadingStates {
    gears: boolean
    users: boolean
    requests: boolean
    activities: boolean
    notifications: boolean
    stats: boolean
    initialLoad: boolean
}

/**
 * Real-time Subscription Management Interface
 */
interface RealtimeState {
    connected: boolean
    lastHeartbeat: Date | null
    subscriptions: string[]
    connectionAttempts: number
    maxRetries: number
}

/**
 * Enhanced Dashboard Context Interface
 */
interface EnhancedDashboardContextType {
    // Data State
    gears: Gear[]
    users: Profile[]
    requests: GearRequest[]
    activities: ActivityLog[]
    notifications: Notification[]
    stats: EnhancedDashboardStats

    // Loading States
    loading: boolean
    loadingStates: LoadingStates

    // Error Handling
    error: string | null
    errors: Record<string, string>
    clearError: () => void
    clearSpecificError: (type: string) => void

    // Data Actions
    refreshData: () => Promise<void>
    refreshGears: () => Promise<void>
    refreshUsers: () => Promise<void>
    refreshRequests: () => Promise<void>
    refreshActivities: () => Promise<void>
    refreshNotifications: () => Promise<void>

    // Real-time Controls
    realTimeEnabled: boolean
    realTimeState: RealtimeState
    toggleRealTime: (enabled: boolean) => void

    // Performance Monitoring
    performance: {
        averageQueryTime: number
        totalQueries: number
        failedQueries: number
        cacheHitRate: number
    }

    // Cache Management
    clearCache: () => void
    getCacheStatus: () => Record<string, { size: number; lastUpdated: Date }>
}

const DashboardContext = createContext<EnhancedDashboardContextType | undefined>(undefined)

/**
 * Enhanced Dashboard Provider v2.0 - SIMPLIFIED FOR DEBUGGING
 */
export function DashboardProvider({ children }: { children: React.ReactNode }) {
    const { toast } = useToast()

    // Initialize Supabase client (client-side only)
    const supabase = useMemo(() => createClient(), [])

    // Data State - Start with empty arrays
    const [gears, setGears] = useState<Gear[]>([])
    const [users, setUsers] = useState<Profile[]>([])
    const [requests, setRequests] = useState<GearRequest[]>([])
    const [activities, setActivities] = useState<ActivityLog[]>([])
    const [notifications, setNotifications] = useState<Notification[]>([])

    // Loading States - Start with initialLoad false to prevent infinite loop
    const [loadingStates, setLoadingStates] = useState<LoadingStates>({
        gears: false,
        users: false,
        requests: false,
        activities: false,
        notifications: false,
        stats: false,
        initialLoad: false // Changed to false initially
    })

    // Error Handling
    const [error, setError] = useState<string | null>(null)
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Real-time State
    const [realTimeEnabled, setRealTimeEnabled] = useState(true) // Re-enabled for real-time functionality
    const [realTimeState, setRealTimeState] = useState<RealtimeState>({
        connected: false,
        lastHeartbeat: null,
        subscriptions: [],
        connectionAttempts: 0,
        maxRetries: 5
    })

    // Performance Monitoring
    const [performance, setPerformance] = useState({
        averageQueryTime: 0,
        totalQueries: 0,
        failedQueries: 0,
        cacheHitRate: 0
    })

    // Cache and refs
    const cacheRef = useRef<Map<string, { data: unknown; timestamp: Date; ttl: number }>>(new Map())
    const subscriptionsRef = useRef<RealtimeChannel[]>([])
    const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Simplified fetch functions
    const fetchGears = useCallback(async () => {
        setLoadingStates(prev => ({ ...prev, gears: true }))
        try {
            const { data, error } = await apiGet<{ data: Gear[]; error: string | null }>(`/api/gears`)
            if (error) throw new Error(error)
            setGears(data || [])
        } catch (err) {
            console.error('Failed to fetch gears:', err)
            setError('Failed to fetch equipment data')
        } finally {
            setLoadingStates(prev => ({ ...prev, gears: false }))
        }
    }, [])

    const fetchUsers = useCallback(async () => {
        setLoadingStates(prev => ({ ...prev, users: true }))
        try {
            const { data, error } = await apiGet<{ data: Profile[]; error: string | null }>(`/api/users`)
            if (error) throw new Error(error)
            setUsers(data || [])
        } catch (err) {
            console.error('Failed to fetch users:', err)
            setError('Failed to fetch user data')
        } finally {
            setLoadingStates(prev => ({ ...prev, users: false }))
        }
    }, [])

    const fetchRequests = useCallback(async () => {
        setLoadingStates(prev => ({ ...prev, requests: true }))
        try {
            // Use centralized API client and RESTful endpoint
            const { data, error } = await apiGet<{ data: GearRequest[]; error: string | null }>(`/api/requests`)
            if (error) throw new Error(error)
            setRequests(data || [])
        } catch (err) {
            console.error('Failed to fetch requests:', err)
            setError('Failed to fetch request data')
        } finally {
            setLoadingStates(prev => ({ ...prev, requests: false }))
        }
    }, [])

    const fetchActivities = useCallback(async () => {
        setLoadingStates(prev => ({ ...prev, activities: true }))
        try {
            // Use centralized API client and RESTful endpoint
            const { data, error } = await apiGet<{ data: ActivityLog[]; error: string | null }>(`/api/dashboard/activities`)
            if (error) throw new Error(error)
            setActivities(data || [])
        } catch (err) {
            console.error('Failed to fetch activities:', err)
            // Don't set error for activities as it's less critical
        } finally {
            setLoadingStates(prev => ({ ...prev, activities: false }))
        }
    }, [])

    const fetchNotifications = useCallback(async () => {
        setLoadingStates(prev => ({ ...prev, notifications: true }))
        try {
            // Use centralized API client and RESTful endpoint
            const { data, error } = await apiGet<{ data: Notification[]; error: string | null }>(`/api/notifications`)
            if (error) throw new Error(error)
            setNotifications(data || [])
        } catch (err) {
            console.error('Failed to fetch notifications:', err)
            // Don't set error for notifications as it's less critical
        } finally {
            setLoadingStates(prev => ({ ...prev, notifications: false }))
        }
    }, [])

    // Simplified refresh function
    const refreshData = useCallback(async () => {
        try {
            await Promise.all([
                fetchGears(),
                fetchUsers(),
                fetchRequests(),
                fetchActivities(),
                fetchNotifications()
            ])
            toast({
                title: "Data Refreshed",
                description: "Dashboard data has been updated",
            })
        } catch (err) {
            console.error('Failed to refresh data:', err)
        }
    }, [fetchGears, fetchUsers, fetchRequests, fetchActivities, fetchNotifications, toast])

    // Calculate Enhanced Statistics
    const stats = useMemo((): EnhancedDashboardStats => {
        // Calculate equipment statistics considering pending check-ins
        const totalEquipment = gears.reduce((sum, gear) => sum + (gear.quantity ?? 1), 0);

        // Get pending check-ins to identify gears that shouldn't count as available
        const pendingCheckinGearIds = new Set<string>();
        // Note: This would need to be fetched from the server, but for now we'll use the available_quantity field
        // which should be updated by our database triggers

        const availableEquipment = gears.reduce((sum, gear) => sum + (gear.available_quantity ?? 0), 0);
        const checkedOutEquipment = gears
            .filter(gear => gear.status === 'Checked Out' || gear.status === 'Partially Checked Out')
            .reduce((sum, gear) => {
                // Calculate how many of this gear are checked out
                const totalQuantity = gear.quantity ?? 1;
                const availableQuantity = gear.available_quantity ?? 0;
                const checkedOutQuantity = totalQuantity - availableQuantity;
                return sum + Math.max(0, checkedOutQuantity);
            }, 0);
        const underRepairEquipment = gears.filter(gear => gear.status === 'Under Repair').length;
        const retiredEquipment = gears.filter(gear => gear.status === 'Retired').length;
        const utilizationRate = totalEquipment > 0 ? Math.round((checkedOutEquipment / totalEquipment) * 100) : 0;

        const totalRequests = requests.length;
        const pendingRequests = requests.filter(req => req.status === 'Pending').length;
        const approvedRequests = requests.filter(req => req.status === 'Approved').length;
        const rejectedRequests = requests.filter(req => req.status === 'Rejected').length;
        const overdueRequests = requests.filter(req => req.status === 'Overdue').length;
        const approvalRate = totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 0;

        const totalUsers = users.length;
        const activeUsers = users.filter(user => user.status === 'Active').length;
        const adminUsers = users.filter(user => user.role === 'Admin').length;
        const regularUsers = users.filter(user => user.role === 'User').length;
        const engagementRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

        const unreadNotifications = notifications.filter(n => !n.is_read).length;
        const totalActivities = activities.length;

        let systemHealth: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
        if (Object.keys(errors).length > 2) systemHealth = 'critical'
        else if (Object.keys(errors).length > 0) systemHealth = 'warning'
        else if (performance.failedQueries > performance.totalQueries * 0.1) systemHealth = 'warning'
        else if (performance.averageQueryTime > 2000) systemHealth = 'good'

        return {
            totalEquipment,
            availableEquipment,
            checkedOutEquipment,
            underRepairEquipment,
            retiredEquipment,
            utilizationRate,
            pendingRequests,
            approvedRequests,
            rejectedRequests,
            overdueRequests,
            totalRequests,
            approvalRate,
            totalUsers,
            activeUsers,
            adminUsers,
            regularUsers,
            engagementRate,
            unreadNotifications,
            totalActivities,
            systemHealth,
            lastUpdated: new Date(),
            dataFreshness: 0,
            queryPerformance: performance.averageQueryTime
        }
    }, [gears, requests, users, notifications, activities, errors, performance])

    // Simplified helper functions
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

    const toggleRealTime = useCallback((enabled: boolean) => {
        setRealTimeEnabled(enabled)
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
    }, [toast])

    const clearCache = useCallback(() => {
        cacheRef.current.clear()
        setPerformance({
            averageQueryTime: 0,
            totalQueries: 0,
            failedQueries: 0,
            cacheHitRate: 0
        })
        toast({
            title: "Cache Cleared",
            description: "All cached data has been cleared",
        })
    }, [toast])

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

    // Global loading state
    const loading = useMemo(() => {
        return Object.values(loadingStates).some(state => state)
    }, [loadingStates])

    // Real-time subscription setup function
    const setupRealtimeSubscriptions = useCallback(() => {
        if (!realTimeEnabled || realTimeState.connected) return

        console.log('Setting up real-time subscriptions...')

        // Clear existing subscriptions
        subscriptionsRef.current.forEach(subscription => {
            supabase.removeChannel(subscription)
        })
        subscriptionsRef.current = []

        try {
            // Gears subscription
            const gearsChannel = supabase
                .channel('dashboard-gears')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'gears' },
                    (payload) => {
                        console.log('Gears change detected:', payload)
                        fetchGears()

                        if (payload.eventType === 'INSERT') {
                            const newPayload = payload.new as { name?: string };
                            toast({
                                title: "New Equipment Added",
                                description: `${newPayload?.name || 'Equipment'} has been added to inventory`,
                            })
                        }
                    }
                )
                .subscribe()

            // Requests subscription
            const requestsChannel = supabase
                .channel('dashboard-requests')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'gear_requests' },
                    (payload) => {
                        console.log('Requests change detected:', payload)
                        fetchRequests()

                        if (payload.eventType === 'INSERT') {
                            toast({
                                title: "New Request Submitted",
                                description: "A new equipment request requires attention",
                                variant: "default"
                            })
                        }
                    }
                )
                .subscribe()

            // Activities subscription
            const activitiesChannel = supabase
                .channel('dashboard-activities')
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'gear_activity_log' },
                    (payload) => {
                        console.log('Activity change detected:', payload)
                        fetchActivities()
                    }
                )
                .subscribe()

            // Notifications subscription
            const notificationsChannel = supabase
                .channel('dashboard-notifications')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'notifications' },
                    (payload) => {
                        console.log('Notifications change detected:', payload)
                        fetchNotifications()
                    }
                )
                .subscribe()

            subscriptionsRef.current = [
                gearsChannel,
                requestsChannel,
                activitiesChannel,
                notificationsChannel
            ]

            // Update real-time state
            setRealTimeState(prev => ({
                ...prev,
                connected: true,
                lastHeartbeat: new Date(),
                subscriptions: ['gears', 'requests', 'activities', 'notifications'],
                connectionAttempts: 0
            }))

            console.log('Real-time subscriptions established')

        } catch (error) {
            console.error('Failed to setup real-time subscriptions:', error)
            setRealTimeState(prev => ({
                ...prev,
                connected: false,
                connectionAttempts: prev.connectionAttempts + 1
            }))
        }
    }, [realTimeEnabled, realTimeState.connected, supabase, fetchGears, fetchRequests, fetchActivities, fetchNotifications, toast])

    // SIMPLIFIED Initial data load - only run once
    useEffect(() => {
        let mounted = true

        const initializeData = async () => {
            if (!mounted) return

            console.log('Initializing dashboard data...')
            setLoadingStates(prev => ({ ...prev, initialLoad: true }))

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
            } finally {
                if (mounted) {
                    setLoadingStates(prev => ({ ...prev, initialLoad: false }))
                }
            }
        }

        initializeData()

        return () => {
            mounted = false
        }
    }, [fetchGears, fetchUsers, fetchRequests, fetchActivities, fetchNotifications])

    // Real-time Setup Effect
    useEffect(() => {
        if (realTimeEnabled && !realTimeState.connected) {
            setupRealtimeSubscriptions()
        }

        return () => {
            subscriptionsRef.current.forEach(subscription => {
                supabase.removeChannel(subscription)
            })
        }
    }, [realTimeEnabled, realTimeState.connected, setupRealtimeSubscriptions, supabase])

    // Auto-refresh Effect for non-real-time mode
    useEffect(() => {
        if (!realTimeEnabled) {
            refreshIntervalRef.current = setInterval(() => {
                Promise.all([
                    fetchGears(),
                    fetchUsers(),
                    fetchRequests(),
                    fetchActivities(),
                    fetchNotifications()
                ]).catch(error => {
                    console.error('Auto-refresh failed:', error)
                })
            }, 60000) // Refresh every minute

            return () => {
                if (refreshIntervalRef.current) {
                    clearInterval(refreshIntervalRef.current)
                }
            }
        }
    }, [realTimeEnabled, fetchGears, fetchUsers, fetchRequests, fetchActivities, fetchNotifications])

    // Context value with minimal dependencies
    const contextValue = useMemo((): EnhancedDashboardContextType => ({
        gears,
        users,
        requests,
        activities,
        notifications,
        stats,
        loading,
        loadingStates,
        error,
        errors,
        clearError,
        clearSpecificError,
        refreshData,
        refreshGears: fetchGears,
        refreshUsers: fetchUsers,
        refreshRequests: fetchRequests,
        refreshActivities: fetchActivities,
        refreshNotifications: fetchNotifications,
        realTimeEnabled,
        realTimeState,
        toggleRealTime,
        performance,
        clearCache,
        getCacheStatus
    }), [
        gears, users, requests, activities, notifications, stats,
        loading, loadingStates, error, errors,
        clearError, clearSpecificError, refreshData,
        fetchGears, fetchUsers, fetchRequests, fetchActivities, fetchNotifications,
        realTimeEnabled, realTimeState, toggleRealTime,
        performance, clearCache, getCacheStatus
    ])

    return (
        <DashboardContext.Provider value={contextValue}>
            {children}
        </DashboardContext.Provider>
    )
}

/**
 * Enhanced Dashboard Hook
 */
export function useDashboard(): EnhancedDashboardContextType {
    const context = useContext(DashboardContext)

    if (context === undefined) {
        throw new Error('useDashboard must be used within a DashboardProvider')
    }

    return context
} 