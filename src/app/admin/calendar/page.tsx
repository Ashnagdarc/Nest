"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, momentLocalizer, Event } from 'react-big-calendar';
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from '@/lib/supabase/client';
import moment from 'moment';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Box, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { logError as loggerError } from '@/lib/logger';

const localizer = momentLocalizer(moment);

interface CalendarEvent extends Event {
  resource?: {
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
  }
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

// Type predicate for string filtering
const isNonEmptyString = (value: unknown): value is string => {
    return typeof value === 'string' && value.length > 0;
};

export default function AdminCalendarPage() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [gearFilter, setGearFilter] = useState("__all__");
    const [userFilter, setUserFilter] = useState("__all__");
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [adminNotes, setAdminNotes] = useState("");
    const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
    const supabase = createClient();

    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        try {
            // Get current user for admin check
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            console.log('AdminCalendarPage: user', user, 'userError', userError);

            if (!user) throw new Error('Not authenticated');

            // Check if user is admin
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role, full_name, email')
                .eq('id', user.id)
                .single();

            console.log('AdminCalendarPage: profile', profile, 'profileError', profileError);

            if (!profile || profile.role !== 'Admin') {
                throw new Error('Not authorized');
            }

            // Fetch calendar bookings
            const { data: bookingsData, error: bookingsError } = await supabase
                .from('gear_calendar_bookings_with_profiles')
                .select('*')
                .order('start_date');

            console.log('AdminCalendarPage: bookingsData', bookingsData, 'bookingsError', bookingsError);

            if (bookingsError) {
                throw bookingsError;
            }

            // Process bookings into calendar events
            const calendarEvents = (bookingsData || []).map((booking: any): CalendarEvent => ({
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
            toast({
                title: "Error",
                description: "Failed to load calendar data. Please refresh the page.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchEvents();

        // Set up real-time subscription
        const channel = supabase
            .channel('admin-calendar-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'gear_calendar_bookings'
            }, () => {
                fetchEvents();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, fetchEvents]);

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
        return events.filter(e => {
            const gearMatch = gearFilter === "__all__" || e.resource.gearName === gearFilter;
            const userMatch = userFilter === "__all__" || e.resource.userName === userFilter;
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
                .eq('id', selectedEvent.user_id)
                .single();
            // Fetch gear name
            const { data: gearData } = await supabase
                .from('gears')
                .select('name')
                .eq('id', selectedEvent.resource.gear_id)
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
                        bookingDate: selectedEvent.resource.date,
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
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
            <Card>
                <CardHeader>
                    <CardTitle>Gear Reservation Calendar</CardTitle>
                    <CardDescription>
                        Manage and approve gear reservations. Click on a booking to view details and take action.
                    </CardDescription>
                    <div className="flex flex-wrap gap-4 mt-4">
                        <div className="flex gap-2">
                            <Button
                                variant={viewMode === 'month' ? 'default' : 'outline'}
                                onClick={() => setViewMode('month')}
                            >
                                Month
                            </Button>
                            <Button
                                variant={viewMode === 'week' ? 'default' : 'outline'}
                                onClick={() => setViewMode('week')}
                            >
                                Week
                            </Button>
                            <Button
                                variant={viewMode === 'day' ? 'default' : 'outline'}
                                onClick={() => setViewMode('day')}
                            >
                                Day
                            </Button>
                        </div>
                        <Select value={gearFilter} onValueChange={setGearFilter}>
                            <SelectTrigger className="w-[200px]">
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
                            <SelectTrigger className="w-[200px]">
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
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                            <p>Loading calendar data...</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-wrap gap-2 mb-4">
                                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                                    <Box className="h-3 w-3 text-blue-500 mr-1" /> Approved
                                </Badge>
                                <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
                                    <Box className="h-3 w-3 text-gray-500 mr-1" /> Pending
                                </Badge>
                                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                                    <Box className="h-3 w-3 text-red-500 mr-1" /> Rejected
                                </Badge>
                            </div>

                            <div className="h-[600px] bg-white dark:bg-gray-900 rounded-md border border-input">
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
                                        `${event.title}\nStatus: ${event.resource?.status}\n${event.resource?.reason ? `Reason: ${event.resource.reason}` : ''}`
                                    }
                                    style={{ height: 600 }}
                                />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Booking Details Dialog */}
            <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Booking Details</DialogTitle>
                        <DialogDescription>
                            Review and manage this gear reservation request
                        </DialogDescription>
                    </DialogHeader>

                    {selectedEvent && (
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-medium">Gear</h4>
                                <p>{selectedEvent.resource.gearName}</p>
                                <p className="text-sm text-muted-foreground">{selectedEvent.resource.gearCategory}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium">User</h4>
                                <p>{selectedEvent.resource.userName}</p>
                                <p className="text-sm text-muted-foreground">{selectedEvent.resource.userEmail}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium">Status</h4>
                                <Badge variant="outline" className={
                                    selectedEvent.resource.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                                        selectedEvent.resource.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                }>
                                    {selectedEvent.resource.status}
                                </Badge>
                                {selectedEvent.resource.approvedBy && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        by {selectedEvent.resource.approvedBy} at {format(new Date(selectedEvent.resource.approvedAt), 'PPp')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <h4 className="text-sm font-medium">Dates</h4>
                                <p>From: {format(selectedEvent.start, 'PPP pp')}</p>
                                <p>To: {format(selectedEvent.end, 'PPP pp')}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium">Reason</h4>
                                <p>{selectedEvent.resource.reason || 'No reason provided'}</p>
                            </div>
                            {selectedEvent.resource.notes && (
                                <div>
                                    <h4 className="text-sm font-medium">Admin Notes</h4>
                                    <p>{selectedEvent.resource.notes}</p>
                                </div>
                            )}
                            {selectedEvent.resource.status === 'Pending' && (
                                <div>
                                    <h4 className="text-sm font-medium">Add Notes (Optional)</h4>
                                    <Textarea
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        placeholder="Add any notes about this booking"
                                        className="mt-2"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="mt-6">
                        {selectedEvent?.resource.status === 'Pending' && (
                            <div className="flex gap-2 w-full">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => handleBookingAction('Rejected')}
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={() => handleBookingAction('Approved')}
                                >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Approve
                                </Button>
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
} 