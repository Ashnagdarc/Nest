import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState, useRef } from "react";
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { logger } from "@/utils/logger";
import { TrendingUp, TrendingDown, Camera, Aperture, AirVent, Speaker, Laptop, Monitor, Cable, Lightbulb, Video, Puzzle, Car, RotateCcw, Mic, Box } from 'lucide-react';
import Image from 'next/image';
import { normalizeGearStatus, GearStatus } from '@/lib/constants/gear-status';

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

    // --- UI State Preservation ---
    const listContainerRef = useRef<HTMLDivElement | null>(null);
    const scrollPositionRef = useRef<number>(0);

    const categoryIcons: Record<string, any> = {
        camera: Camera,
        lens: Aperture,
        drone: AirVent,
        audio: Speaker,
        laptop: Laptop,
        monitor: Monitor,
        cables: Cable,
        lighting: Lightbulb,
        tripod: Video,
        accessory: Puzzle,
        cars: Car,
        gimbal: RotateCcw,
        microphone: Mic,
        computer: Monitor,
        other: Box,
    };
    const categoryColors: Record<string, string> = {
        camera: 'bg-blue-100 text-blue-800',
        lens: 'bg-purple-100 text-purple-800',
        drone: 'bg-cyan-100 text-cyan-800',
        audio: 'bg-green-100 text-green-800',
        laptop: 'bg-indigo-100 text-indigo-800',
        monitor: 'bg-teal-100 text-teal-800',
        cables: 'bg-yellow-100 text-yellow-800',
        lighting: 'bg-orange-100 text-orange-800',
        tripod: 'bg-pink-100 text-pink-800',
        accessory: 'bg-gray-100 text-gray-800',
        cars: 'bg-red-100 text-red-800',
        gimbal: 'bg-fuchsia-100 text-fuchsia-800',
        microphone: 'bg-emerald-100 text-emerald-800',
        computer: 'bg-slate-100 text-slate-800',
        other: 'bg-gray-200 text-gray-700',
    };
    const getCategoryIcon = (category?: string, size = 16) => {
        const key = (category || '').toLowerCase();
        const Icon = categoryIcons[key] || Box;
        return <Icon size={size} className="inline-block mr-1 align-text-bottom text-muted-foreground" />;
    };
    const getCategoryBadgeClass = (category?: string) => {
        const key = (category || '').toLowerCase();
        return categoryColors[key] || 'bg-gray-200 text-gray-700';
    };

    // Fetch popular gear data with a date range (last 7 days)
    const fetchPopularGear = async () => {
        try {
            setLoading(true);
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 7);

            // Use direct Supabase query
            const supabase = createClient();
            const { data: directData, error: directError } = await supabase.rpc('get_popular_gears', {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                limit_count: 10
            });

            if (directError) {
                throw directError;
            }

            if (Array.isArray(directData) && directData.length > 0) {
                // Fetch extra details for each gear (category, image_url, status)
                const gearIds = directData.map((g: any) => g.gear_id);
                const { data: gearDetails } = await supabase
                    .from('gears')
                    .select('id, category, image_url, status')
                    .in('id', gearIds);

                const detailsMap = new Map();
                gearDetails?.forEach((g: any) => detailsMap.set(g.id, g));

                setPopularGear(
                    directData.map((g: any) => ({
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
        } catch (error: any) {
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