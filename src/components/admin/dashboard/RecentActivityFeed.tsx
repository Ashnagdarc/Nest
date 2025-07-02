"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Activity, Package, CheckCircle, Wrench, ClipboardList
} from "lucide-react"
import { useDashboard } from '@/components/admin/DashboardProvider'

/**
 * Live activity feed with real-time updates
 */
export function RecentActivityFeed() {
    const { activities, loading } = useDashboard()

    const getActivityIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'checkout': return <Package className="h-4 w-4 text-blue-400" />
            case 'checkin': return <CheckCircle className="h-4 w-4 text-green-400" />
            case 'maintenance': return <Wrench className="h-4 w-4 text-orange-400" />
            case 'request': return <ClipboardList className="h-4 w-4 text-purple-400" />
            default: return <Activity className="h-4 w-4 text-gray-400" />
        }
    }

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

        if (diffInMinutes < 1) return 'Just now'
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
        return `${Math.floor(diffInMinutes / 1440)}d ago`
    }

    return (
        <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-400" />
                    Live Activity Feed
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-64">
                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="animate-pulse flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                                    <div className="flex-1">
                                        <div className="h-4 bg-gray-700 rounded w-3/4 mb-1"></div>
                                        <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : activities.length > 0 ? (
                        <div className="space-y-3">
                            {activities.slice(0, 10).map((activity) => (
                                <div key={activity.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700/50 transition-colors">
                                    <div className="p-2 rounded-full bg-gray-700">
                                        {getActivityIcon(activity.activity_type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-white font-medium truncate">
                                            {activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1)} Activity
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {activity.notes || 'No additional details'}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {formatTimeAgo(activity.created_at)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Activity className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-500">No recent activities</p>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    )
} 