import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CheckSquare, Clock } from "lucide-react";
import Link from 'next/link';

interface BookingItem {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    user_id: string;
    gear_id: string;
    status: string;
    gears?: {
        name: string;
    };
    profiles?: {
        full_name: string;
    };
}

interface RequestItem {
    id: string;
    reason: string;
    created_at: string;
    user_id: string;
    profiles?: {
        full_name: string;
    } | null;
}

export function UnifiedNotificationsPanel() {
    const supabase = createClient();
    const [pendingBookings, setPendingBookings] = useState<BookingItem[]>([]);
    const [pendingRequests, setPendingRequests] = useState<RequestItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchNotifications() {
            setIsLoading(true);

            // REMOVED: Calendar booking functionality
            let bookings: BookingItem[] = [];

            // Fetch pending gear requests
            const { data: requestsData } = await supabase
                .from('gear_requests')
                .select(`
                    id, 
                    reason, 
                    created_at, 
                    user_id,
                    profiles!gear_requests_user_id_fkey(
                        full_name
                    )
                `)
                .eq('status', 'Pending')
                .order('created_at', { ascending: false });

            // Transform the data to match our interface
            const requests: RequestItem[] = (requestsData || []).map(item => ({
                id: item.id,
                reason: item.reason,
                created_at: item.created_at,
                user_id: item.user_id,
                profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
            }));

            setPendingBookings(bookings || []);
            setPendingRequests(requests || []);
            setIsLoading(false);
        }

        fetchNotifications();

        // Set up real-time subscriptions
        const bookingsChannel = supabase.channel('bookings_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                // REMOVED: gear_calendar_bookings table
                filter: 'status=eq.Pending'
            }, fetchNotifications)
            .subscribe();

        const requestsChannel = supabase.channel('requests_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'gear_requests',
                filter: 'status=eq.Pending'
            }, fetchNotifications)
            .subscribe();

        return () => {
            supabase.removeChannel(bookingsChannel);
            supabase.removeChannel(requestsChannel);
        };
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-semibold">Pending Approvals</CardTitle>
                <CardDescription>Gear requests that need your attention</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="requests">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="bookings" className="flex items-center gap-2" disabled>
                            <Calendar className="h-4 w-4" />
                            Calendar Bookings (Removed)
                        </TabsTrigger>
                        <TabsTrigger value="requests" className="flex items-center gap-2">
                            <CheckSquare className="h-4 w-4" />
                            Gear Requests
                            {pendingRequests.length > 0 && (
                                <Badge variant="secondary" className="ml-1">{pendingRequests.length}</Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="bookings" className="space-y-4 pt-3">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-6">
                                <Clock className="h-5 w-5 animate-spin mr-2" />
                                <span>Loading...</span>
                            </div>
                        ) : pendingBookings.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                                No pending calendar bookings
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingBookings.map((booking) => (
                                    <div key={booking.id} className="border rounded-lg p-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-medium">{booking.gears?.name || 'Gear'}</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    By {booking.profiles?.full_name || 'Unknown User'}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <Button asChild size="sm" variant="outline">
                                                <Link href={`/admin/calendar?booking=${booking.id}`}>
                                                    Review
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                <div className="text-center pt-2">
                                    <Button asChild variant="ghost" size="sm">
                                        <Link href="/admin/calendar">
                                            View All Calendar Bookings
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="requests" className="space-y-4 pt-3">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-6">
                                <Clock className="h-5 w-5 animate-spin mr-2" />
                                <span>Loading...</span>
                            </div>
                        ) : pendingRequests.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                                No pending gear requests
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingRequests.map((request) => (
                                    <div key={request.id} className="border rounded-lg p-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-medium">Gear Request</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    By {request.profiles?.full_name || 'Unknown User'}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Reason: {request.reason?.substring(0, 50)}{request.reason?.length > 50 ? '...' : ''}
                                                </p>
                                            </div>
                                            <Button asChild size="sm" variant="outline">
                                                <Link href={`/admin/manage-requests?request=${request.id}`}>
                                                    Review
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                <div className="text-center pt-2">
                                    <Button asChild variant="ghost" size="sm">
                                        <Link href="/admin/manage-requests">
                                            View All Gear Requests
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
