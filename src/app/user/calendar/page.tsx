"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Calendar, momentLocalizer, Views, SlotInfo } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from '@/lib/supabase/client';
import moment from "moment";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Calendar as CalendarIcon2, CheckCircle, XCircle, Info, Box, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const localizer = momentLocalizer(moment);

// Custom event styling
const eventStyleGetter = (event: any) => {
    const isAvailable = event.resource?.status === 'Available';
    const isOwn = event.resource?.isOwnBooking;

    let style: React.CSSProperties = {
        backgroundColor: isAvailable ? '#10b981' : (isOwn ? '#3b82f6' : '#6b7280'),
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.8em'
    };

    return {
        style
    };
};

// Custom toolbar to show current date range and navigation
const CustomToolbar = ({ label, onNavigate, onView }: any) => {
    return (
        <div className="flex flex-wrap items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
                <Button
                    variant="outline" size="sm"
                    onClick={() => onNavigate('TODAY')}
                >
                    Today
                </Button>
                <Button
                    variant="outline" size="sm"
                    onClick={() => onNavigate('PREV')}
                >
                    Back
                </Button>
                <Button
                    variant="outline" size="sm"
                    onClick={() => onNavigate('NEXT')}
                >
                    Next
                </Button>
            </div>
            <h2 className="text-lg font-semibold">{label}</h2>
            <div className="flex space-x-2">
                <Button
                    variant={Views.MONTH === 'month' ? "default" : "outline"}
                    size="sm"
                    onClick={() => onView(Views.MONTH)}
                >
                    Month
                </Button>
                <Button
                    variant={Views.WEEK === 'week' ? "default" : "outline"}
                    size="sm"
                    onClick={() => onView(Views.WEEK)}
                >
                    Week
                </Button>
                <Button
                    variant={Views.DAY === 'day' ? "default" : "outline"}
                    size="sm"
                    onClick={() => onView(Views.DAY)}
                >
                    Day
                </Button>
            </div>
        </div>
    );
};

