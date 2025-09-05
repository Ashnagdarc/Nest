'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Database,
    Users,
    Package,
    Clock,
    AlertTriangle,
    CheckCircle,
    Activity,
    RefreshCw,
    TrendingUp,
    TrendingDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface SystemStats {
    totalGears: number;
    availableGears: number;
    unavailableGears: number;
    totalUsers: number;
    adminUsers: number;
    regularUsers: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
    lastBackup: string | null;
    storageUsed: number;
    activeSessions: number;
}

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    trend?: 'up' | 'down' | 'stable';
    trendValue?: string;
    color?: 'default' | 'success' | 'warning' | 'destructive';
    onClick?: () => void;
}

const StatCard = ({ title, value, icon, trend, trendValue, color = 'default', onClick }: StatCardProps) => {
    const colorClasses = {
        default: 'border-border',
        success: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
        warning: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950',
        destructive: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
    };

    const trendIcons = {
        up: <TrendingUp className="h-3 w-3 text-green-600" />,
        down: <TrendingDown className="h-3 w-3 text-red-600" />,
        stable: <Activity className="h-3 w-3 text-gray-600" />
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card
                className={`cursor-pointer transition-all hover:shadow-md ${colorClasses[color]} ${onClick ? 'hover:scale-105' : ''}`}
                onClick={onClick}
            >
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                {icon}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                                <p className="text-2xl font-bold">{value}</p>
                            </div>
                        </div>
                        {trend && trendValue && (
                            <div className="flex items-center space-x-1">
                                {trendIcons[trend]}
                                <span className="text-xs text-muted-foreground">{trendValue}</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default function SystemOverview() {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const { toast } = useToast();

    const fetchSystemStats = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/admin/system-overview', {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();

            if (data.success) {
                setStats(data.data);
                setLastUpdated(new Date());
            } else {
                // Don't show error toast for unauthorized access - just log it
                if (data.error === 'Unauthorized' || data.error === 'Admin access required') {
                    console.warn('System overview: User not authenticated or not admin');
                    setStats(null);
                } else {
                    throw new Error(data.error || 'Failed to fetch system stats');
                }
            }
        } catch (error) {
            console.error('Error fetching system stats:', error);
            toast({
                title: 'Error',
                description: 'Failed to load system statistics',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSystemStats();

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchSystemStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const getHealthBadge = (health: string) => {
        switch (health) {
            case 'healthy':
                return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="h-3 w-3 mr-1" />Healthy</Badge>;
            case 'warning':
                return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>;
            case 'critical':
                return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Critical</Badge>;
            default:
                return <Badge variant="outline">Unknown</Badge>;
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-primary" />
                        System Overview
                    </CardTitle>
                    <CardDescription>Loading system statistics...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-32">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!stats) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-primary" />
                        System Overview
                    </CardTitle>
                    <CardDescription>
                        {isLoading ? 'Loading system statistics...' : 'System statistics unavailable'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                            {isLoading ? 'Loading system statistics...' : 'Unable to load system statistics. Please ensure you are logged in as an admin.'}
                        </p>
                        <Button onClick={fetchSystemStats} variant="outline" disabled={isLoading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            {isLoading ? 'Loading...' : 'Retry'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5 text-primary" />
                            System Overview
                        </CardTitle>
                        <CardDescription>
                            Real-time system statistics and health monitoring
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {getHealthBadge(stats.systemHealth)}
                        <Button
                            onClick={fetchSystemStats}
                            variant="outline"
                            size="sm"
                            disabled={isLoading}
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Primary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Gears"
                        value={stats.totalGears}
                        icon={<Package className="h-5 w-5" />}
                        color={stats.unavailableGears > 0 ? 'warning' : 'success'}
                        onClick={() => window.location.href = '/admin/manage-gears'}
                    />
                    <StatCard
                        title="Available"
                        value={stats.availableGears}
                        icon={<CheckCircle className="h-5 w-5" />}
                        color="success"
                    />
                    <StatCard
                        title="Total Users"
                        value={stats.totalUsers}
                        icon={<Users className="h-5 w-5" />}
                        color="default"
                        onClick={() => window.location.href = '/admin/manage-users'}
                    />
                    <StatCard
                        title="Admins"
                        value={stats.adminUsers}
                        icon={<Database className="h-5 w-5" />}
                        color="default"
                    />
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <StatCard
                        title="Pending Requests"
                        value={stats.pendingRequests}
                        icon={<Clock className="h-5 w-5" />}
                        color={stats.pendingRequests > 5 ? 'warning' : 'default'}
                        onClick={() => window.location.href = '/admin/manage-requests'}
                    />
                    <StatCard
                        title="Active Sessions"
                        value={stats.activeSessions}
                        icon={<Activity className="h-5 w-5" />}
                        color="default"
                    />
                    <StatCard
                        title="Storage Used"
                        value={`${stats.storageUsed}MB`}
                        icon={<Database className="h-5 w-5" />}
                        color={stats.storageUsed > 1000 ? 'warning' : 'default'}
                    />
                </div>

                {/* System Health Details */}
                <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">System Health Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Unavailable Gears:</span>
                                <span className={stats.unavailableGears > 0 ? 'text-yellow-600 font-medium' : 'text-green-600'}>
                                    {stats.unavailableGears}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Regular Users:</span>
                                <span>{stats.regularUsers}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Approved Requests:</span>
                                <span className="text-green-600">{stats.approvedRequests}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Rejected Requests:</span>
                                <span className="text-red-600">{stats.rejectedRequests}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Last Backup:</span>
                                <span className="text-muted-foreground">
                                    {stats.lastBackup ? new Date(stats.lastBackup).toLocaleDateString() : 'Never'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">System Status:</span>
                                {getHealthBadge(stats.systemHealth)}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
