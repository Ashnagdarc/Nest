"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
    Gauge, Heart, CheckCircle, AlertTriangle, AlertCircle,
    Activity, Wifi, WifiOff
} from "lucide-react"
import { useDashboard } from '@/components/admin/DashboardProvider'

/**
 * System health monitoring with performance metrics
 */
export function SystemHealthMonitor() {
    const { stats, performance, realTimeState, error } = useDashboard()

    const getHealthColor = (health: string) => {
        switch (health) {
            case 'excellent': return 'text-green-500'
            case 'good': return 'text-blue-500'
            case 'warning': return 'text-yellow-500'
            case 'critical': return 'text-red-500'
            default: return 'text-gray-500'
        }
    }

    const getHealthIcon = (health: string) => {
        switch (health) {
            case 'excellent': return <Heart className="h-5 w-5 text-green-500" />
            case 'good': return <CheckCircle className="h-5 w-5 text-blue-500" />
            case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />
            case 'critical': return <AlertCircle className="h-5 w-5 text-red-500" />
            default: return <Activity className="h-5 w-5 text-gray-500" />
        }
    }

    return (
        <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-purple-400" />
                    System Health Monitor
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Overall Health */}
                <div className="flex items-center justify-between">
                    <span className="text-gray-300">Overall Health</span>
                    <div className="flex items-center space-x-2">
                        {getHealthIcon(stats.systemHealth)}
                        <span className={`font-semibold ${getHealthColor(stats.systemHealth)}`}>
                            {stats.systemHealth.charAt(0).toUpperCase() + stats.systemHealth.slice(1)}
                        </span>
                    </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <div className="text-sm text-gray-400">Query Performance</div>
                        <div className="text-lg font-semibold text-white">
                            {performance.averageQueryTime}ms
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-gray-400">Cache Hit Rate</div>
                        <div className="text-lg font-semibold text-white">
                            {performance.cacheHitRate}%
                        </div>
                    </div>
                </div>

                {/* Real-time Status */}
                <div className="flex items-center justify-between">
                    <span className="text-gray-300">Real-time Connection</span>
                    <div className="flex items-center space-x-2">
                        {realTimeState.connected ? (
                            <Wifi className="h-4 w-4 text-green-500" />
                        ) : (
                            <WifiOff className="h-4 w-4 text-red-500" />
                        )}
                        <span className={`text-sm ${realTimeState.connected ? 'text-green-500' : 'text-red-500'}`}>
                            {realTimeState.connected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                </div>

                {/* Error Status */}
                {error && (
                    <Alert className="border-red-600 bg-red-900/20">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-red-400">
                            {error}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    )
} 