export default function UserCalendarPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [availableGear, setAvailableGear] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
    const [selectedGear, setSelectedGear] = useState<string>("");
    const [bookingReason, setBookingReason] = useState<string>("");
    const [selectedDates, setSelectedDates] = useState<{
        start: Date | undefined;
        end: Date | undefined;
    }>({
        start: undefined,
        end: undefined,
    });
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();

    // Fetch all events (bookings) and available gear
    const fetchEvents = useCallback(async () => {
        setIsLoading(true);

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
            }

            // Fetch approved and checked out gear requests
            const { data: requestsData, error: requestsError } = await supabase
                .from('requests')
                .select(`
                    id, 
                    created_at,
                    status,
                    checkout_date,
                    due_date,
                    user_id,
                    reason,
                    gears (id, name, category)
                `)
                .in('status', ['Approved', 'Checked Out'])
                .not('checkout_date', 'is', null)
                .not('due_date', 'is', null);

            if (requestsError) {
                console.error("Error fetching requests:", requestsError);
                return;
            }

            // Fetch available gear
            const { data: gearData, error: gearError } = await supabase
                .from('gears')
                .select('id, name, category, status')
                .eq('status', 'Available');

            if (gearError) {
                console.error("Error fetching available gear:", gearError);
                return;
            }

            setAvailableGear(gearData || []);

            // Process existing bookings into events
            const bookingEvents = (requestsData || []).map((req: any) => {
                const isOwnBooking = req.user_id === currentUserId;
                return {
                    id: `booking-${req.id}`,
                    title: `${req.gears?.name || 'Gear'} ${isOwnBooking ? '(Your Booking)' : ''}`,
                    start: new Date(req.checkout_date),
                    end: new Date(req.due_date),
                    allDay: false,
                    resource: {
                        gearId: req.gears?.id,
                        gearName: req.gears?.name,
                        requestId: req.id,
                        reason: req.reason,
                        status: req.status,
                        isOwnBooking
                    }
                };
            });

            setEvents(bookingEvents);
        } catch (error) {
            console.error("Error fetching calendar data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [supabase, currentUserId]);

    useEffect(() => {
        fetchEvents();

        // Set up real-time subscription to booking changes
        const channel = supabase
            .channel('calendar-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'requests'
            }, () => {
                // Refetch data when changes occur
                fetchEvents();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, fetchEvents]);

    // Handle slot selection (clicking on calendar)
    const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
        // Reset form values
        setSelectedSlot(slotInfo);
        setSelectedGear("");
        setBookingReason("");
        setSelectedDates({
            start: slotInfo.start,
            end: slotInfo.end
        });
    }, []);

    // Handle showing event details when clicked
    const handleSelectEvent = useCallback((event: any) => {
        const isOwnBooking = event.resource?.isOwnBooking;

        toast({
            title: event.title,
            description: (
                <div className="mt-2">
                    <p><strong>Status:</strong> {event.resource?.status}</p>
                    <p><strong>From:</strong> {format(event.start, 'PPP')}</p>
                    <p><strong>To:</strong> {format(event.end, 'PPP')}</p>
                    {event.resource?.reason && (
                        <p><strong>Reason:</strong> {event.resource.reason}</p>
                    )}
                    {isOwnBooking && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => router.push(`/user/my-requests?id=${event.resource.requestId}`)}
                        >
                            View Details
                        </Button>
                    )}
                </div>
            ),
            duration: 5000,
        });
    }, [router]);

    // Submit booking request
    const handleBookingSubmit = async () => {
        if (!selectedGear || !selectedDates.start || !selectedDates.end || !bookingReason || !currentUserId) {
            toast({
                title: "Missing Information",
                description: "Please fill in all required fields.",
                variant: "destructive",
            });
            return;
        }

        try {
            // Create a new request record
            const { data, error } = await supabase
                .from('requests')
                .insert({
                    user_id: currentUserId,
                    gear_id: selectedGear,
                    checkout_date: selectedDates.start.toISOString(),
                    due_date: selectedDates.end.toISOString(),
                    status: 'Pending',
                    reason: bookingReason,
                });

            if (error) {
                throw error;
            }

            toast({
                title: "Booking Request Submitted",
                description: "Your gear reservation request has been submitted for approval.",
            });

            // Close dialog and refetch events
            setSelectedSlot(null);
            fetchEvents();

        } catch (error: any) {
            console.error("Error creating booking:", error);
            toast({
                title: "Booking Failed",
                description: error.message || "Could not create booking. Please try again.",
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
                        View existing reservations and make new booking requests. Click on a date to book gear.
                    </CardDescription>
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
                                    <Box className="h-3 w-3 text-blue-500 mr-1" /> Your Bookings
                                </Badge>
                                <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
                                    <Box className="h-3 w-3 text-gray-500 mr-1" /> Other Bookings
                                </Badge>
                                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                                    <Box className="h-3 w-3 text-green-500 mr-1" /> Available Gear
                                </Badge>
                            </div>

                            <div className="h-[600px] bg-white dark:bg-gray-900 rounded-md border border-input">
                                <Calendar
                                    localizer={localizer}
                                    events={events}
                                    startAccessor="start"
                                    endAccessor="end"
                                    titleAccessor="title"
                                    selectable
                                    onSelectSlot={handleSelectSlot}
                                    onSelectEvent={handleSelectEvent}
                                    views={[Views.MONTH, Views.WEEK, Views.DAY]}
                                    defaultView={Views.MONTH}
                                    popup
                                    tooltipAccessor={(event: any) => `${event.title}\nFrom: ${format(event.start, 'PPP')}\nTo: ${format(event.end, 'PPP')}`}
                                    style={{ height: 600 }}
                                    eventPropGetter={eventStyleGetter}
                                    components={{
                                        toolbar: CustomToolbar
                                    }}
                                />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Booking Dialog */}
            <Dialog open={!!selectedSlot} onOpenChange={(open) => !open && setSelectedSlot(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Book Gear</DialogTitle>
                        <DialogDescription>
                            Create a new gear reservation request. Admin approval is required.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="gear" className="text-right text-sm">
                                Gear:
                            </label>
                            <div className="col-span-3">
                                <Select value={selectedGear} onValueChange={setSelectedGear}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select gear to book" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableGear.map((gear) => (
                                            <SelectItem key={gear.id} value={gear.id}>
                                                {gear.name} ({gear.category})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm">
                                Date Range:
                            </label>
                            <div className="col-span-3 flex items-center gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-[240px] justify-start text-left font-normal",
                                                !selectedDates.start && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {selectedDates.start ? format(selectedDates.start, "PPP") : "Select start date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <CalendarComponent
                                            mode="single"
                                            selected={selectedDates.start}
                                            onSelect={(date) => setSelectedDates({ ...selectedDates, start: date })}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <span>to</span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-[240px] justify-start text-left font-normal",
                                                !selectedDates.end && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {selectedDates.end ? format(selectedDates.end, "PPP") : "Select end date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <CalendarComponent
                                            mode="single"
                                            selected={selectedDates.end}
                                            onSelect={(date) => setSelectedDates({ ...selectedDates, end: date })}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="reason" className="text-right text-sm">
                                Reason:
                            </label>
                            <div className="col-span-3">
                                <Textarea
                                    id="reason"
                                    value={bookingReason}
                                    onChange={(e) => setBookingReason(e.target.value)}
                                    placeholder="Briefly describe why you need this gear"
                                    className="resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedSlot(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleBookingSubmit}>
                            Submit Request
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
} 