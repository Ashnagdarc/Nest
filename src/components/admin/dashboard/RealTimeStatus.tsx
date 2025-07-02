"use client"

import { Button } from "@/components/ui/button"
import { Wifi, WifiOff } from "lucide-react"
import { useDashboard } from '@/components/admin/DashboardProvider'

/**
 * Real-time connection status indicator
 */
export function RealTimeStatus() {
    const { realTimeState, realTimeEnabled, toggleRealTime } = useDashboard()

    const getStatusColor = () => {
        if (!realTimeEnabled) return 'bg-gray-500'
        if (realTimeState.connected) return 'bg-green-500 animate-pulse'
        if (realTimeState.connectionAttempts > 3) return 'bg-red-500'
        return 'bg-yellow-500'
    }

    const getStatusText = () => {
        if (!realTimeEnabled) return 'Real-time Disabled'
        if (realTimeState.connected) return 'Live Updates Active'
        if (realTimeState.connectionAttempts > 3) return 'Connection Failed'
        return 'Connecting...'
    }

    return (
        <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            <span className="text-sm font-medium text-gray-300">
                {getStatusText()}
            </span>
            <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleRealTime(!realTimeEnabled)}
                className="text-xs"
            >
                {realTimeEnabled ? <WifiOff className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
            </Button>
        </div>
    )
} 