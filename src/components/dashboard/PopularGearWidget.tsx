import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import Link from "next/link";
import { logger } from "@/utils/logger";
import { createSupabaseSubscription } from "@/utils/supabase-subscription";
import { motion } from "framer-motion";
import { EmptyState } from "./EmptyState";
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PopularGear {
    gear_id: string;
    name: string;
    full_name: string;
    request_count: number;
    category?: string;
    image_url?: string | null;
    status?: string;
}

export function PopularGearWidget() {
    const [popularGear, setPopularGear] = useState<PopularGear[]>([]);
    const [loading, setLoading] = useState(true);
    const [trendData, setTrendData] = useState<Record<string, 'up' | 'down' | null>>({});
    const supabase = createClient();

    // Fetch popular gear data with a date range (last 30 days)
    const fetchPopularGear = async () => {
        try {
            setLoading(true);
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 7);
            // Call the RPC with date arguments
            const { data, error } = await supabase.rpc('get_popular_gears', {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
            });

            if (!error && Array.isArray(data) && data.length > 0) {
                // Fetch extra details for each gear (category, image_url, status)
                const gearIds = data.map((g: any) => g.gear_id);
                const { data: gearDetails, error: gearDetailsError } = await supabase
                    .from('gears')
                    .select('id, category, image_url, status')
                    .in('id', gearIds);
                const detailsMap = new Map();
                gearDetails?.forEach((g: any) => detailsMap.set(g.id, g));
                setPopularGear(
                    data.map((g: any) => ({
                        ...g,
                        category: detailsMap.get(g.gear_id)?.category || '',
                        image_url: detailsMap.get(g.gear_id)?.image_url || null,
                        status: detailsMap.get(g.gear_id)?.status || '',
                    }))
                );
            } else {
                logger.error("PopularGear RPC error", {
                    code: error?.code,
                    message: error?.message,
                    details: error?.details,
                    hint: error?.hint,
                    raw: error
                });
                setPopularGear([]);
            }
        } catch (error: any) {
            logger.error("PopularGear unexpected error", { error });
            setPopularGear([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPopularGear();

        // Set up subscription to gear changes only
        const gearSubscription = createSupabaseSubscription({
            supabase,
            channel: 'popular-gear-updates',
            config: {
                event: '*',
                schema: 'public',
                table: 'gears'
            },
            callback: () => {
                fetchPopularGear();
            }
        });

        return () => {
            gearSubscription.unsubscribe();
        };
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Available':
                return 'bg-green-500/10 text-green-500';
            case 'CheckedOut':
                return 'bg-amber-500/10 text-amber-500';
            case 'Maintenance':
                return 'bg-blue-500/10 text-blue-500';
            default:
                return 'bg-gray-500/10 text-gray-500';
        }
    };

    const renderImagePlaceholder = (category: string) => {
        const colors = {
            Camera: 'bg-red-100 text-red-500',
            Lens: 'bg-blue-100 text-blue-500',
            Lighting: 'bg-yellow-100 text-yellow-500',
            Audio: 'bg-green-100 text-green-500',
            Microphone: 'bg-purple-100 text-purple-500',
            Laptop: 'bg-indigo-100 text-indigo-500',
            Storage: 'bg-gray-100 text-gray-500',
            Gimbal: 'bg-orange-100 text-orange-500',
            Monitor: 'bg-teal-100 text-teal-500',
        };

        const colorClass = colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-500';

        return (
            <div className={`w-full h-full flex items-center justify-center text-xl font-medium ${colorClass} rounded-md`}>
                {category.charAt(0)}
            </div>
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">Popular Equipment</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                <Skeleton className="h-10 w-10 rounded" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                                <Skeleton className="h-6 w-16 rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : popularGear.length > 0 ? (
                    <div className="space-y-4">
                        {popularGear.map((gear) => (
                            <motion.div
                                key={gear.gear_id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                            >
                                {gear.image_url ? (
                                    <img src={gear.image_url} alt={gear.name} className="h-10 w-10 rounded object-cover" />
                                ) : (
                                    <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-500">{gear.name[0]}</div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm truncate">{gear.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-xs">{gear.category}</Badge>
                                        <span className="text-xs text-muted-foreground">{gear.request_count} {gear.request_count === 1 ? 'checkout' : 'checkouts'}</span>
                                        {trendData[gear.gear_id] === 'up' && <TrendingUp className="h-4 w-4 text-green-500" aria-label="Trending Up" />}
                                        {trendData[gear.gear_id] === 'down' && <TrendingDown className="h-4 w-4 text-red-500" aria-label="Trending Down" />}
                                    </div>
                                </div>
                                <Badge className={getStatusColor(gear.status || "")}>{gear.status}</Badge>
                                <Link href={`/user/browse?gear=${gear.gear_id}`}><Button size="sm" variant="outline" aria-label="View Details">View Details</Button></Link>
                                <Link href={`/user/request?gear=${gear.gear_id}`}><Button size="sm" aria-label="Request Again">Request Again</Button></Link>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <>
                        <EmptyState
                            icon="📊"
                            title="No popular gear"
                            description="No equipment requests have been made yet. Popularity data will appear here once users start making requests."
                        />
                        <div className="flex justify-center mt-4">
                            <Link href="/user/browse"><Button>Browse Equipment</Button></Link>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
} 