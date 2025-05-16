import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import ErrorDisplay from '@/components/ui/error-display';

type GearData = {
    id: string;
    status?: string;
    created_at?: string;
    category?: string;
};

type UtilizationData = {
    category: string;
    count: number;
    utilization: number;
}

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
    const [utilizationData, setUtilizationData] = useState<UtilizationData[]>([]);

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
                setUtilizationData([]);
                return;
            }

            // Get current gear data
            const { data: currentData, error: currentError } = await supabase
                .from('gears')
                .select('id, status, created_at, category')
                .order('created_at', { ascending: false });

            if (currentError) throw new Error(`Data fetch error: ${currentError.message}`);

            if (currentData) {
                // Current counts
                const available = currentData.filter((g: GearData) =>
                    String(g.status || '').toLowerCase().trim() === 'available').length;

                const booked = currentData.filter((g: GearData) =>
                    ['booked', 'checked out', 'checked_out'].includes(
                        String(g.status || '').toLowerCase().trim()
                    )).length;

                const damaged = currentData.filter((g: GearData) =>
                    ['damaged', 'maintenance', 'repair'].includes(
                        String(g.status || '').toLowerCase().trim()
                    )).length;

                const total = currentData.length;

                // Group by category for utilization data
                const categories: Record<string, { total: number, used: number }> = {};
                currentData.forEach((gear: any) => {
                    const category = gear.category || 'Uncategorized';
                    if (!categories[category]) {
                        categories[category] = { total: 0, used: 0 };
                    }
                    categories[category].total++;
                    if (['booked', 'checked out', 'checked_out'].includes(
                        String(gear.status || '').toLowerCase().trim()
                    )) {
                        categories[category].used++;
                    }
                });

                // Convert to array and calculate utilization percentage
                const utilizationResult = Object.entries(categories).map(([category, { total, used }]) => ({
                    category,
                    count: total,
                    utilization: total > 0 ? Math.round((used / total) * 100) : 0
                }));

                setUtilizationData(utilizationResult);
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

    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading stats...</span>
            </div>
        );
    }

    if (error) {
        return <ErrorDisplay error={error} onRetry={fetchStats} />;
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Equipment"
                    value={stats.total}
                    index={0}
                />
                <StatCard
                    title="Available"
                    value={stats.available}
                    index={1}
                    color="text-green-500"
                    percentage={stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 0}
                />
                <StatCard
                    title="Currently Booked"
                    value={stats.booked}
                    index={2}
                    color="text-blue-500"
                    percentage={stats.total > 0 ? Math.round((stats.booked / stats.total) * 100) : 0}
                />
                <StatCard
                    title="Under Repair"
                    value={stats.damaged}
                    index={3}
                    color="text-orange-500"
                    percentage={stats.total > 0 ? Math.round((stats.damaged / stats.total) * 100) : 0}
                />
            </div>
        </div>
    );
}

interface StatCardProps {
    title: string;
    value: number;
    index: number;
    color?: string;
    percentage?: number;
}

function StatCard({ title, value, index, color = "text-primary", percentage }: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {value}
                        {percentage !== undefined && (
                            <span className={`text-sm ml-2 ${color}`}>
                                ({percentage}%)
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
} 