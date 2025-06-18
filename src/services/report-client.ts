/**
 * Client-Safe Report Service - Browser-Compatible Analytics
 * 
 * This service provides report generation capabilities specifically designed
 * for client-side usage. It only imports browser-compatible modules and avoids
 * any server-side dependencies that could cause import chain issues.
 * 
 * Key Features:
 * - Client-side Supabase integration only
 * - Browser-compatible report generation
 * - Real-time data fetching capabilities
 * - No server-side import dependencies
 * 
 * @fileoverview Client-safe report service for browser environments
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 * @since 2024-01-15
 */

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'

// Type definitions for client report system
type Gear = Database['public']['Tables']['gears']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']
type GearRequest = Database['public']['Tables']['gear_requests']['Row']
type ActivityLog = Database['public']['Tables']['gear_activity_log']['Row']

/**
 * Weekly Usage Report Interface
 * 
 * Client-safe interface for weekly activity reports that can be
 * generated and consumed entirely within browser environments.
 */
export interface WeeklyUsageReport {
    startDate: string
    endDate: string
    summary: string
    totalRequests: number
    totalCheckouts: number
    totalCheckins: number
    utilizationRate: number
    avgRequestDuration: number
    overdueReturns: number
    mostActiveUser: string | null
    mostActiveGear: string | null
    userStats: UserStats[]
    gearStats: GearStats[]
    // Additional properties for compatibility
    uniqueUsers: number
    gearUsage: GearUsageStats[]
}

/**
 * Gear Usage Statistics Interface - for compatibility with existing code
 */
export interface GearUsageStats {
    gearName: string
    status?: string
    requestCount: number
    checkoutCount: number
    checkinCount: number
    bookingCount: number
    damageCount: number
    utilization?: number
    lastActivity?: string | null
}

/**
 * User Statistics Interface
 */
export interface UserStats {
    id: string
    name: string
    email: string
    requests: number
    checkouts: number
    checkins: number
    avgDuration: number
    lastActivity: string | null
    // Additional properties for compatibility
    overdue: number
    damages: number
}

/**
 * Gear Statistics Interface
 */
export interface GearStats {
    id: string
    name: string
    category: string
    requests: number
    checkouts: number
    totalDays: number
    utilizationRate: number
    condition: string
    lastUsed: string | null
}

/**
 * Client-Safe Report Generator
 * 
 * Generates comprehensive usage reports using only client-side data fetching.
 * This function is safe to use in browser environments and doesn't require
 * server-side capabilities.
 * 
 * @param startDate - Report start date
 * @param endDate - Report end date
 * @returns Promise resolving to weekly usage report
 */
