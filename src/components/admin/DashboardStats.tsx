import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, Minus, Package, CheckCircle, Wrench, Users, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import ErrorDisplay from '@/components/ui/error-display';
import { Badge } from '@/components/ui/badge';

type GearData = {
    id: string;
    status: string | null;
    created_at: string | null;
    category: string;
};

export function DashboardStats() {
    const supabase = createClient();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({
        available: 0,
        total: 0,
        booked: 0,
        damaged: 0
    });
    const [previousStats, setPreviousStats] = useState({
        available: 0,
        total: 0,
        booked: 0,
        damaged: 0
    });
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    async function fetchStats() {
        setIsLoading(true);
        setError(null);

        try {
            // Check if table exists first
            const { count, error: tableError } = await supabase
                .from('gears')
                .select('*', { count: 'exact', head: true });

            if (tableError) {
                throw new Error(`Table error: ${tableError.message}`);
            }

            if (count === null) {
                setStats({ available: 0, total: 0, booked: 0, damaged: 0 });
                return;
            }

            // Get current gear data
            const { data: currentData, error: currentError } = await supabase
                .from('gears')
                .select('id, status, created_at, category')
                .order('created_at', { ascending: false });

            if (currentError) throw new Error(`Data fetch error: ${currentError.message}`);

            if (currentData) {
                setPreviousStats(stats);

                // Current counts with proper status mapping
                const available = currentData.filter((g: GearData) => {
                    const status = String(g.status || '').toLowerCase().trim();
                    return status === 'available' || status === '';
                }).length;

                const booked = currentData.filter((g: GearData) => {
                    const status = String(g.status || '').toLowerCase().trim();
                    return ['booked', 'checked out', 'checked_out'].includes(status);
                }).length;

                const damaged = currentData.filter((g: GearData) => {
                    const status = String(g.status || '').toLowerCase().trim();
                    return ['damaged', 'maintenance', 'repair', 'under repair'].includes(status);
                }).length;

                const total = currentData.length;

                setStats({ available, total, booked, damaged });
            }
        } catch (error: any) {
            console.error("Error fetching stats:", error.message);
            setError(error.message);
            toast({
                title: "Error fetching stats",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    const getTrendIcon = (current: number, previous: number) => {
        if (current > previous) return <TrendingUp className="h-3 w-3 text-green-400" />;
        if (current < previous) return <TrendingDown className="h-3 w-3 text-red-400" />;
        return <Minus className="h-3 w-3 text-gray-500" />;
    };

    const getTrendColor = (current: number, previous: number) => {
        if (current > previous) return "text-green-400";
        if (current < previous) return "text-red-400";
        return "text-gray-500";
    };

    const getStatIcon = (title: string) => {
        switch (title.toLowerCase()) {
            case 'active users':
                return Users;
            case 'total gears':
                return Package;
            case 'pending requests':
                return Clock;
            case 'available gears':
                return CheckCircle;
            case 'under repair':
                return AlertTriangle;
            default:
                return Package;
        }
    };

    const getStatColor = (title: string) => {
        switch (title.toLowerCase()) {
            case 'active users':
                return 'text-blue-500';
            case 'total gears':
                return 'text-purple-500';
            case 'pending requests':
                return 'text-orange-500';
            case 'available gears':
                return 'text-green-500';
            case 'under repair':
                return 'text-red-500';
            default:
                return 'text-gray-500';
        }
    };

    const getStatBgColor = (title: string) => {
        switch (title.toLowerCase()) {
            case 'active users':
                return 'bg-blue-500/10';
            case 'total gears':
                return 'bg-purple-500/10';
            case 'pending requests':
                return 'bg-orange-500/10';
            case 'available gears':
                return 'bg-green-500/10';
            case 'under repair':
                return 'bg-red-500/10';
            default:
                return 'bg-gray-500/10';
        }
    };

    const statVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: (index: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: index * 0.1,
                duration: 0.3
            }
        })
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-4">
                <div className="animate-spin">
                    <Loader2 className="h-6 w-6 text-blue-500" />
                </div>
                <span className="ml-2 text-sm font-medium text-gray-300">Loading stats...</span>
            </div>
        );
    }

    if (error) {
        return <ErrorDisplay error={error} onRetry={fetchStats} />;
    }

    const statItems = [
        {
            title: "Total Equipment",
            value: stats.total,
            icon: Package,
            color: "from-blue-500 to-blue-600",
            bgColor: "bg-blue-500/20",
            textColor: "text-blue-400",
            previous: previousStats.total
        },
        {
            title: "Available",
            value: stats.available,
            icon: CheckCircle,
            color: "from-green-500 to-green-600",
            bgColor: "bg-green-500/20",
            textColor: "text-green-400",
            percentage: stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 0,
            previous: previousStats.available
        },
        {
            title: "Currently Booked",
            value: stats.booked,
            icon: Package,
            color: "from-purple-500 to-purple-600",
            bgColor: "bg-purple-500/20",
            textColor: "text-purple-400",
            percentage: stats.total > 0 ? Math.round((stats.booked / stats.total) * 100) : 0,
            previous: previousStats.booked
        },
        {
            title: "Under Repair",
            value: stats.damaged,
            icon: Wrench,
            color: "from-orange-500 to-orange-600",
            bgColor: "bg-orange-500/20",
            textColor: "text-orange-400",
            percentage: stats.total > 0 ? Math.round((stats.damaged / stats.total) * 100) : 0,
            previous: previousStats.damaged
        }
    ];

    return (
        <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white mb-3">Equipment Overview</h2>
            <div className="grid grid-cols-1 gap-3">
                {statItems.map((item, index) => (
                    <div key={item.title}>
                        <Card className={`transition-all duration-200 hover:shadow-md border-primary/20 ${item.bgColor}`}>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${item.bgColor}`}>
                                            <item.icon className={`h-4 w-4 ${item.textColor}`} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">
                                                {item.title}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl font-bold">
                                                    {item.value}
                                                </span>
                                                {item.percentage !== undefined && (
                                                    <Badge
                                                        variant={item.value > item.previous ? "default" : "secondary"}
                                                        className="text-xs"
                                                    >
                                                        {item.value > item.previous ? '+' : ''}
                                                        {item.value - item.previous}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    );
} 