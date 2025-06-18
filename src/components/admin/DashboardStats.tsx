/**
 * Dashboard Statistics Component - Real-time Metrics Display
 * 
 * A comprehensive statistics overview component that displays key performance
 * indicators and system metrics for the Nest by Eden Oasis admin dashboard.
 * This component provides administrators with at-a-glance insights into
 * equipment utilization, user activity, and system health.
 * 
 * Key Features:
 * - Real-time data synchronization with dashboard provider
 * - Responsive grid layout for desktop and mobile
 * - Interactive stat cards with hover effects
 * - Color-coded status indicators for quick recognition
 * - Progress bars for utilization metrics
 * - Trend indicators for performance monitoring
 * 
 * Statistics Categories:
 * - Equipment Availability: Total, available, checked out, under repair
 * - Request Management: Pending, approved, rejected requests
 * - User Activity: Total users, active users, engagement metrics
 * - System Health: Notifications, overdue items, critical alerts
 * 
 * Data Sources:
 * - Equipment/gear table for asset statistics
 * - Request table for workflow metrics
 * - User profiles for activity data
 * - Notifications table for system alerts
 * 
 * Performance Features:
 * - Optimized re-renders through React.memo
 * - Efficient data calculations via useMemo
 * - Skeleton loading states for better UX
 * - Error handling with fallback displays
 * 
 * @fileoverview Real-time statistics dashboard for admin metrics and KPIs
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 * @since 2024-01-15
 */

'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboard } from './DashboardProvider'
import {
    Package,
    Users,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Activity
} from 'lucide-react'

/**
 * Individual Statistic Card Interface
 * 
 * Defines the structure for each statistic card displayed in the dashboard.
 * This interface ensures consistency across all metric displays and provides
 * clear typing for component props.
 * 
 * @interface StatCardData
 */
interface StatCardData {
    /** Display title for the statistic */
    title: string
    /** Current value of the statistic */
    value: number
    /** Optional maximum value for percentage calculations */
    maxValue?: number
    /** Previous value for trend calculation */
    previousValue?: number
    /** Icon component to display with the statistic */
    icon: React.ComponentType<any>
    /** Color theme for the card (matches status/priority) */
    color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray'
    /** Optional description or additional context */
    description?: string
    /** Whether to show a progress bar for the statistic */
    showProgress?: boolean
}

/**
 * Trend Indicator Component
 * 
 * Displays trend direction and percentage change for statistics.
 * Helps administrators quickly identify positive or negative trends
 * in system metrics and performance indicators.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {number} props.current - Current value
 * @param {number} props.previous - Previous value for comparison
 * @param {boolean} props.reverse - Whether higher values are considered negative
 * @returns {JSX.Element} Trend indicator with direction and percentage
 */