export async function generateUsageReportForRange(
    startDate: Date,
    endDate: Date
): Promise<WeeklyUsageReport> {
    const supabase = createClient()

    // Format dates for database queries
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    try {
        // Fetch all required data in parallel for better performance
        const [gearsResult, usersResult, requestsResult, activitiesResult] = await Promise.all([
            // Fetch gears data
            supabase
                .from('gears')
                .select('*')
                .order('created_at', { ascending: false }),

            // Fetch users data
            supabase
                .from('profiles')
                .select('id, full_name, email, created_at, last_sign_in_at')
                .order('created_at', { ascending: false }),

            // Fetch requests within date range
            supabase
                .from('gear_requests')
                .select(`
                    *,
                    profiles!gear_requests_user_id_fkey(id, full_name, email),
                    gears!gear_requests_gear_id_fkey(id, name, category)
                `)
                .gte('created_at', startDateStr)
                .lte('created_at', endDateStr + 'T23:59:59')
                .order('created_at', { ascending: false }),

            // Fetch activity logs within date range
            supabase
                .from('gear_activity_log')
                .select(`
                    *,
                    profiles!gear_activity_log_user_id_fkey(id, full_name, email),
                    gears!gear_activity_log_gear_id_fkey(id, name, category)
                `)
                .gte('created_at', startDateStr)
                .lte('created_at', endDateStr + 'T23:59:59')
                .order('created_at', { ascending: false })
        ])

        // Handle potential errors from data fetching
        if (gearsResult.error) {
            console.warn('Error fetching gears:', gearsResult.error)
        }
        if (usersResult.error) {
            console.warn('Error fetching users:', usersResult.error)
        }
        if (requestsResult.error) {
            console.warn('Error fetching requests:', requestsResult.error)
        }
        if (activitiesResult.error) {
            console.warn('Error fetching activities:', activitiesResult.error)
        }

        // Use fetched data or fallback to empty arrays
        const gears = gearsResult.data || []
        const users = usersResult.data || []
        const requests = requestsResult.data || []
        const activities = activitiesResult.data || []

        // Calculate user statistics
        const userStats: UserStats[] = users.map(user => {
            const userRequests = requests.filter(req => req.user_id === user.id)
            const userActivities = activities.filter(act => act.user_id === user.id)

            const checkouts = userActivities.filter(act => act.activity_type === 'checkout').length
            const checkins = userActivities.filter(act => act.activity_type === 'checkin').length

            // Calculate average request duration
            const completedRequests = userRequests.filter(req => req.status === 'Checked In' && req.due_date)
            const avgDuration = completedRequests.length > 0
                ? completedRequests.reduce((sum, req) => {
                    const created = new Date(req.created_at)
                    const due = new Date(req.due_date!)
                    const duration = (due.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
                    return sum + duration
                }, 0) / completedRequests.length
                : 0

            const lastActivity = userActivities.length > 0
                ? userActivities[0].created_at
                : null

            // Calculate overdue and damages (placeholder logic)
            const overdue = userRequests.filter(req =>
                req.status === 'Checked Out' &&
                req.due_date &&
                new Date(req.due_date) < new Date()
            ).length
            const damages = userActivities.filter(act => act.activity_type === 'damage_report').length

            return {
                id: user.id,
                name: user.full_name || 'Unknown User',
                email: user.email || 'No email',
                requests: userRequests.length,
                checkouts,
                checkins,
                avgDuration,
                lastActivity,
                overdue,
                damages
            }
        })

        // Calculate gear statistics
        const gearStats: GearStats[] = gears.map(gear => {
            const gearRequests = requests.filter(req => req.gear_id === gear.id)
            const gearActivities = activities.filter(act => act.gear_id === gear.id)

            const checkouts = gearActivities.filter(act => act.activity_type === 'checkout').length

            // Calculate total days used
            const completedRequests = gearRequests.filter(req => req.status === 'Checked In' && req.due_date)
            const totalDays = completedRequests.reduce((sum, req) => {
                const created = new Date(req.created_at)
                const due = new Date(req.due_date!)
                const duration = (due.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
                return sum + Math.max(duration, 0)
            }, 0)

            // Calculate utilization rate (simplified)
            const reportDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            const utilizationRate = reportDays > 0 ? (totalDays / reportDays) * 100 : 0

            const lastUsed = gearActivities.length > 0
                ? gearActivities[0].created_at
                : null

            return {
                id: gear.id,
                name: gear.name || 'Unknown Gear',
                category: gear.category || 'Uncategorized',
                requests: gearRequests.length,
                checkouts,
                totalDays,
                utilizationRate: Math.min(utilizationRate, 100), // Cap at 100%
                condition: gear.condition || 'Unknown',
                lastUsed
            }
        })

        // Calculate overall statistics
        const totalRequests = requests.length
        const totalCheckouts = activities.filter(act => act.activity_type === 'checkout').length
        const totalCheckins = activities.filter(act => act.activity_type === 'checkin').length

        // Calculate overall utilization rate
        const availableGears = gears.filter(gear => gear.status === 'Available').length
        const checkedOutGears = gears.filter(gear => gear.status === 'Checked Out').length
        const utilizationRate = gears.length > 0 ? (checkedOutGears / gears.length) * 100 : 0

        // Calculate average request duration
        const completedRequests = requests.filter(req => req.status === 'Checked In' && req.due_date)
        const avgRequestDuration = completedRequests.length > 0
            ? completedRequests.reduce((sum, req) => {
                const created = new Date(req.created_at)
                const due = new Date(req.due_date!)
                const duration = (due.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
                return sum + Math.max(duration, 0)
            }, 0) / completedRequests.length
            : 0

        // Calculate overdue returns
        const now = new Date()
        const overdueReturns = requests.filter(req =>
            req.status === 'Checked Out' &&
            req.due_date &&
            new Date(req.due_date) < now
        ).length

        // Find most active user and gear
        const mostActiveUser = userStats.length > 0
            ? userStats.reduce((max, user) =>
                user.requests > max.requests ? user : max
            ).name
            : null

        const mostActiveGear = gearStats.length > 0
            ? gearStats.reduce((max, gear) =>
                gear.requests > max.requests ? gear : max
            ).name
            : null

        // Generate summary
        const activeUsers = userStats.filter(user => user.requests > 0 || user.checkouts > 0).length
        const summary = `During the period from ${startDateStr} to ${endDateStr}, there were ${totalRequests} total requests with ${activeUsers} active users. The overall equipment utilization rate was ${utilizationRate.toFixed(1)}%, with ${overdueReturns} overdue returns.`

        // Convert gearStats to gearUsage format for compatibility
        const gearUsage: GearUsageStats[] = gearStats.map(gear => ({
            gearName: gear.name,
            status: gears.find(g => g.id === gear.id)?.status || 'Unknown',
            requestCount: gear.requests,
            checkoutCount: gear.checkouts,
            checkinCount: 0, // Not tracked separately in our simplified model
            bookingCount: 0, // Not tracked separately
            damageCount: 0, // Not tracked separately
            utilization: gear.utilizationRate,
            lastActivity: gear.lastUsed
        }))

        return {
            startDate: startDateStr,
            endDate: endDateStr,
            summary,
            totalRequests,
            totalCheckouts,
            totalCheckins,
            utilizationRate,
            avgRequestDuration,
            overdueReturns,
            mostActiveUser,
            mostActiveGear,
            userStats: userStats.filter(user => user.requests > 0 || user.checkouts > 0 || user.checkins > 0), // Only include active users
            gearStats: gearStats.filter(gear => gear.requests > 0 || gear.checkouts > 0), // Only include used gear
            uniqueUsers: activeUsers,
            gearUsage: gearUsage.filter(gear => gear.requestCount > 0 || gear.checkoutCount > 0)
        }

    } catch (error) {
        console.error('Error generating usage report:', error)

        // Return empty report on error
        return {
            startDate: startDateStr,
            endDate: endDateStr,
            summary: 'Error generating report. Please try again.',
            totalRequests: 0,
            totalCheckouts: 0,
            totalCheckins: 0,
            utilizationRate: 0,
            avgRequestDuration: 0,
            overdueReturns: 0,
            mostActiveUser: null,
            mostActiveGear: null,
            userStats: [],
            gearStats: [],
            uniqueUsers: 0,
            gearUsage: []
        }
    }
} 