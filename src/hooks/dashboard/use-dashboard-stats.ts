import { useMemo } from 'react'
import type {
    Gear,
    Profile,
    GearRequest,
    ActivityLog,
    Notification,
    EnhancedDashboardStats,
    PerformanceState
} from '@/types/dashboard'

/**
 * Custom hook for dashboard statistics calculation
 */
export function useDashboardStats(
    gears: Gear[],
    users: Profile[],
    requests: GearRequest[],
    activities: ActivityLog[],
    notifications: Notification[],
    performance: PerformanceState,
    errors: Record<string, string>
) {
    const stats = useMemo((): EnhancedDashboardStats => {
        // Equipment Statistics
        const totalEquipment = gears.reduce((sum, gear) => sum + (gear.quantity ?? 1), 0)
        const availableEquipment = gears.reduce((sum, gear) => sum + (gear.available_quantity ?? 0), 0)
        const checkedOutEquipment = gears.filter(gear => gear.status === 'Checked Out').length
        const underRepairEquipment = gears.filter(gear => gear.status === 'Under Repair').length
        const retiredEquipment = gears.filter(gear => gear.status === 'Retired').length
        const utilizationRate = totalEquipment > 0 ? Math.round((checkedOutEquipment / totalEquipment) * 100) : 0

        // Request Statistics
        const totalRequests = requests.length
        const pendingRequests = requests.filter(req => req.status === 'Pending').length
        const approvedRequests = requests.filter(req => req.status === 'Approved').length
        const rejectedRequests = requests.filter(req => req.status === 'Rejected').length
        const overdueRequests = requests.filter(req => req.status === 'Overdue').length
        const approvalRate = totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 0

        // User Statistics
        const totalUsers = users.length
        const activeUsers = users.filter(user => user.status === 'Active').length
        const adminUsers = users.filter(user => user.role === 'Admin').length
        const regularUsers = users.filter(user => user.role === 'User').length
        const engagementRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0

        // System Statistics
        const unreadNotifications = notifications.filter(n => !n.is_read).length
        const totalActivities = activities.length

        // System Health Calculation
        let systemHealth: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent'
        if (Object.keys(errors).length > 2) {
            systemHealth = 'critical'
        } else if (Object.keys(errors).length > 0) {
            systemHealth = 'warning'
        } else if (performance.failedQueries > performance.totalQueries * 0.1) {
            systemHealth = 'warning'
        } else if (performance.averageQueryTime > 2000) {
            systemHealth = 'good'
        }

        return {
            // Equipment
            totalEquipment,
            availableEquipment,
            checkedOutEquipment,
            underRepairEquipment,
            retiredEquipment,
            utilizationRate,

            // Requests
            pendingRequests,
            approvedRequests,
            rejectedRequests,
            overdueRequests,
            totalRequests,
            approvalRate,

            // Users
            totalUsers,
            activeUsers,
            adminUsers,
            regularUsers,
            engagementRate,

            // System
            unreadNotifications,
            totalActivities,
            systemHealth,
            lastUpdated: new Date(),
            dataFreshness: 0,
            queryPerformance: performance.averageQueryTime
        }
    }, [gears, requests, users, notifications, activities, errors, performance])

    return stats
} 