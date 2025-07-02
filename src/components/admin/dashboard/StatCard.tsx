"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Activity } from "lucide-react"

interface StatCardProps {
    title: string
    value: number
    change?: number
    icon: React.ComponentType<any>
    color: string
    subtitle?: string
    trend?: 'up' | 'down' | 'stable'
    loading?: boolean
}

/**
 * Statistics display card with trend indicators
 */
export function StatCard({
    title,
    value,
    change,
    icon: Icon,
    color,
    subtitle,
    trend,
    loading = false
}: StatCardProps) {
    const getTrendIcon = () => {
        switch (trend) {
            case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />
            case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />
            default: return <Activity className="h-4 w-4 text-gray-500" />
        }
    }

    if (loading) {
        return (
            <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-300">
                <CardHeader className="pb-2">
                    <div className="animate-pulse">
                        <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-8 bg-gray-700 rounded w-1/2"></div>
                    </div>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-300 flex items-center justify-between">
                    {title}
                    <Icon className={`h-5 w-5 ${color}`} />
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-white mb-1">
                    {value.toLocaleString()}
                </div>
                {subtitle && (
                    <p className="text-xs text-gray-400 mb-2">{subtitle}</p>
                )}
                {change !== undefined && (
                    <div className="flex items-center space-x-1">
                        {getTrendIcon()}
                        <span className={`text-xs ${trend === 'up' ? 'text-green-500' :
                            trend === 'down' ? 'text-red-500' :
                                'text-gray-500'
                            }`}>
                            {change > 0 ? '+' : ''}{change}%
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
} 