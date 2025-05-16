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
    const supabase = createClient();

    // Fetch popular gear data
    const fetchPopularGear = async () => {
        try {
            setLoading(true);

            // Call the stored function
            const { data, error } = await supabase
                .rpc('get_popular_gears', { limit_count: 5 });

            if (error) {
                logger.error("Error calling get_popular_gears function:", error);
                throw error;
            }

            setPopularGear(data || []);
        } catch (error) {
            logger.error("Error fetching popular gear:", error);
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
    }, [supabase]);

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
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-md">Popular Equipment</CardTitle>
                <Link href="/user/browse">
                    <Button variant="ghost" size="sm" className="h-8 gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        <span className="text-xs">View All</span>
                    </Button>
                </Link>
            </CardHeader>
            <CardContent>
                {loading ? (
                    // Loading state with skeletons
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                <Skeleton className="w-12 h-12 rounded-md flex-shrink-0" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-3/4" />
                                    <div className="flex gap-2">
                                        <Skeleton className="h-3 w-16" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                                <Skeleton className="h-6 w-20 rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : popularGear.length > 0 ? (
                    // Gear items
                    <div className="space-y-3">
                        {popularGear.map((gear, index) => (
                            <motion.div
                                key={gear.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Link
                                    href={`/user/browse?id=${gear.id}`}
                                    className="flex items-center p-3 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex-shrink-0 w-12 h-12 relative rounded-md overflow-hidden mr-3 bg-muted">
                                        {gear.image_url ? (
                                            <img
                                                src={gear.image_url}
                                                alt={gear.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : renderImagePlaceholder(gear.category)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-sm truncate">{gear.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-xs">
                                                {gear.category}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {gear.checkout_count} {gear.checkout_count === 1 ? 'checkout' : 'checkouts'}
                                            </span>
                                        </div>
                                    </div>

                                    <Badge className={getStatusColor(gear.status)}>
                                        {gear.status}
                                    </Badge>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon="📊"
                        title="No popular gear"
                        description="Equipment popularity data will appear here"
                        actionLink="/user/browse"
                        actionText="Browse Equipment"
                    />
                )}
            </CardContent>
        </Card>
    );
} 