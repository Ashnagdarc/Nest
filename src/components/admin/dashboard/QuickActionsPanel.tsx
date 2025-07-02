"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import {
    Zap, Plus, ClipboardList, BarChart3, Users, RefreshCcw
} from "lucide-react"
import { useDashboard } from '@/components/admin/DashboardProvider'
import { useToast } from "@/hooks/use-toast"

/**
 * Quick access panel for common admin actions
 */
export function QuickActionsPanel() {
    const { refreshData } = useDashboard()
    const { toast } = useToast()
    const router = useRouter()

    const quickActions = [
        {
            title: 'Add Equipment',
            icon: Plus,
            color: 'text-green-400',
            action: () => router.push('/admin/manage-gears'),
            description: 'Add new equipment to inventory'
        },
        {
            title: 'Manage Requests',
            icon: ClipboardList,
            color: 'text-blue-400',
            action: () => router.push('/admin/manage-requests'),
            description: 'Review pending requests'
        },
        {
            title: 'View Reports',
            icon: BarChart3,
            color: 'text-purple-400',
            action: () => router.push('/admin/reports'),
            description: 'Generate system reports'
        },
        {
            title: 'User Management',
            icon: Users,
            color: 'text-orange-400',
            action: () => router.push('/admin/manage-users'),
            description: 'Manage user accounts'
        }
    ]

    const handleRefresh = () => {
        refreshData()
        toast({
            title: "Dashboard Refreshed",
            description: "All data has been updated from the server",
        })
    }

    return (
        <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    Quick Actions
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {quickActions.map((action, index) => (
                        <Button
                            key={index}
                            onClick={action.action}
                            variant="ghost"
                            className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-gray-700/50 border border-gray-700"
                        >
                            <action.icon className={`h-6 w-6 ${action.color}`} />
                            <div className="text-center">
                                <div className="text-sm font-medium text-white">{action.title}</div>
                                <div className="text-xs text-gray-400">{action.description}</div>
                            </div>
                        </Button>
                    ))}
                </div>

                <Button
                    onClick={handleRefresh}
                    variant="outline"
                    className="w-full border-gray-700 hover:bg-gray-700/50"
                >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh All Data
                </Button>
            </CardContent>
        </Card>
    )
} 