/**
 * Admin Command Center - Enhanced Real-Time Dashboard
 */

"use client"

import { Suspense, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"

// Icons
import {
    RefreshCcw, Settings, BarChart3, Users, Package,
    ClipboardList, Bell, Clock, CheckCircle, AlertTriangle,
    TrendingUp, TrendingDown, Wrench, Eye, Plus,
    Activity, Database, Zap, Shield, Camera, Laptop,
    Mic, Monitor, Wifi, WifiOff, Heart, AlertCircle,
    Calendar, FileText, Gauge, CircuitBoard
} from "lucide-react"

// Components
import { DashboardProvider, useDashboard } from '@/components/admin/DashboardProvider'
import { useToast } from "@/hooks/use-toast"

// Dashboard Components
import {
    RealTimeStatus,
    StatCard,
    SystemHealthMonitor,
    RecentActivityFeed,
    QuickActionsPanel
} from '@/components/admin/dashboard'











/**
 * Main Admin Dashboard Component
 * 
 * The core dashboard interface that orchestrates all components
 * and provides the main administrative view.
 */
function AdminDashboard() {
    const {
        stats,
        loading,
        loadingStates,
        error,
        realTimeEnabled,
        performance,
        gears,
        users,
        requests,
        activities,
        refreshData
    } = useDashboard()

    const { toast } = useToast()
    const router = useRouter()
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

    // Update timestamp when data changes
    useEffect(() => {
        if (!loading) {
            setLastUpdated(new Date())
        }
    }, [stats, loading])

    if (loadingStates.initialLoad) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-white text-lg">Initializing Command Center...</p>
                    <p className="text-gray-400 text-sm mt-2">Setting up real-time connections</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="max-w-7xl mx-auto p-6 space-y-8">

                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-[#ff6300] via-[#ff8533] to-[#ffaa66] bg-clip-text text-transparent">
                            Admin Center v1.0
                        </h1>
                        <p className="text-gray-300 mt-2 text-lg">
                            Enhanced real-time dashboard with live analytics
                        </p>
                        <div className="flex items-center space-x-4 mt-3">
                            <p className="text-sm text-gray-500">
                                Last updated: {lastUpdated.toLocaleString()}
                            </p>
                            <RealTimeStatus />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                        <Button
                            onClick={() => router.push('/admin/reports')}
                            variant="outline"
                            size="sm"
                            className="border-gray-700 hover:bg-gray-800 text-white"
                        >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Reports
                        </Button>
                        <Button
                            onClick={() => router.push('/admin/settings')}
                            variant="outline"
                            size="sm"
                            className="border-gray-700 hover:bg-gray-800 text-white"
                        >
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                        </Button>
                    </div>
                </div>

                {/* Statistics Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Equipment"
                        value={stats.totalEquipment}
                        icon={Package}
                        color="text-blue-400"
                        subtitle={`${stats.availableEquipment} available`}
                        trend="stable"
                        loading={loadingStates.gears}
                    />
                    <StatCard
                        title="Pending Requests"
                        value={stats.pendingRequests}
                        icon={ClipboardList}
                        color="text-yellow-400"
                        subtitle={`${stats.approvalRate}% approval rate`}
                        trend={stats.pendingRequests > 5 ? 'up' : 'stable'}
                        loading={loadingStates.requests}
                    />
                    <StatCard
                        title="Active Users"
                        value={stats.activeUsers}
                        icon={Users}
                        color="text-green-400"
                        subtitle={`${stats.engagementRate}% engagement`}
                        trend="up"
                        loading={loadingStates.users}
                    />
                    <StatCard
                        title="Utilization Rate"
                        value={stats.utilizationRate}
                        icon={TrendingUp}
                        color="text-purple-400"
                        subtitle="Equipment in use"
                        trend={stats.utilizationRate > 70 ? 'up' : 'stable'}
                        loading={loadingStates.gears}
                    />
                </div>

                {/* Main Content Tabs */}
                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-gray-700">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-orange-600">
                            <Eye className="h-4 w-4 mr-2" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="equipment" className="data-[state=active]:bg-blue-600">
                            <Package className="h-4 w-4 mr-2" />
                            Equipment
                        </TabsTrigger>
                        <TabsTrigger value="users" className="data-[state=active]:bg-green-600">
                            <Users className="h-4 w-4 mr-2" />
                            Users
                        </TabsTrigger>
                        <TabsTrigger value="system" className="data-[state=active]:bg-purple-600">
                            <CircuitBoard className="h-4 w-4 mr-2" />
                            System
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <RecentActivityFeed />
                            <QuickActionsPanel />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card className="bg-gray-800/50 border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Package className="h-5 w-5 text-blue-400" />
                                        Equipment Status
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-300">Available</span>
                                        <span className="text-green-400 font-semibold">{stats.availableEquipment}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-300">Checked Out</span>
                                        <span className="text-blue-400 font-semibold">{stats.checkedOutEquipment}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-300">Under Repair</span>
                                        <span className="text-red-400 font-semibold">{stats.underRepairEquipment}</span>
                                    </div>
                                    <div className="mt-4">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-400">Utilization</span>
                                            <span className="text-white">{stats.utilizationRate}%</span>
                                        </div>
                                        <Progress value={stats.utilizationRate} className="h-2" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gray-800/50 border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <ClipboardList className="h-5 w-5 text-yellow-400" />
                                        Request Overview
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-300">Pending</span>
                                        <span className="text-yellow-400 font-semibold">{stats.pendingRequests}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-300">Approved</span>
                                        <span className="text-green-400 font-semibold">{stats.approvedRequests}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-300">Rejected</span>
                                        <span className="text-red-400 font-semibold">{stats.rejectedRequests}</span>
                                    </div>
                                    <div className="mt-4">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-400">Approval Rate</span>
                                            <span className="text-white">{stats.approvalRate}%</span>
                                        </div>
                                        <Progress value={stats.approvalRate} className="h-2" />
                                    </div>
                                </CardContent>
                            </Card>

                            <SystemHealthMonitor />
                        </div>
                    </TabsContent>

                    <TabsContent value="equipment" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Equipment Analytics Content */}
                            <Card className="bg-gray-800/50 border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Package className="h-5 w-5 text-blue-400" />
                                        Equipment Breakdown
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <div className="text-sm text-gray-400">Total Equipment</div>
                                            <div className="text-2xl font-bold text-white">
                                                {stats.totalEquipment}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-sm text-gray-400">Utilization Rate</div>
                                            <div className="text-2xl font-bold text-white">
                                                {stats.utilizationRate}%
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300">Available</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-400 font-semibold">{stats.availableEquipment}</span>
                                                <div className="w-16 bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className="h-2 bg-green-500 rounded-full"
                                                        style={{ width: `${stats.totalEquipment > 0 ? (stats.availableEquipment / stats.totalEquipment) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300">Checked Out</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-blue-400 font-semibold">{stats.checkedOutEquipment}</span>
                                                <div className="w-16 bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className="h-2 bg-blue-500 rounded-full"
                                                        style={{ width: `${stats.totalEquipment > 0 ? (stats.checkedOutEquipment / stats.totalEquipment) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300">Under Repair</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-red-400 font-semibold">{stats.underRepairEquipment}</span>
                                                <div className="w-16 bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className="h-2 bg-red-500 rounded-full"
                                                        style={{ width: `${stats.totalEquipment > 0 ? (stats.underRepairEquipment / stats.totalEquipment) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300">Retired</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400 font-semibold">{stats.retiredEquipment}</span>
                                                <div className="w-16 bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className="h-2 bg-gray-500 rounded-full"
                                                        style={{ width: `${stats.totalEquipment > 0 ? (stats.retiredEquipment / stats.totalEquipment) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Recent Equipment Activity */}
                            <Card className="bg-gray-800/50 border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-green-400" />
                                        Recent Equipment Activity
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-64">
                                        <div className="space-y-3">
                                            {activities.slice(0, 10).map((activity, index) => (
                                                <div key={index} className="flex items-center space-x-3 p-2 rounded bg-gray-900/50">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-gray-300 truncate">
                                                            {activity.activity_type || 'Equipment activity'}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {new Date(activity.created_at).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                            {activities.length === 0 && (
                                                <div className="text-center py-8 text-gray-400">
                                                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                    <p>No recent equipment activity</p>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Equipment Categories */}
                        <Card className="bg-gray-800/50 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-purple-400" />
                                    Equipment Categories & Usage
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Array.from(new Set(gears.map(gear => gear.category).filter(Boolean))).map((category, index) => {
                                        const categoryGears = gears.filter(gear => gear.category === category)
                                        const availableInCategory = categoryGears.filter(gear => gear.status === 'Available').length
                                        const checkedOutInCategory = categoryGears.filter(gear => gear.status === 'Checked Out').length
                                        const categoryUtilization = categoryGears.length > 0 ? Math.round((checkedOutInCategory / categoryGears.length) * 100) : 0

                                        return (
                                            <div key={category} className="p-4 bg-gray-900/50 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-medium text-white">{category}</h4>
                                                    <Badge variant={categoryUtilization > 70 ? 'destructive' : categoryUtilization > 40 ? 'default' : 'secondary'}>
                                                        {categoryUtilization}%
                                                    </Badge>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-400">Total</span>
                                                        <span className="text-white">{categoryGears.length}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-400">Available</span>
                                                        <span className="text-green-400">{availableInCategory}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-400">In Use</span>
                                                        <span className="text-blue-400">{checkedOutInCategory}</span>
                                                    </div>
                                                    <Progress value={categoryUtilization} className="h-2 mt-2" />
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {gears.length === 0 && (
                                        <div className="col-span-full text-center py-8 text-gray-400">
                                            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p>No equipment categories available</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card className="bg-gray-800/50 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Settings className="h-5 w-5 text-orange-400" />
                                    Equipment Management
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Button
                                        onClick={() => router.push('/admin/manage-gears')}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        <Package className="h-4 w-4 mr-2" />
                                        Manage Equipment
                                    </Button>
                                    <Button
                                        onClick={() => refreshData()}
                                        variant="outline"
                                        className="border-gray-600 hover:bg-gray-700"
                                    >
                                        <RefreshCcw className="h-4 w-4 mr-2" />
                                        Refresh Data
                                    </Button>
                                    <Button
                                        onClick={() => router.push('/admin/reports')}
                                        variant="outline"
                                        className="border-gray-600 hover:bg-gray-700"
                                    >
                                        <FileText className="h-4 w-4 mr-2" />
                                        View Reports
                                    </Button>
                                    <Button
                                        onClick={() => router.push('/admin/settings')}
                                        variant="outline"
                                        className="border-gray-600 hover:bg-gray-700"
                                    >
                                        <Settings className="h-4 w-4 mr-2" />
                                        Settings
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="users" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* User Statistics */}
                            <Card className="bg-gray-800/50 border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Users className="h-5 w-5 text-green-400" />
                                        User Overview
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <div className="text-sm text-gray-400">Total Users</div>
                                            <div className="text-2xl font-bold text-white">
                                                {stats.totalUsers}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-sm text-gray-400">Engagement Rate</div>
                                            <div className="text-2xl font-bold text-white">
                                                {stats.engagementRate}%
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300">Active Users</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-400 font-semibold">{stats.activeUsers}</span>
                                                <div className="w-16 bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className="h-2 bg-green-500 rounded-full"
                                                        style={{ width: `${stats.totalUsers > 0 ? (stats.activeUsers / stats.totalUsers) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300">Admin Users</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-blue-400 font-semibold">{stats.adminUsers}</span>
                                                <div className="w-16 bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className="h-2 bg-blue-500 rounded-full"
                                                        style={{ width: `${stats.totalUsers > 0 ? (stats.adminUsers / stats.totalUsers) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300">Regular Users</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-purple-400 font-semibold">{stats.regularUsers}</span>
                                                <div className="w-16 bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className="h-2 bg-purple-500 rounded-full"
                                                        style={{ width: `${stats.totalUsers > 0 ? (stats.regularUsers / stats.totalUsers) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* User Activity */}
                            <Card className="bg-gray-800/50 border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-orange-400" />
                                        User Activity Trends
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <div className="text-sm text-gray-400">Total Requests</div>
                                            <div className="text-2xl font-bold text-white">
                                                {stats.totalRequests}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-sm text-gray-400">Approval Rate</div>
                                            <div className="text-2xl font-bold text-white">
                                                {stats.approvalRate}%
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300">Pending Requests</span>
                                            <span className="text-yellow-400 font-semibold">{stats.pendingRequests}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300">Approved Requests</span>
                                            <span className="text-green-400 font-semibold">{stats.approvedRequests}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300">Rejected Requests</span>
                                            <span className="text-red-400 font-semibold">{stats.rejectedRequests}</span>
                                        </div>
                                        <div className="mt-4">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-400">Approval Rate</span>
                                                <span className="text-white">{stats.approvalRate}%</span>
                                            </div>
                                            <Progress value={stats.approvalRate} className="h-2" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* User List */}
                        <Card className="bg-gray-800/50 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Users className="h-5 w-5 text-blue-400" />
                                    Recent Users & Activity
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-64">
                                    <div className="space-y-3">
                                        {users.map((user, index) => {
                                            const userRequests = requests.filter(req => req.user_id === user.id).length
                                            return (
                                                <div key={user.id} className="flex items-center justify-between p-3 rounded bg-gray-900/50">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`w-3 h-3 rounded-full ${user.status === 'Active' ? 'bg-green-500' : 'bg-gray-500'}`} />
                                                        <div>
                                                            <p className="text-sm font-medium text-white">
                                                                {user.full_name || 'Unknown User'}
                                                            </p>
                                                            <p className="text-xs text-gray-400">
                                                                {user.email} • {user.role}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <Badge variant={user.role === 'Admin' ? 'default' : 'secondary'}>
                                                            {user.role}
                                                        </Badge>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {userRequests} requests
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {users.length === 0 && (
                                            <div className="text-center py-8 text-gray-400">
                                                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                <p>No users found</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Department Analytics */}
                        <Card className="bg-gray-800/50 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-purple-400" />
                                    Department Breakdown
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Array.from(new Set(users.map(user => user.department).filter(Boolean))).map((department, index) => {
                                        const departmentUsers = users.filter(user => user.department === department)
                                        const departmentRequests = requests.filter(req =>
                                            departmentUsers.some(user => user.id === req.user_id)
                                        ).length

                                        return (
                                            <div key={department} className="p-4 bg-gray-900/50 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-medium text-white">{department}</h4>
                                                    <Badge variant="outline">
                                                        {departmentUsers.length} users
                                                    </Badge>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-400">Active Users</span>
                                                        <span className="text-green-400">
                                                            {departmentUsers.filter(u => u.status === 'Active').length}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-400">Total Requests</span>
                                                        <span className="text-blue-400">{departmentRequests}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-400">Avg Requests/User</span>
                                                        <span className="text-white">
                                                            {departmentUsers.length > 0 ? Math.round(departmentRequests / departmentUsers.length) : 0}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {users.filter(user => user.department).length === 0 && (
                                        <div className="col-span-full text-center py-8 text-gray-400">
                                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p>No department information available</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* User Management Actions */}
                        <Card className="bg-gray-800/50 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Settings className="h-5 w-5 text-orange-400" />
                                    User Management
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Button
                                        onClick={() => router.push('/admin/manage-users')}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        <Users className="h-4 w-4 mr-2" />
                                        Manage Users
                                    </Button>
                                    <Button
                                        onClick={() => refreshData()}
                                        variant="outline"
                                        className="border-gray-600 hover:bg-gray-700"
                                    >
                                        <RefreshCcw className="h-4 w-4 mr-2" />
                                        Refresh Data
                                    </Button>
                                    <Button
                                        onClick={() => router.push('/admin/reports')}
                                        variant="outline"
                                        className="border-gray-600 hover:bg-gray-700"
                                    >
                                        <FileText className="h-4 w-4 mr-2" />
                                        User Reports
                                    </Button>
                                    <Button
                                        onClick={() => router.push('/admin/settings')}
                                        variant="outline"
                                        className="border-gray-600 hover:bg-gray-700"
                                    >
                                        <Settings className="h-4 w-4 mr-2" />
                                        Settings
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="system" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <SystemHealthMonitor />
                            <Card className="bg-gray-800/50 border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Database className="h-5 w-5 text-blue-400" />
                                        Performance Metrics
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <div className="text-sm text-gray-400">Total Queries</div>
                                            <div className="text-2xl font-bold text-white">
                                                {performance.totalQueries}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-sm text-gray-400">Failed Queries</div>
                                            <div className="text-2xl font-bold text-white">
                                                {performance.failedQueries}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Cache Hit Rate</span>
                                            <span className="text-white">{performance.cacheHitRate}%</span>
                                        </div>
                                        <Progress value={performance.cacheHitRate} className="h-2" />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Avg Query Time</span>
                                            <span className="text-white">{performance.averageQueryTime}ms</span>
                                        </div>
                                        <Progress
                                            value={Math.max(0, 100 - (performance.averageQueryTime / 50))}
                                            className="h-2"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>

            </div>
        </div>
    )
}

/**
 * Admin Dashboard Page with Provider Wrapper
 * 
 * Main exported component that wraps the dashboard with the
 * enhanced provider for proper state management.
 */
export default function AdminDashboardPage() {
    return (
        <DashboardProvider>
            <AdminDashboard />
        </DashboardProvider>
    )
} 