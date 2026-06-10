import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState, useRef } from "react";
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { logger } from "@/utils/logger";
import { TrendingUp, TrendingDown } from 'lucide-react';
import Image from 'next/image';
import { normalizeGearStatus, GearStatus } from '@/lib/constants/gear-status';
import { getCategoryBadgeClass, getCategoryIcon } from '@/lib/utils/category';

interface PopularGear {
    gear_id: string;
    name: string;
    full_name: string;
    request_count: number;
    category?: string;
    image_url?: string | null;
    status?: string;
}

interface PopularGearApiItem {
    gear_id: string;
    name: string;
    full_name: string;
    request_count: number;
}

interface GearDetailsRow {
    id: string;
    category?: string | null;
    image_url?: string | null;
    status?: string | null;
}

export function PopularGearWidget() {
    const [popularGear, setPopularGear] = useState<PopularGear[]>([]);
    const [loading, setLoading] = useState(true);
    const [trendData] = useState<Record<string, 'up' | 'down' | null>>({});

    // --- UI State Preservation ---
    const listContainerRef = useRef<HTMLDivElement | null>(null);
    const scrollPositionRef = useRef<number>(0);

    // Fetch popular gear data with a date range (last 7 days)
    const fetchPopularGear = async () => {
        try {
            setLoading(true);
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 7);

            const response = await fetch(
                `/api/gears/popular?start_date=${encodeURIComponent(startDate.toISOString())}&end_date=${encodeURIComponent(endDate.toISOString())}&limit=10`,
                { cache: 'no-store' }
            );
            if (!response.ok) throw new Error('Failed to load popular gear');
            const directData = await response.json();
            const supabase = createClient();

            if (Array.isArray(directData) && directData.length > 0) {
                // Fetch extra details for each gear (category, image_url, status)
                const popularGearItems = directData as PopularGearApiItem[];
                const gearIds = popularGearItems.map((g) => g.gear_id);
                const { data: gearDetails } = await supabase
                    .from('gears')
                    .select('id, category, image_url, status')
                    .in('id', gearIds);

                const detailsMap = new Map<string, GearDetailsRow>();
                gearDetails?.forEach((g) => {
                    const row = g as GearDetailsRow;
                    detailsMap.set(row.id, row);
                });

                setPopularGear(
                    popularGearItems.map((g) => ({
                        ...g,
                        category: detailsMap.get(g.gear_id)?.category || '',
                        image_url: detailsMap.get(g.gear_id)?.image_url || null,
                        status: detailsMap.get(g.gear_id)?.status || '',
                    }))
                );
            } else {
                // No data available
                setPopularGear([]);
            }
        } catch (error: unknown) {
            logger.error("PopularGear query error", { error });
            setPopularGear([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchPopularGearWithScroll = async () => {
        // Preserve scroll position before fetching
        if (listContainerRef.current) {
            scrollPositionRef.current = listContainerRef.current.scrollTop;
        }
        await fetchPopularGear();
        // Restore scroll position after fetching
        setTimeout(() => {
            if (listContainerRef.current) {
                listContainerRef.current.scrollTop = scrollPositionRef.current;
            }
        }, 0);
    };

    useEffect(() => {
        fetchPopularGearWithScroll();
        return () => { };
    }, []);

    const getStatusColor = (status: string) => {
        const normalized = normalizeGearStatus(status);
        switch (normalized) {
            case GearStatus.AVAILABLE:
                return 'bg-green-500/10 text-green-500';
            case GearStatus.CHECKED_OUT:
            case GearStatus.PARTIALLY_CHECKED_OUT:
                return 'bg-amber-500/10 text-amber-500';
            case GearStatus.PARTIALLY_AVAILABLE:
                return 'bg-green-500/10 text-green-500';
            case GearStatus.MAINTENANCE:
            case GearStatus.UNDER_REPAIR:
            case GearStatus.NEEDS_REPAIR:
                return 'bg-blue-500/10 text-blue-500';
            case GearStatus.RETIRED:
            case GearStatus.LOST:
                return 'bg-gray-500/10 text-gray-500';
            default:
                return 'bg-gray-500/10 text-gray-500';
        }
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
                    <div
                        ref={listContainerRef}
                        className="space-y-4 w-full overflow-x-auto"
                    >
                        {popularGear.map((gear) => (
                            <div
                                key={gear.gear_id}
                                className="flex flex-col sm:flex-row flex-wrap items-center gap-3 gap-y-2 p-3 rounded-lg bg-muted/30 min-w-0"
                            >
                                {gear.image_url ? (
                                    <Image src={gear.image_url} alt={gear.name} width={40} height={40} className="h-10 w-10 rounded object-cover flex-shrink-0" />
                                ) : (
                                    <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-500 flex-shrink-0">{gear.name[0]}</div>
                                )}
                                <div className="flex-1 min-w-0 w-full sm:w-auto">
                                    <h4 className="font-medium text-sm truncate max-w-full">{gear.name}</h4>
                                    <div className="flex flex-wrap items-center gap-2 mt-1 min-w-0">
                                        <Badge variant="outline" className={`text-xs ${getCategoryBadgeClass(gear.category)} truncate max-w-[100px]`}>
                                            {getCategoryIcon(gear.category, 12)}
                                            <span className="truncate">{gear.category}</span>
                                        </Badge>
                                        <span className="text-xs text-muted-foreground truncate">{gear.request_count} {gear.request_count === 1 ? 'checkout' : 'checkouts'}</span>
                                        {trendData[gear.gear_id] === 'up' && <TrendingUp className="h-4 w-4 text-green-500" aria-label="Trending Up" />}
                                        {trendData[gear.gear_id] === 'down' && <TrendingDown className="h-4 w-4 text-red-500" aria-label="Trending Down" />}
                                    </div>
                                </div>
                                <Badge className={getStatusColor(gear.status || "") + " truncate max-w-[90px]"}>{gear.status}</Badge>
                                <Link href={`/user/browse?gear=${gear.gear_id}`} className="w-full sm:w-auto"><Button size="sm" variant="outline" aria-label="View Details" className="w-full sm:w-auto max-w-[120px] truncate">View Details</Button></Link>
                                <Link href={`/user/request?gear=${gear.gear_id}`} className="w-full sm:w-auto"><Button size="sm" aria-label="Request Again" className="w-full sm:w-auto max-w-[120px] truncate">Request Again</Button></Link>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                        <div className="text-4xl mb-3">📊</div>
                        <h3 className="text-lg font-medium mb-2">No popular gear</h3>
                        <p className="text-sm text-muted-foreground mb-4 max-w-xs">No equipment requests have been made yet. Popularity data will appear here once users start making requests.</p>
                        <div className="flex justify-center mt-4">
                            <Link href="/user/browse"><Button>Browse Equipment</Button></Link>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 
