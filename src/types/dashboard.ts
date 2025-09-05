import type { Database } from '@/types/supabase'

// Database Types
export type Gear = Database['public']['Tables']['gears']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type GearRequest = Database['public']['Tables']['gear_requests']['Row']
export type ActivityLog = Database['public']['Tables']['checkins']['Row'] // Using checkins table as activity log
export type Notification = Database['public']['Tables']['notifications']['Row']

/**
 * Enhanced Dashboard Statistics Interface
 */
export interface EnhancedDashboardStats {
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
export interface LoadingStates {
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
export interface RealtimeState {
    connected: boolean
    lastHeartbeat: Date | null
    subscriptions: string[]
    connectionAttempts: number
    maxRetries: number
}

/**
 * Performance Monitoring Interface
 */
export interface PerformanceState {
    averageQueryTime: number
    totalQueries: number
    failedQueries: number
    cacheHitRate: number
}

/**
 * Enhanced Dashboard Context Interface
 */
export interface EnhancedDashboardContextType {
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
    performance: PerformanceState

    // Cache Management
    clearCache: () => void
    getCacheStatus: () => Record<string, { size: number; lastUpdated: Date }>
} 