const TrendIndicator: React.FC<{
    current: number
    previous: number
    reverse?: boolean
}> = ({ current, previous, reverse = false }) => {
    const change = current - previous
    const percentage = previous > 0 ? Math.abs((change / previous) * 100) : 0
    const isPositive = reverse ? change < 0 : change > 0

    if (change === 0) return null

    return (
        <div className={`flex items-center text-xs ${isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
            {isPositive ? (
                <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
            )}
            {percentage.toFixed(1)}%
        </div>
    )
}

/**
 * Statistic Card Component
 * 
 * Individual card component that displays a single statistic with
 * optional trend indicators, progress bars, and status badges.
 * This component is reusable across different metric types.
 * 
 * @component
 * @param {StatCardData} props - Statistic data and configuration
 * @returns {JSX.Element} Formatted statistic card
 */
const StatCard: React.FC<StatCardData> = ({
    title,
    value,
    maxValue,
    previousValue,
    icon: Icon,
    color,
    description,
    showProgress = false
}) => {
    /**
     * Color Theme Mapping
     * 
     * Maps color names to Tailwind CSS classes for consistent theming
     * across all statistic cards and components.
     */
    const colorClasses = {
        blue: 'text-blue-600 bg-blue-50 border-blue-200',
        green: 'text-green-600 bg-green-50 border-green-200',
        yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        red: 'text-red-600 bg-red-50 border-red-200',
        purple: 'text-purple-600 bg-purple-50 border-purple-200',
        gray: 'text-gray-600 bg-gray-50 border-gray-200'
    }

    /**
     * Progress Percentage Calculation
     * 
     * Calculates the percentage for progress bars when maxValue is provided.
     * Ensures the percentage never exceeds 100% for visual consistency.
     */
    const progressPercentage = useMemo(() => {
        if (!showProgress || !maxValue) return 0
        return Math.min((value / maxValue) * 100, 100)
    }, [value, maxValue, showProgress])

    return (
        <Card className={`transition-all duration-200 hover:shadow-md ${colorClasses[color]}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4" />
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{value.toLocaleString()}</div>
                    {previousValue !== undefined && (
                        <TrendIndicator
                            current={value}
                            previous={previousValue}
                            reverse={color === 'red'}
                        />
                    )}
                </div>

                {description && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}

                {showProgress && maxValue && (
                    <div className="mt-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Utilization</span>
                            <span>{progressPercentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={progressPercentage} className="h-2" />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

/**
 * Dashboard Statistics Loading Component
 * 
 * Displays skeleton placeholders while statistics data is loading.
 * Maintains the same layout structure as the actual statistics
 * to prevent layout shifts during loading states.
 * 
 * @component
 * @returns {JSX.Element} Skeleton loading layout for statistics
 */
const DashboardStatsLoading: React.FC = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
            <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-24" />
                </CardContent>
            </Card>
        ))}
    </div>
)

/**
 * Dashboard Statistics Main Component
 * 
 * The primary component that orchestrates the display of all dashboard
 * statistics. This component connects to the dashboard provider for
 * real-time data and organizes statistics into logical groupings.
 * 
 * Component Architecture:
 * - Connects to DashboardProvider for real-time data
 * - Organizes statistics into equipment, request, and user categories
 * - Provides loading states and error handling
 * - Calculates derived metrics and trend indicators
 * - Responsive layout for different screen sizes
 * 
 * Data Processing:
 * - Aggregates raw data into meaningful statistics
 * - Calculates utilization percentages
 * - Determines trend directions
 * - Formats numbers for display
 * 
 * @component
 * @returns {JSX.Element} Complete dashboard statistics section
 * 
 * @example
 * ```tsx
 * // Basic usage in admin dashboard
 * <DashboardStats />
 * 
 * // With custom container styling
 * <div className="dashboard-stats-container">
 *   <DashboardStats />
 * </div>
 * ```
 */
const DashboardStats: React.FC = () => {
    // Connect to dashboard provider for real-time data
    const { stats, loading, error } = useDashboard()

    /**
     * Statistics Configuration
     * 
     * Defines all statistics to be displayed with their formatting,
     * colors, icons, and additional properties. This configuration
     * is memoized to prevent unnecessary recalculations.
     */
    const statisticsConfig = useMemo((): StatCardData[] => [
        // Equipment Statistics
        {
            title: 'Total Equipment',
            value: stats.totalEquipment,
            icon: Package,
            color: 'blue',
            description: 'All assets in inventory'
        },
        {
            title: 'Available',
            value: stats.availableEquipment,
            maxValue: stats.totalEquipment,
            icon: CheckCircle,
            color: 'green',
            description: 'Ready for checkout',
            showProgress: true
        },
        {
            title: 'Checked Out',
            value: stats.checkedOutEquipment,
            maxValue: stats.totalEquipment,
            icon: Clock,
            color: 'yellow',
            description: 'Currently in use',
            showProgress: true
        },
        {
            title: 'Under Repair',
            value: stats.underRepairEquipment,
            icon: AlertTriangle,
            color: 'red',
            description: 'Maintenance required'
        },

        // Request Statistics
        {
            title: 'Pending Requests',
            value: stats.pendingRequests,
            icon: Clock,
            color: 'yellow',
            description: 'Awaiting approval'
        },
        {
            title: 'Approved Requests',
            value: stats.approvedRequests,
            icon: CheckCircle,
            color: 'green',
            description: 'Ready for pickup'
        },
        {
            title: 'Rejected Requests',
            value: stats.rejectedRequests,
            icon: XCircle,
            color: 'red',
            description: 'Not approved'
        },

        // User Statistics
        {
            title: 'Total Users',
            value: stats.totalUsers,
            icon: Users,
            color: 'blue',
            description: 'Registered accounts'
        },
        {
            title: 'Active Users',
            value: stats.activeUsers,
            maxValue: stats.totalUsers,
            icon: Activity,
            color: 'green',
            description: 'Last 30 days',
            showProgress: true
        },

        // System Statistics
        {
            title: 'Notifications',
            value: stats.unreadNotifications,
            icon: AlertTriangle,
            color: stats.unreadNotifications > 0 ? 'red' : 'gray',
            description: 'Unread alerts'
        }
    ], [stats])

    /**
     * Error State Display
     * 
     * Shows a user-friendly error message when statistics cannot be loaded.
     * Provides context about the error and suggests possible actions.
     */
    if (error) {
        return (
            <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                    <div className="flex items-center space-x-2 text-red-700">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-medium">Unable to load statistics</span>
                    </div>
                    <p className="text-sm text-red-600 mt-1">
                        {error}. Please refresh the page or contact support if the problem persists.
                    </p>
                </CardContent>
            </Card>
        )
    }

    /**
     * Loading State Display
     * 
     * Shows skeleton placeholders while data is being fetched.
     * Maintains the same visual structure to prevent layout shifts.
     */
    if (loading) {
        return <DashboardStatsLoading />
    }

    /**
     * Main Statistics Display
     * 
     * Renders all statistics in a responsive grid layout with
     * proper spacing and hover effects for enhanced user experience.
     */
    return (
        <div className="space-y-4">
            {/* Statistics Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">System Overview</h2>
                <Badge variant="outline" className="text-xs">
                    Real-time
                </Badge>
            </div>

            {/* Statistics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {statisticsConfig.map((stat, index) => (
                    <StatCard key={`${stat.title}-${index}`} {...stat} />
                ))}
            </div>

            {/* Additional Insights */}
            <div className="mt-6 grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Equipment Utilization</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.totalEquipment > 0
                                ? ((stats.checkedOutEquipment / stats.totalEquipment) * 100).toFixed(1)
                                : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Of total inventory in use
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">User Engagement</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.totalUsers > 0
                                ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)
                                : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Active in last 30 days
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Request Queue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.pendingRequests + stats.approvedRequests}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total active requests
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default React.memo(DashboardStats) 