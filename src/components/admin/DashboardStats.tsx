import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/aceternity";
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, TrendingUp, TrendingDown, Minus, Package, CheckCircle, Wrench } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import ErrorDisplay from '@/components/ui/error-display';

type GearData = {
    id: string;
    status?: string;
    created_at?: string;
    category?: string;
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

    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-4">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                    <Loader2 className="h-6 w-6 text-blue-500" />
                </motion.div>
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
                <AnimatePresence>
                    {statItems.map((item, index) => (
                        <motion.div
                            key={item.title}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                                delay: index * 0.05,
                                type: "spring",
                                stiffness: 100,
                                damping: 15
                            }}
                            whileHover={{ scale: 1.02 }}
                        >
                            <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-200">
                                <CardContent className="p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${item.bgColor}`}>
                                                <item.icon className={`h-4 w-4 ${item.textColor}`} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 font-medium">
                                                    {item.title}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-bold text-white">
                                                        {item.value}
                                                    </span>
                                                    {item.percentage !== undefined && (
                                                        <span className={`text-xs ${item.textColor}`}>
                                                            ({item.percentage}%)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="flex items-center gap-1 text-xs">
                                                {getTrendIcon(item.value, item.previous)}
                                                <span className={getTrendColor(item.value, item.previous)}>
                                                    {item.value - item.previous >= 0 ? '+' : ''}
                                                    {item.value - item.previous}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress bar for percentages */}
                                    {item.percentage !== undefined && (
                                        <div className="mt-2">
                                            <div className="w-full bg-gray-700 rounded-full h-1">
                                                <motion.div
                                                    className={`h-1 rounded-full bg-gradient-to-r ${item.color}`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${item.percentage}%` }}
                                                    transition={{ duration: 0.8, delay: index * 0.1 }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
} 