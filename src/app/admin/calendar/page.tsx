"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from '@/lib/supabase/client';
import moment from 'moment';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Box, Loader2, CheckCircle2, XCircle, AlertCircle, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";


const localizer = momentLocalizer(moment);

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    allDay: boolean;
    resource: {
        status: string;
        gearId: string;
        gearName: string;
        gearCategory: string;
        userId: string;
        userName: string;
        userEmail: string;
        reason: string;
        notes?: string;
        color?: string;
        approvedAt?: string;
        approvedBy?: string;
    };
}

interface BookingData {
    id: string;
    gear_id: string;
    user_id: string;
    start_date: string;
    end_date: string;
    status: string;
    reason: string;
    notes?: string;
    is_all_day: boolean;
    color?: string;
    approved_at?: string;
    gear_name: string;
    gear_category: string;
    user_full_name: string;
    user_email: string;
    approver_full_name?: string;
}

// Custom event styling
const eventStyleGetter = (event: CalendarEvent) => {
    const status = event.resource?.status?.toLowerCase() || '';
    const style: React.CSSProperties = {
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.8em'
    };

    if (event.resource?.color) {
        style.backgroundColor = event.resource.color;
    } else {
        switch (status) {
            case 'approved':
                style.backgroundColor = '#3b82f6'; // blue
                break;
            case 'pending':
                style.backgroundColor = '#6b7280'; // gray
                break;
            case 'rejected':
                style.backgroundColor = '#ef4444'; // red
                break;
            default:
                style.backgroundColor = '#6b7280'; // gray
        }
    }

    return { style };
};



