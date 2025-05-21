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
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { format, subDays } from 'date-fns';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';

interface PopularGear {
    id: string;
    name: string;
    category: string;
    image_url: string | null;
    checkout_count: number;
    status: string;
}

export function PopularGearWidget() {
    const [popularGear, setPopularGear] = useState<PopularGear[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 30), to: new Date() });
    const [trendData, setTrendData] = useState<Record<string, 'up' | 'down' | null>>({});
    const supabase = createClient();
    const { toast } = useToast();

    // Fetch popular gear data for the selected date range
    const fetchPopularGear = async () => {
        try {
            setLoading(true);
            if (!dateRange?.from || !dateRange?.to) {
                setPopularGear([]);
                setLoading(false);
                return;
            }

            // 1. Try the RPC function first
            const { data, error } = await supabase
                .rpc('get_popular_gears', { start_date: dateRange.from.toISOString(), end_date: dateRange.to.toISOString() });

            if (!error && Array.isArray(data) && data.length > 0) {
                setPopularGear(data);
            } else {
                // 2. Log the error in detail
                logger.error("PopularGear RPC error", {
                    code: error?.code,
                    message: error?.message,
                    details: error?.details,
                    hint: error?.hint,
                    raw: error
                });

                // 3. Fallback: Direct query to gear_requests and gears
                const { data: requests, error: reqError } = await supabase
                    .from('gear_requests')
                    .select('gear_ids')
                    .gte('created_at', dateRange.from.toISOString())
                    .lte('created_at', dateRange.to.toISOString());

                if (reqError) {
                    logger.error("PopularGear fallback query error", {
                        code: reqError.code,
                        message: reqError.message,
                        details: reqError.details,
                        hint: reqError.hint,
                        raw: reqError
                    });
                    setPopularGear([]);
                    setLoading(false);
                    return;
                }

                // Count gear requests
                const allGearIds = requests
                    ?.filter((req: { gear_ids?: string[] | null }) => req.gear_ids && Array.isArray(req.gear_ids))
                    .flatMap((req: { gear_ids?: string[] | null }) => req.gear_ids || []);

                if (allGearIds && allGearIds.length > 0) {
                    const gearCounts: Record<string, number> = {};
                    allGearIds.forEach((gearId: string) => {
                        if (!gearId) return;
                        gearCounts[gearId] = (gearCounts[gearId] || 0) + 1;
                    });

                    // Get top 5 gear IDs
                    const topGearIds = Object.entries(gearCounts)
                        .sort(([, countA], [, countB]) => countB - countA)
                        .slice(0, 5)
                        .map(([id]) => id);

                    if (topGearIds.length > 0) {
                        const { data: gears, error: gearsError } = await supabase
                            .from('gears')
                            .select('id, name, category, image_url, status')
                            .in('id', topGearIds);

                        if (gearsError) {
                            logger.error("PopularGear fallback gear fetch error", {
                                code: gearsError.code,
                                message: gearsError.message,
                                details: gearsError.details,
                                hint: gearsError.hint,
                                raw: gearsError
                            });
                            setPopularGear([]);
                            setLoading(false);
                            return;
                        }

                        // Map to the expected format
                        const popularGear = topGearIds.map(id => {
                            const gear = gears?.find((g: { id: string }) => g.id === id);
                            return {
                                id,
                                name: gear?.name || 'Unknown Gear',
                                category: gear?.category || 'Unknown',
                                image_url: gear?.image_url || null,
                                checkout_count: gearCounts[id],
                                status: gear?.status || 'Unknown'
                            };
                        });
                        setPopularGear(popularGear);
                    } else {
                        setPopularGear([]);
                    }
                } else {
                    setPopularGear([]);
                }
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

        // Set up subscription to gear changes
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

        // Set up subscription to gear_request_gears changes
        const requestSubscription = createSupabaseSubscription({
            supabase,
            channel: 'popular-gear-request-updates',
            config: {
                event: '*',
                schema: 'public',
                table: 'gear_request_gears'
            },
            callback: () => {
                fetchPopularGear();
            }
        });

        return () => {
            gearSubscription.unsubscribe();
            requestSubscription.unsubscribe();
        };
    }, [dateRange]);

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
                <CardTitle className="flex items-center gap-2">Popular Equipment
                    <span className="ml-auto">
                        <DatePickerWithRange dateRange={dateRange} onDateRangeChange={setDateRange} />
                    </span>
                </CardTitle>
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
                                key={gear.id}
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
                                        <span className="text-xs text-muted-foreground">{gear.checkout_count} {gear.checkout_count === 1 ? 'checkout' : 'checkouts'}</span>
                                        {trendData[gear.id] === 'up' && <TrendingUp className="h-4 w-4 text-green-500" aria-label="Trending Up" />}
                                        {trendData[gear.id] === 'down' && <TrendingDown className="h-4 w-4 text-red-500" aria-label="Trending Down" />}
                                    </div>
                                </div>
                                <Badge className={getStatusColor(gear.status)}>{gear.status}</Badge>
                                <Link href={`/user/browse?gear=${gear.id}`}><Button size="sm" variant="outline" aria-label="View Details">View Details</Button></Link>
                                <Link href={`/user/request?gear=${gear.id}`}><Button size="sm" aria-label="Request Again">Request Again</Button></Link>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <>
                        <EmptyState
                            icon="📊"
                            title="No popular gear"
                            description="Equipment popularity data will appear here"
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