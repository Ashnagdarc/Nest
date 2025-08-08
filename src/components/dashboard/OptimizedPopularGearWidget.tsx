import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TrendingUp, TrendingDown, Camera, Aperture, AirVent, Speaker, Laptop, Monitor, Cable, Lightbulb, Video, Puzzle, Car, RotateCcw, Mic, Box } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from "@/components/ui/skeleton";

interface OptimizedPopularGearWidgetProps {
    popularGear: Array<{
        gear_id: string;
        name: string;
        full_name: string;
        request_count: number;
        category?: string;
        image_url?: string | null;
        status?: string;
    }>;
    gearDetails: Record<string, { name: string; category?: string; image_url?: string; status?: string }>;
    loading: boolean;
}

export function OptimizedPopularGearWidget({ popularGear, gearDetails, loading }: OptimizedPopularGearWidgetProps) {
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

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">Popular Equipment</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">Popular Equipment</CardTitle>
            </CardHeader>
            <CardContent>
                {popularGear.length > 0 ? (
                    <div className="space-y-4 w-full overflow-x-auto">
                        {popularGear.map((gear) => {
                            const details = gearDetails[gear.gear_id] || {};
                            const gearName = details.name || gear.name || 'Equipment';
                            const gearCategory = details.category || gear.category || '';
                            const gearStatus = details.status || gear.status || '';
                            const gearImageUrl = details.image_url || gear.image_url;

                            return (
                                <div
                                    key={gear.gear_id}
                                    className="flex flex-col sm:flex-row flex-wrap items-center gap-3 gap-y-2 p-3 rounded-lg bg-muted/30 min-w-0"
                                >
                                    {gearImageUrl ? (
                                        <Image src={gearImageUrl} alt={gearName} width={40} height={40} className="h-10 w-10 rounded object-cover flex-shrink-0" />
                                    ) : (
                                        <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-500 flex-shrink-0">
                                            {gearName[0]}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                                        <h4 className="font-medium text-sm truncate max-w-full">{gearName}</h4>
                                        <div className="flex flex-wrap items-center gap-2 mt-1 min-w-0">
                                            <Badge variant="outline" className={`text-xs ${getCategoryBadgeClass(gearCategory)} truncate max-w-[100px]`}>
                                                {getCategoryIcon(gearCategory, 12)}
                                                <span className="truncate">{gearCategory}</span>
                                            </Badge>
                                            <span className="text-xs text-muted-foreground truncate">
                                                {gear.request_count} {gear.request_count === 1 ? 'checkout' : 'checkouts'}
                                            </span>
                                        </div>
                                    </div>
                                    <Badge className={getStatusColor(gearStatus) + " truncate max-w-[90px]"}>
                                        {gearStatus}
                                    </Badge>
                                    <Link href={`/user/browse?gear=${gear.gear_id}`} className="w-full sm:w-auto">
                                        <Button size="sm" variant="outline" aria-label="View Details" className="w-full sm:w-auto max-w-[120px] truncate">
                                            View Details
                                        </Button>
                                    </Link>
                                    <Link href={`/user/request?gear=${gear.gear_id}`} className="w-full sm:w-auto">
                                        <Button size="sm" aria-label="Request Again" className="w-full sm:w-auto max-w-[120px] truncate">
                                            Request Again
                                        </Button>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                        <div className="text-4xl mb-3">📊</div>
                        <h3 className="text-lg font-medium mb-2">No popular gear</h3>
                        <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                            No equipment requests have been made yet. Popularity data will appear here once users start making requests.
                        </p>
                        <div className="flex justify-center mt-4">
                            <Link href="/user/browse">
                                <Button>Browse Equipment</Button>
                            </Link>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
