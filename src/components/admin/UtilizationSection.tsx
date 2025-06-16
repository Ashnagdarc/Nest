import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, Progress } from "@/components/aceternity";
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, TrendingUp, TrendingDown, Activity, BarChart3, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import ErrorDisplay from '@/components/ui/error-display';
import { Button } from "@/components/aceternity";

type UtilizationData = {
    category: string;
    count: number;
    utilization: number;
}

export function UtilizationSection() {
    const supabase = createClient();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [utilizationData, setUtilizationData] = useState<UtilizationData[]>([]);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        fetchUtilizationData();
    }, []);

    async function fetchUtilizationData() {
        setIsLoading(true);
        setError(null);

        try {
            // Check if gears table exists
            const { count, error: tableError } = await supabase
                .from('gears')
                .select('*', { count: 'exact', head: true });

            if (tableError) {
                throw new Error(`Table error: ${tableError.message}`);
            }

            if (count === null) {
                setUtilizationData([]);
                return;
            }

            const { data, error } = await supabase
                .from('gears')
                .select('category, status');

            if (error) throw new Error(`Data fetch error: ${error.message}`);

            if (data && data.length > 0) {
                // Group by category
                const categories: Record<string, { total: number, used: number }> = {};

                data.forEach((gear: { category?: string, status?: string }) => {
                    const category = gear.category || 'Uncategorized';

                    if (!categories[category]) {
                        categories[category] = { total: 0, used: 0 };
                    }

                    categories[category].total++;

                    // Count items that are booked/checked out as "used"
                    if (
                        String(gear.status || '').toLowerCase() === 'booked' ||
                        String(gear.status || '').toLowerCase() === 'checked out' ||
                        String(gear.status || '').toLowerCase() === 'checked_out'
                    ) {
                        categories[category].used++;
                    }
                });

                // Convert to array and calculate utilization percentage
                const result = Object.entries(categories)
                    .map(([category, { total, used }]) => ({
                        category,
                        count: total,
                        utilization: total > 0 ? Math.round((used / total) * 100) : 0
                    }))
                    .sort((a, b) => b.utilization - a.utilization); // Sort by utilization

                setUtilizationData(result);
            } else {
                setUtilizationData([]);
            }
        } catch (error: any) {
            console.error("Error fetching utilization data:", error.message);
            setError(error.message);
            toast({
                title: "Error fetching utilization data",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    // Helper function to get color based on utilization percentage
    function getUtilizationConfig(percentage: number) {
        if (percentage < 30) return {
            color: "from-green-500 to-emerald-500",
            bgColor: "bg-green-500",
            textColor: "text-green-600",
            badgeColor: "bg-green-100 text-green-800",
            status: "Low Usage",
            icon: TrendingDown
        };
        if (percentage < 70) return {
            color: "from-yellow-500 to-amber-500",
            bgColor: "bg-yellow-500",
            textColor: "text-yellow-600",
            badgeColor: "bg-yellow-100 text-yellow-800",
            status: "Moderate",
            icon: Activity
        };
        return {
            color: "from-red-500 to-rose-500",
            bgColor: "bg-red-500",
            textColor: "text-red-600",
            badgeColor: "bg-red-100 text-red-800",
            status: "High Usage",
            icon: TrendingUp
        };
    }

    const averageUtilization = utilizationData.length > 0
        ? Math.round(utilizationData.reduce((sum, item) => sum + item.utilization, 0) / utilizationData.length)
        : 0;

    return (
        <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                            <div className="p-1.5 rounded bg-blue-500/20">
                                <BarChart3 className="h-4 w-4 text-blue-400" />
                            </div>
                            Gear Utilization
                        </CardTitle>
                        {/* Collapsed state summary */}
                        {isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, delay: 0.1 }}
                                className="flex items-center gap-4 mt-2"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium text-white">
                                        {averageUtilization}% avg
                                    </div>
                                    <div className="text-xs text-gray-400">usage</div>
                                </div>
                                {utilizationData.length > 0 && (
                                    <>
                                        <div className="w-px h-4 bg-gray-600" />
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm text-gray-300">
                                                {utilizationData.length}
                                            </div>
                                            <div className="text-xs text-gray-400">categories</div>
                                        </div>
                                    </>
                                )}
                                {utilizationData.length > 0 && (
                                    <>
                                        <div className="w-px h-4 bg-gray-600" />
                                        <div className="flex gap-1">
                                            {utilizationData.slice(0, 3).map((item, index) => {
                                                const config = getUtilizationConfig(item.utilization);
                                                return (
                                                    <div
                                                        key={item.category}
                                                        className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.color}`}
                                                        title={`${item.category}: ${item.utilization}%`}
                                                    />
                                                );
                                            })}
                                            {utilizationData.length > 3 && (
                                                <div className="w-2 h-2 rounded-full bg-gray-600" title="More categories..." />
                                            )}
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {!isCollapsed && (
                            <div className="text-right">
                                <div className="text-xl font-bold text-white">
                                    {averageUtilization}%
                                </div>
                                <div className="text-xs text-gray-400">avg usage</div>
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="text-gray-400 hover:text-white hover:bg-gray-700 p-2"
                        >
                            <motion.div
                                animate={{ rotate: isCollapsed ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ChevronDown className="h-4 w-4" />
                            </motion.div>
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        style={{ overflow: "hidden" }}
                    >
                        <CardContent className="pt-0">
                            {error ? (
                                <ErrorDisplay error={error} onRetry={fetchUtilizationData} />
                            ) : isLoading ? (
                                <div className="flex justify-center items-center p-4">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        <Loader2 className="h-5 w-5 text-blue-500" />
                                    </motion.div>
                                    <span className="ml-2 text-sm font-medium text-gray-300">Loading...</span>
                                </div>
                            ) : utilizationData.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center py-6"
                                >
                                    <div className="p-3 rounded-full bg-gray-700 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                                        <Zap className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <h3 className="text-sm font-medium text-white mb-1">
                                        No utilization data
                                    </h3>
                                    <p className="text-xs text-gray-400">
                                        Start tracking by creating gear items
                                    </p>
                                </motion.div>
                            ) : (
                                <div className="space-y-2">
                                    <AnimatePresence>
                                        {utilizationData.slice(0, 5).map((item, index) => {
                                            const config = getUtilizationConfig(item.utilization);
                                            const StatusIcon = config.icon;

                                            return (
                                                <motion.div
                                                    key={item.category}
                                                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                                    transition={{
                                                        delay: index * 0.05,
                                                        type: "spring",
                                                        stiffness: 100,
                                                        damping: 15
                                                    }}
                                                    whileHover={{ scale: 1.01 }}
                                                    className="group relative overflow-hidden"
                                                >
                                                    {/* Compact Card */}
                                                    <div className="relative p-2.5 rounded-lg bg-gray-800/40 hover:bg-gray-800/60 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200 backdrop-blur-sm">
                                                        {/* Colored accent bar */}
                                                        <div className={`absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b ${config.color} rounded-l-lg`} />

                                                        <div className="relative z-10 flex items-center justify-between">
                                                            {/* Left side - Category info */}
                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                {/* Compact Icon */}
                                                                <div className={`p-1.5 rounded-lg bg-gradient-to-br ${config.color} shadow-sm flex-shrink-0`}>
                                                                    <StatusIcon className="h-3 w-3 text-white" />
                                                                </div>

                                                                {/* Category Info */}
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="text-sm font-medium text-white truncate">
                                                                        {item.category}
                                                                    </h4>
                                                                    <p className="text-xs text-gray-400">
                                                                        {item.count} items
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Center - Progress */}
                                                            <div className="flex items-center gap-2 flex-1">
                                                                <div className="w-full max-w-16">
                                                                    <div className="w-full bg-gray-700/60 rounded-full h-1.5 overflow-hidden">
                                                                        <motion.div
                                                                            className={`h-full bg-gradient-to-r ${config.color} rounded-full`}
                                                                            initial={{ width: 0 }}
                                                                            animate={{ width: `${item.utilization}%` }}
                                                                            transition={{
                                                                                duration: 0.8,
                                                                                delay: index * 0.05 + 0.2,
                                                                                ease: "easeOut"
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Usage stats */}
                                                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                                                    <span>{Math.round((item.utilization / 100) * item.count)}</span>
                                                                    <span>/</span>
                                                                    <span>{item.count}</span>
                                                                </div>
                                                            </div>

                                                            {/* Right side - Percentage & Status */}
                                                            <div className="text-right flex-shrink-0">
                                                                <div className="text-lg font-bold text-white">
                                                                    {item.utilization}%
                                                                </div>
                                                                <div className={`text-xs ${item.utilization < 30 ? 'text-green-400' :
                                                                    item.utilization < 70 ? 'text-yellow-400' :
                                                                        'text-red-400'
                                                                    }`}>
                                                                    {config.status.split(' ')[0]}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Background gradient on hover */}
                                                        <div className={`absolute inset-0 bg-gradient-to-r ${config.color} opacity-0 group-hover:opacity-5 transition-opacity duration-200 rounded-lg`} />
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>

                                    {/* Compact Summary Section */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: utilizationData.length * 0.05 + 0.3 }}
                                        className="mt-3"
                                    >
                                        <div className="p-2.5 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 backdrop-blur-sm">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm">
                                                        <BarChart3 className="h-3 w-3 text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-medium text-white">
                                                            Overall Performance
                                                        </h4>
                                                        <p className="text-xs text-gray-400">
                                                            {utilizationData.length} categories
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                                        {averageUtilization}%
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {averageUtilization > 70 ? 'High' :
                                                            averageUtilization > 30 ? 'Moderate' : 'Low'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </CardContent>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
} 