import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import ErrorDisplay from '@/components/ui/error-display';

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
    function getUtilizationColor(percentage: number): string {
        if (percentage < 30) return "bg-green-500";
        if (percentage < 70) return "bg-yellow-500";
        return "bg-red-500";
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl">Gear Utilization</CardTitle>
            </CardHeader>
            <CardContent>
                {error ? (
                    <ErrorDisplay error={error} onRetry={fetchUtilizationData} />
                ) : isLoading ? (
                    <div className="flex justify-center items-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
                        <span>Loading utilization data...</span>
                    </div>
                ) : utilizationData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No utilization data available
                    </div>
                ) : (
                    <div className="space-y-4">
                        {utilizationData.map((item, index) => (
                            <motion.div
                                key={item.category}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="space-y-2"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">{item.category}</span>
                                    <span className="text-sm text-muted-foreground">
                                        {item.utilization}% ({item.count} items)
                                    </span>
                                </div>
                                <Progress
                                    value={item.utilization}
                                    max={100}
                                    className={`h-2 ${getUtilizationColor(item.utilization)}`}
                                />
                            </motion.div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 