export default function AdminCalendarPage() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [gearFilter, setGearFilter] = useState("__all__");
    const [userFilter, setUserFilter] = useState("__all__");
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [adminNotes, setAdminNotes] = useState("");
    const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
    const [authError, setAuthError] = useState<string | null>(null);
    const supabase = useMemo(() => createClient(), []);

    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        try {
            // Get current user for admin check
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            // Admin calendar page user authentication

            if (userError || !user) {
                console.error('Authentication error:', userError);
                throw new Error('Not authenticated');
            }

            // Check if user is admin
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role, full_name, email')
                .eq('id', user.id)
                .single();

            // Admin calendar page profile loading

            if (profileError || !profile || profile.role !== 'Admin') {
                console.error('Authorization error:', profileError, 'Profile:', profile);
                throw new Error('Not authorized');
            }

            // Fetch calendar bookings using secure API endpoint
            const response = await fetch('/api/calendar/bookings?startDate=2020-01-01&endDate=2030-12-31', {
                credentials: 'include', // Include cookies for authentication
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API response error:', response.status, errorText);
                throw new Error(`Failed to fetch calendar bookings: ${response.status}`);
            }

            const bookingsResponse = await response.json();
            const bookingsData = bookingsResponse.bookings || [];

            // Admin calendar page bookings data loaded

            // Process bookings into calendar events
            const calendarEvents = bookingsData.map((booking: BookingData): CalendarEvent => ({
                id: booking.id,
                title: `${booking.gear_name || 'Gear'} - ${booking.user_full_name || 'Unknown User'}`,
                start: new Date(booking.start_date),
                end: new Date(booking.end_date),
                allDay: booking.is_all_day,
                resource: {
                    status: booking.status,
                    gearId: booking.gear_id,
                    gearName: booking.gear_name,
                    gearCategory: booking.gear_category,
                    userId: booking.user_id,
                    userName: booking.user_full_name,
                    userEmail: booking.user_email,
                    reason: booking.reason,
                    notes: booking.notes,
                    color: booking.color,
                    approvedAt: booking.approved_at,
                    approvedBy: booking.approver_full_name
                }
            }));

            setEvents(calendarEvents);
        } catch (error) {
            console.error('Error fetching calendar data (detailed):', error);

            if (error instanceof Error) {
                if (error.message.includes('Not authenticated')) {
                    setAuthError('Authentication failed. Please log in again.');
                } else if (error.message.includes('Not authorized')) {
                    setAuthError('Access denied. Admin privileges required.');
                } else {
                    setAuthError('Failed to load calendar data. Please refresh the page.');
                }
            } else {
                setAuthError('An unexpected error occurred.');
            }

            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to load calendar data. Please refresh the page.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        // Only fetch events if there's no auth error
        if (!authError) {
            fetchEvents();
        }

        // Set up real-time subscription (base table)
        const channel = supabase
            .channel('admin-calendar-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'gear_calendar_bookings'
            }, () => {
                if (!authError) {
                    fetchEvents();
                }
            })
            .subscribe();

        // Fallback: refetch on tab focus/visibility change and lightweight polling
        const onVisibility = () => {
            if (document.visibilityState === 'visible' && !authError) {
                fetchEvents();
            }
        };
        document.addEventListener('visibilitychange', onVisibility);
        const poll = setInterval(() => {
            if (!authError) {
                fetchEvents();
            }
        }, 30000);

        return () => {
            supabase.removeChannel(channel);
            document.removeEventListener('visibilitychange', onVisibility);
            clearInterval(poll);
        };
    }, [supabase, authError, fetchEvents]);

    // Get unique gear and user names for filters
    const uniqueGearNames = useMemo(() =>
        Array.from(new Set(
            events
                .map(e => e.resource.gearName)
                .filter((name): name is string => Boolean(name))
        )),
        [events]
    );

    const uniqueUserNames = useMemo(() =>
        Array.from(new Set(
            events
                .map(e => e.resource.userName)
                .filter((name): name is string => Boolean(name))
        )),
        [events]
    );

    // Filter events
    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            const gearMatch = gearFilter === "__all__" || event.resource.gearName === gearFilter;
            const userMatch = userFilter === "__all__" || event.resource.userName === userFilter;
            return gearMatch && userMatch;
        });
    }, [events, gearFilter, userFilter]);

    // Handle event click
    const handleSelectEvent = useCallback((event: CalendarEvent) => {
        setSelectedEvent(event);
        setAdminNotes("");
    }, []);

    // Handle booking approval/rejection
    const handleBookingAction = async (action: 'Approved' | 'Rejected') => {
        if (!selectedEvent) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Update booking status
            const { error: updateError } = await supabase
                .from('gear_calendar_bookings')
                .update({
                    status: action,
                    notes: adminNotes || undefined,
                    approved_at: action === 'Approved' ? new Date().toISOString() : null,
                    approved_by: action === 'Approved' ? user.id : null
                })
                .eq('id', selectedEvent.id);

            if (updateError) throw updateError;

            toast({
                title: `Booking ${action.toLowerCase()}`,
                description: `The booking has been ${action.toLowerCase()} successfully.`,
            });

            // Fetch admin profile
            const { data: adminProfile } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', user.id)
                .single();
            // Fetch user profile
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', selectedEvent.resource.userId)
                .single();
            // Fetch gear name
            const { data: gearData } = await supabase
                .from('gears')
                .select('name')
                .eq('id', selectedEvent.resource.gearId)
                .single();
            // Send Google Chat notification for booking action
            await fetch('/api/notifications/google-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: action === 'Approved' ? 'ADMIN_APPROVE_BOOKING' : 'ADMIN_REJECT_BOOKING',
                    payload: {
                        adminName: adminProfile?.full_name || 'Unknown Admin',
                        adminEmail: adminProfile?.email || 'Unknown Email',
                        userName: userProfile?.full_name || 'Unknown User',
                        userEmail: userProfile?.email || 'Unknown Email',
                        gearName: gearData?.name || 'Unknown Gear',
                        bookingDate: format(selectedEvent.start, 'PPP'),
                        notes: adminNotes,
                    }
                })
            });

            // Close dialog and refresh events
            setSelectedEvent(null);
            setAdminNotes("");
            fetchEvents();

        } catch (error) {
            console.error(`Error ${action.toLowerCase()} booking:`, error);
            toast({
                title: "Action Failed",
                description: `Failed to ${action.toLowerCase()} the booking. Please try again.`,
                variant: "destructive",
            });
        }
    };

    return (
        <div className="container mx-auto py-8 px-0 md:px-4 lg:px-6">
            <Card className="w-full max-w-full border-0 shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <CalendarIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">
                                Admin Reservation Calendar
                            </CardTitle>
                            <CardDescription className="text-base text-muted-foreground leading-relaxed mt-1">
                                Manage and approve gear reservations. Click on a booking to view details and take action.
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center sm:gap-4 mt-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2">
                            <Button
                                variant={viewMode === 'month' ? 'default' : 'outline'}
                                onClick={() => setViewMode('month')}
                                className="min-w-[90px] py-2 px-3 text-sm"
                            >
                                <CalendarIcon className="h-4 w-4 mr-2" />
                                Month
                            </Button>
                            <Button
                                variant={viewMode === 'week' ? 'default' : 'outline'}
                                onClick={() => setViewMode('week')}
                                className="min-w-[90px] py-2 px-3 text-sm"
                            >
                                <CalendarIcon className="h-4 w-4 mr-2" />
                                Week
                            </Button>
                            <Button
                                variant={viewMode === 'day' ? 'default' : 'outline'}
                                onClick={() => setViewMode('day')}
                                className="min-w-[90px] py-2 px-3 text-sm"
                            >
                                <CalendarIcon className="h-4 w-4 mr-2" />
                                Day
                            </Button>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2">
                            <Select value={gearFilter} onValueChange={setGearFilter}>
                                <SelectTrigger className="w-[180px] h-9 text-sm">
                                    <SelectValue placeholder="Filter by Gear" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">All Gear</SelectItem>
                                    {uniqueGearNames.map((name) => (
                                        <SelectItem key={name} value={name}>{name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={userFilter} onValueChange={setUserFilter}>
                                <SelectTrigger className="w-[180px] h-9 text-sm">
                                    <SelectValue placeholder="Filter by User" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">All Users</SelectItem>
                                    {uniqueUserNames.map((name) => (
                                        <SelectItem key={name} value={name}>{name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2 mt-4">
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 py-1 px-2 text-xs sm:text-sm">
                            <CheckCircle2 className="h-3 w-3 text-green-500 mr-1" /> Approved
                        </Badge>
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 py-1 px-2 text-xs sm:text-sm">
                            <AlertCircle className="h-3 w-3 text-amber-500 mr-1" /> Pending
                        </Badge>
                        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 py-1 px-2 text-xs sm:text-sm">
                            <XCircle className="h-3 w-3 text-red-500 mr-1" /> Rejected
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64 bg-muted/30 rounded-xl border border-dashed">
                            <div className="text-center">
                                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                                <h3 className="text-sm font-medium text-foreground mb-2">Loading Calendar</h3>
                                <p className="text-sm text-muted-foreground">Fetching reservation data...</p>
                            </div>
                        </div>
                    ) : authError ? (
                        <div className="flex items-center justify-center h-64 bg-muted/30 rounded-xl border border-dashed">
                            <div className="text-center max-w-md">
                                <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                                    <AlertCircle className="h-6 w-6 text-destructive" />
                                </div>
                                <h3 className="text-sm font-medium text-foreground mb-2">Authentication Error</h3>
                                <p className="text-sm text-muted-foreground mb-4">{authError}</p>
                                <div className="flex gap-2 justify-center">
                                    <Button
                                        onClick={() => {
                                            setAuthError(null);
                                            fetchEvents();
                                        }}
                                        variant="outline"
                                        size="sm"
                                    >
                                        Retry
                                    </Button>
                                    <Button
                                        onClick={() => window.location.href = '/login'}
                                        variant="default"
                                        size="sm"
                                    >
                                        Go to Login
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full max-w-full">
                            <div className="h-[400px] md:h-[600px] bg-background rounded-xl border shadow-sm overflow-hidden w-full max-w-full">
                                <Calendar
                                    localizer={localizer}
                                    events={filteredEvents}
                                    startAccessor="start"
                                    endAccessor="end"
                                    view={viewMode}
                                    onView={(view) => setViewMode(view as 'month' | 'week' | 'day')}
                                    onSelectEvent={handleSelectEvent}
                                    eventPropGetter={eventStyleGetter}
                                    popup
                                    tooltipAccessor={(event: CalendarEvent) =>
                                        `${event.title}\nStatus: ${event.resource.status}\n${event.resource.reason ? `Reason: ${event.resource.reason}` : ''}`
                                    }
                                    className="rounded-xl"
                                    components={{
                                        toolbar: () => null, // Hide default toolbar since we have custom one
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Enhanced Booking Details Dialog */}
            <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader className="flex-shrink-0 pb-4 border-b border-border/50">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <CalendarIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-semibold">
                                    Reservation Details
                                </DialogTitle>
                                <DialogDescription className="text-sm text-muted-foreground">
                                    Review and manage this gear reservation request
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {selectedEvent && (
                        <div className="flex-1 overflow-y-auto py-4 space-y-6">
                            {/* Equipment Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Box className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="text-sm font-semibold text-foreground">Equipment</h4>
                                </div>
                                <div className="pl-6 space-y-1">
                                    <p className="font-medium text-foreground">{selectedEvent.resource.gearName}</p>
                                    <p className="text-sm text-muted-foreground">{selectedEvent.resource.gearCategory}</p>
                                </div>
                            </div>

                            {/* User Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Box className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="text-sm font-semibold text-foreground">Requested By</h4>
                                </div>
                                <div className="pl-6 space-y-1">
                                    <p className="font-medium text-foreground">{selectedEvent.resource.userName}</p>
                                    <p className="text-sm text-muted-foreground">{selectedEvent.resource.userEmail}</p>
                                </div>
                            </div>

                            {/* Status Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="text-sm font-semibold text-foreground">Status</h4>
                                </div>
                                <div className="pl-6">
                                    <Badge variant="outline" className={
                                        selectedEvent.resource.status === 'Approved' ? 'bg-green-100 text-green-800 border-green-200' :
                                            selectedEvent.resource.status === 'Rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                                'bg-amber-100 text-amber-800 border-amber-200'
                                    }>
                                        {selectedEvent.resource.status === 'Approved' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                        {selectedEvent.resource.status === 'Rejected' && <XCircle className="h-3 w-3 mr-1" />}
                                        {selectedEvent.resource.status === 'Pending' && <AlertCircle className="h-3 w-3 mr-1" />}
                                        {selectedEvent.resource.status}
                                    </Badge>
                                    {selectedEvent.resource.approvedBy && selectedEvent.resource.approvedAt && (
                                        <p className="text-sm text-muted-foreground mt-2">
                                            Approved by {selectedEvent.resource.approvedBy} on {format(new Date(selectedEvent.resource.approvedAt), 'PPp')}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Dates Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="text-sm font-semibold text-foreground">Reservation Period</h4>
                                </div>
                                <div className="pl-6 bg-muted/30 rounded-lg p-3 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">Start:</span>
                                        <span className="text-sm">{format(selectedEvent.start, 'PPP p')}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">End:</span>
                                        <span className="text-sm">{format(selectedEvent.end, 'PPP p')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Reason Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="text-sm font-semibold text-foreground">Purpose</h4>
                                </div>
                                <div className="pl-6">
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {selectedEvent.resource.reason || 'No reason provided'}
                                    </p>
                                </div>
                            </div>

                            {/* Admin Notes Section */}
                            {selectedEvent.resource.notes && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Box className="h-4 w-4 text-muted-foreground" />
                                        <h4 className="text-sm font-semibold text-foreground">Admin Notes</h4>
                                    </div>
                                    <div className="pl-6 bg-muted/30 rounded-lg p-3">
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {selectedEvent.resource.notes}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Admin Actions Section */}
                            {selectedEvent.resource.status === 'Pending' && (
                                <div className="space-y-3 border-t pt-4">
                                    <h4 className="text-sm font-semibold text-foreground">Admin Actions</h4>
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium">Admin Notes (Optional)</label>
                                        <Textarea
                                            value={adminNotes}
                                            onChange={(e) => setAdminNotes(e.target.value)}
                                            placeholder="Add any notes about this booking decision..."
                                            className="min-h-[80px] resize-none border-input/50 focus:border-primary/50 bg-background/50"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="flex-shrink-0 pt-4 border-t border-border/50 mt-6">
                        {selectedEvent?.resource.status === 'Pending' ? (
                            <div className="flex gap-3 w-full">
                                <Button
                                    variant="outline"
                                    className="flex-1 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
                                    onClick={() => handleBookingAction('Rejected')}
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject Reservation
                                </Button>
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleBookingAction('Approved')}
                                >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Approve Reservation
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setSelectedEvent(null)}
                            >
                                Close
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}