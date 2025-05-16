import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { createClient } from '@/lib/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/utils/logger";
import { createSupabaseSubscription } from "@/utils/supabase-subscription";
import { EmptyState } from "./EmptyState";

interface CategoryData {
    category: string;
    total: number;
    available: number;
    checked_out: number;
    maintenance: number;
}

export function CategoryAvailabilityChart() {
    const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    // Fetch category data
    const fetchCategoryData = async () => {
        try {
            setLoading(true);

            // Call the stored function
            const { data, error } = await supabase.rpc('get_category_availability');

            if (error) {
                logger.error("Error calling get_category_availability function:", error);
                throw error;
            }

            // Format data for chart
            const formattedData = (data || []).slice(0, 6).map((category: CategoryData) => ({
                ...category,
                name: category.category,
            }));

            setCategoryData(formattedData);
        } catch (error) {
            logger.error("Error fetching category availability data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategoryData();

        // Set up subscription to gear changes
        const gearSubscription = createSupabaseSubscription({
            supabase,
            channel: 'category-availability-updates',
            config: {
                event: '*',
                schema: 'public',
                table: 'gears'
            },
            callback: () => {
                fetchCategoryData();
            }
        });

        return () => {
            gearSubscription.unsubscribe();
        };
    }, [supabase]);

    // Custom colors for the bars
    const colors = {
        available: '#10b981',    // green
        checked_out: '#f59e0b',  // amber
        maintenance: '#3b82f6'   // blue
    };

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background border rounded-md p-2 shadow-md text-xs">
                    <p className="font-medium mb-1">{label}</p>
                    {payload.map((entry: any) => (
                        <p key={entry.name} style={{ color: entry.color }}>
                            {entry.name}: {entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="h-[400px]">
            <CardHeader>
                <CardTitle className="text-md">Equipment by Category</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="w-full h-64 flex items-center justify-center">
                        <Skeleton className="w-full h-full rounded-md" />
                    </div>
                ) : categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={categoryData}
                            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                            barGap={0}
                            barCategoryGap="20%"
                        >
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 11 }}
                                axisLine={{ stroke: '#e5e7eb' }}
                                tickLine={false}
                                interval={0}
                            />
                            <YAxis
                                tick={{ fontSize: 11 }}
                                axisLine={{ stroke: '#e5e7eb' }}
                                tickLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="available" name="Available" stackId="stack" >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`available-${index}`} fill={colors.available} />
                                ))}
                            </Bar>
                            <Bar dataKey="checked_out" name="Checked Out" stackId="stack">
                                {categoryData.map((entry, index) => (
                                    <Cell key={`checkout-${index}`} fill={colors.checked_out} />
                                ))}
                            </Bar>
                            <Bar dataKey="maintenance" name="Maintenance" stackId="stack">
                                {categoryData.map((entry, index) => (
                                    <Cell key={`maintenance-${index}`} fill={colors.maintenance} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <EmptyState
                        icon="📊"
                        title="No category data"
                        description="Category statistics will appear here"
                    />
                )}
            </CardContent>
        </Card>
    );
} 