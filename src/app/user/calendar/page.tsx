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
import { logError as loggerError, logInfo as loggerInfo } from '@/lib/logger';
import { Checkbox } from "@/components/ui/checkbox";
import ReactSelect, { MultiValue } from "react-select";

const localizer = momentLocalizer(moment);

interface CalendarBooking {
    id: string;
    gear_id: string;
    user_id: string;
    title: string;
    start_date: string;
    end_date: string;
    status: string;
    reason: string;
    notes?: string;
    is_all_day: boolean;
    color?: string;
}

interface Gear {
    id: string;
    name: string;
    category: string;
    status: string;
}

interface BookingDates {
    start: Date | undefined;
    end: Date | undefined;
}

interface GearOption {
    value: string;
    label: string;
}

// Custom event styling with better visual feedback
const eventStyleGetter = (event: any) => {
    const status = event.resource?.status?.toLowerCase() || '';
    const isOwnBooking = event.resource?.isOwnBooking;

    let style: React.CSSProperties = {
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.85em',
        padding: '4px 8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        height: '100%'
    };

    if (event.resource?.color) {
        style.backgroundColor = event.resource.color;
    } else {
        switch (status) {
            case 'approved':
                style.backgroundColor = '#3b82f6';
                style.boxShadow = '0 2px 4px rgba(59,130,246,0.2)';
                break;
            case 'pending':
                style.backgroundColor = '#6b7280';
                style.boxShadow = '0 2px 4px rgba(107,114,128,0.2)';
                break;
            case 'rejected':
                style.backgroundColor = '#ef4444';
                style.boxShadow = '0 2px 4px rgba(239,68,68,0.2)';
                break;
            default:
                style.backgroundColor = isOwnBooking ? '#3b82f6' : '#6b7280';
        }
    }

    if (isOwnBooking) {
        style.border = '2px solid rgba(255,255,255,0.5)';
    }

    return { style };
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
    const [selectedGears, setSelectedGears] = useState<string[]>([]);
    const [availableGear, setAvailableGear] = useState<Gear[]>([]);
    const [selectedGearOptions, setSelectedGearOptions] = useState<GearOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
    const [bookingReason, setBookingReason] = useState<string>("");
    const [selectedDates, setSelectedDates] = useState<BookingDates>({
        start: undefined,
        end: undefined,
    });
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
    const [selectedEvent, setSelectedEvent] = useState<any>(null);

    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();

    // Fetch all events (bookings) and available gear
    const fetchEvents = useCallback(async () => {
        setIsLoading(true);

        try {
            // Get current user and check role
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                console.log("User role:", profile?.role);
                setCurrentUserId(user.id);
            }

            // Fetch available gear first
            const { data: gearData, error: gearError } = await supabase
                .from('gears')
                .select('id, name, category, status')
                .eq('status', 'Available')
                .order('name');

            if (gearError) {
                console.error("Error fetching gear:", gearError.message);
                throw new Error(`Failed to fetch gear: ${gearError.message}`);
            }

            console.log("Fetched available gear:", gearData);
            setAvailableGear(gearData || []);

            // Then fetch calendar bookings
            const { data: bookingsData, error: bookingsError } = await supabase
                .from('gear_calendar_bookings_with_profiles')
                .select('*')
                .order('start_date');

            if (bookingsError) {
                loggerError(bookingsError, 'fetchEvents', {
                    userId: currentUserId,
                    error: bookingsError.message,
                    hint: bookingsError.hint,
                    details: bookingsError.details
                });
                console.error("Error fetching bookings:", bookingsError);
                throw bookingsError;
            }

            loggerInfo('Bookings fetched successfully', 'fetchEvents', {
                count: bookingsData?.length || 0,
                userId: currentUserId
            });

            // Process bookings into events
            const calendarEvents = (bookingsData || []).map((booking: any) => {
                const isOwnBooking = booking.user_id === currentUserId;
                return {
                    id: booking.id,
                    title: `${booking.gear_name || 'Gear'} ${isOwnBooking ? '(Your Booking)' : ''}`,
                    start: new Date(booking.start_date),
                    end: new Date(booking.end_date),
                    allDay: booking.is_all_day,
                    resource: {
                        gearId: booking.gear_id,
                        gearName: booking.gear_name,
                        gearCategory: booking.gear_category,
                        userId: booking.user_id,
                        userName: booking.user_full_name,
                        userEmail: booking.user_email,
                        userRole: booking.user_role,
                        status: booking.status,
                        reason: booking.reason,
                        notes: booking.notes,
                        color: booking.color,
                        isOwnBooking,
                        approvedBy: booking.approver_full_name,
                        approvedAt: booking.approved_at
                    }
                };
            });

            setEvents(calendarEvents);
        } catch (error) {
            console.error("Error fetching calendar data:", error);
            loggerError(error, 'fetchEvents', { userId: currentUserId });
        } finally {
            setIsLoading(false);
        }
    }, [supabase, currentUserId]);

    useEffect(() => {
        fetchEvents();

        // Set up real-time subscription
        const channel = supabase
            .channel('calendar-changes')
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

    // Handle slot selection (clicking on calendar)
    const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
        console.log("Calendar slot selected:", slotInfo);
        console.log("Current available gear:", availableGear);
        setSelectedSlot(slotInfo);
        setSelectedGears([]);
        setBookingReason("");
        setSelectedDates({
            start: slotInfo.start,
            end: slotInfo.end
        });
    }, [availableGear]);

    // Handle showing event details when clicked
    const handleSelectEvent = useCallback((event: any) => {
        setSelectedEvent(event);
    }, []);

    // Handle gear selection/deselection
    const handleGearSelection = (gearId: string) => {
        setSelectedGears(prev => {
            if (prev.includes(gearId)) {
                return prev.filter(id => id !== gearId);
            }
            return [...prev, gearId];
        });
    };

    // Submit booking request
    const handleBookingSubmit = async () => {
        if (selectedGears.length === 0 || !selectedDates.start || !selectedDates.end || !bookingReason || !currentUserId) {
            toast({
                title: "Missing Information",
                description: "Please select at least one gear and fill in all required fields.",
                variant: "destructive",
            });
            return;
        }

        // Store validated dates to avoid TypeScript errors
        const startDate = selectedDates.start;
        const endDate = selectedDates.end;

        // Validate dates
        if (endDate < startDate) {
            toast({
                title: "Invalid Dates",
                description: "End date must be after start date.",
                variant: "destructive",
            });
            return;
        }

        try {
            // Check for booking conflicts for each gear
            for (const gearId of selectedGears) {
                const { data: hasConflict } = await supabase
                    .rpc('check_gear_booking_conflict', {
                        p_gear_id: gearId,
                        p_start_date: startDate.toISOString(),
                        p_end_date: endDate.toISOString()
                    });

                if (hasConflict) {
                    const conflictingGear = availableGear.find(g => g.id === gearId);
                    toast({
                        title: "Booking Conflict",
                        description: `${conflictingGear?.name || 'Selected gear'} is already booked for the selected time period.`,
                        variant: "destructive",
                    });
                    return;
                }
            }

            // Create bookings for each selected gear
            const bookingPromises: Promise<any>[] = selectedGears.map(async (gearId: string) => {
                const gear = availableGear.find(g => g.id === gearId);
                return supabase
                    .from('gear_calendar_bookings')
                    .insert([{
                        gear_id: gearId,
                        user_id: currentUserId,
                        title: `${gear?.name || 'Gear'} Booking`,
                        start_date: startDate.toISOString(),
                        end_date: endDate.toISOString(),
                        status: 'Pending',
                        reason: bookingReason,
                        is_all_day: false,
                        color: '#6b7280' // Default pending color
                    }])
                    .select();
            });

            await Promise.all(bookingPromises);

            toast({
                title: "Booking Requests Submitted",
                description: `Your reservation requests for ${selectedGears.length} gear(s) have been submitted for approval.`,
            });

            // Close dialog and refetch events
            setSelectedSlot(null);
            setSelectedGears([]);
            fetchEvents();

        } catch (error: any) {
            console.error("Error creating bookings:", error);
            toast({
                title: "Booking Failed",
                description: error.message || "Could not create bookings. Please try again.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">Gear Reservation Calendar</CardTitle>
                    <CardDescription className="text-lg">
                        View existing reservations and make new booking requests. Click on a date to book gear.
                    </CardDescription>
                    <div className="flex flex-wrap gap-2 mt-4">
                        <Button
                            variant={viewMode === 'month' ? 'default' : 'outline'}
                            onClick={() => setViewMode('month')}
                            className="min-w-[100px]"
                        >
                            Month
                        </Button>
                        <Button
                            variant={viewMode === 'week' ? 'default' : 'outline'}
                            onClick={() => setViewMode('week')}
                            className="min-w-[100px]"
                        >
                            Week
                        </Button>
                        <Button
                            variant={viewMode === 'day' ? 'default' : 'outline'}
                            onClick={() => setViewMode('day')}
                            className="min-w-[100px]"
                        >
                            Day
                        </Button>
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
                                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 py-2">
                                    <Box className="h-3 w-3 text-blue-500 mr-1" /> Your Bookings
                                </Badge>
                                <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200 py-2">
                                    <Box className="h-3 w-3 text-gray-500 mr-1" /> Other Bookings
                                </Badge>
                                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 py-2">
                                    <Box className="h-3 w-3 text-green-500 mr-1" /> Available
                                </Badge>
                            </div>

                            <div className="h-[600px] bg-white dark:bg-gray-900 rounded-lg border border-input shadow-sm">
                                <Calendar
                                    localizer={localizer}
                                    events={events}
                                    startAccessor="start"
                                    endAccessor="end"
                                    selectable
                                    onSelectSlot={handleSelectSlot}
                                    onSelectEvent={handleSelectEvent}
                                    view={viewMode}
                                    onView={(view) => setViewMode(view as 'month' | 'week' | 'day')}
                                    eventPropGetter={eventStyleGetter}
                                    popup
                                    tooltipAccessor={(event: any) =>
                                        `${event.title}\nStatus: ${event.resource.status}\n${event.resource.reason ? `Reason: ${event.resource.reason}` : ''}`
                                    }
                                    style={{ height: 600 }}
                                    className="rounded-lg"
                                />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Booking Dialog */}
            <Dialog open={!!selectedSlot} onOpenChange={(open) => !open && setSelectedSlot(null)}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Book Gear</DialogTitle>
                        <DialogDescription>
                            Create new gear reservation requests. Select multiple gear items if needed.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        <div className="space-y-4">
                            <label className="text-sm font-medium">
                                Available Gear
                            </label>
                            {availableGear.length > 0 ? (
                                <ReactSelect<GearOption, true>
                                    isMulti
                                    options={availableGear.map((gear: any) => ({
                                        value: gear.id,
                                        label: `${gear.name} (${gear.category})`
                                    }))}
                                    value={selectedGearOptions}
                                    onChange={(selected: MultiValue<GearOption>) => {
                                        const selectedArray = Array.from(selected);
                                        console.log("Selected gear:", selectedArray);
                                        setSelectedGearOptions(selectedArray);
                                        setSelectedGears(selectedArray.map(item => item.value));
                                    }}
                                    className="w-full"
                                    classNames={{
                                        control: (state) =>
                                            `!min-h-10 !bg-background !border-input !rounded-md ${state.isFocused ? '!border-ring !ring-2 !ring-ring !ring-offset-2' : ''
                                            }`,
                                        placeholder: () => '!text-muted-foreground',
                                        input: () => '!text-foreground',
                                        option: (state) =>
                                            `!bg-background !text-foreground ${state.isFocused ? '!bg-accent !text-accent-foreground' : ''
                                            }`,
                                        multiValue: () => '!bg-primary/10 !rounded-md',
                                        multiValueLabel: () => '!text-primary !text-sm',
                                        multiValueRemove: () => '!text-primary !hover:bg-destructive/20 !rounded-r-md',
                                        menu: () => '!bg-popover !border !border-input !rounded-md !shadow-md',
                                        menuList: () => '!p-1',
                                    }}
                                    theme={(theme) => ({
                                        ...theme,
                                        colors: {
                                            ...theme.colors,
                                            primary: 'var(--primary)',
                                            primary75: 'var(--primary-foreground)',
                                            primary50: 'var(--primary-foreground)',
                                            primary25: 'var(--primary-foreground)',
                                            danger: 'var(--destructive)',
                                            dangerLight: 'var(--destructive)',
                                        },
                                    })}
                                />
                            ) : (
                                <div className="text-sm text-gray-500">No gear available</div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-medium">
                                Date Range:
                            </label>
                            <div className="flex flex-col sm:flex-row items-center gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full sm:w-[240px] justify-start text-left font-normal",
                                                !selectedDates.start && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {selectedDates.start ? format(selectedDates.start, "PPP") : "Select start date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <CalendarComponent
                                            mode="single"
                                            selected={selectedDates.start}
                                            onSelect={(date) => setSelectedDates({ ...selectedDates, start: date })}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <span className="text-muted-foreground">to</span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full sm:w-[240px] justify-start text-left font-normal",
                                                !selectedDates.end && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {selectedDates.end ? format(selectedDates.end, "PPP") : "Select end date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
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

                        <div className="space-y-4">
                            <label htmlFor="reason" className="text-sm font-medium">
                                Reason for Booking:
                            </label>
                            <Textarea
                                id="reason"
                                value={bookingReason}
                                onChange={(e) => setBookingReason(e.target.value)}
                                placeholder="Briefly describe why you need this gear"
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedSlot(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleBookingSubmit}
                            disabled={selectedGears.length === 0}
                            className="min-w-[120px]"
                        >
                            Submit Request
                            {selectedGears.length > 0 && ` (${selectedGears.length})`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Event Details Dialog */}
            <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Booking Details</DialogTitle>
                    </DialogHeader>
                    {selectedEvent && (
                        <div className="space-y-6">
                            <div className="p-4 rounded-lg bg-muted/50">
                                <h4 className="text-sm font-medium mb-2">Gear Information</h4>
                                <p className="text-lg font-semibold">{selectedEvent.resource.gearName}</p>
                                <p className="text-sm text-muted-foreground">{selectedEvent.resource.gearCategory}</p>
                            </div>

                            {!selectedEvent.resource.isOwnBooking && (
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <h4 className="text-sm font-medium mb-2">Booked By</h4>
                                    <p className="text-lg font-semibold">{selectedEvent.resource.userName}</p>
                                </div>
                            )}

                            <div className="p-4 rounded-lg bg-muted/50">
                                <h4 className="text-sm font-medium mb-2">Status</h4>
                                <Badge variant="outline" className={cn(
                                    "text-base py-1.5",
                                    selectedEvent.resource.status === 'Approved' && "bg-blue-100 text-blue-800",
                                    selectedEvent.resource.status === 'Pending' && "bg-gray-100 text-gray-800",
                                    selectedEvent.resource.status === 'Rejected' && "bg-red-100 text-red-800"
                                )}>
                                    {selectedEvent.resource.status}
                                </Badge>
                            </div>

                            <div className="p-4 rounded-lg bg-muted/50">
                                <h4 className="text-sm font-medium mb-2">Booking Period</h4>
                                <div className="space-y-1">
                                    <p><strong>From:</strong> {format(selectedEvent.start, 'PPP pp')}</p>
                                    <p><strong>To:</strong> {format(selectedEvent.end, 'PPP pp')}</p>
                                </div>
                            </div>

                            {selectedEvent.resource.reason && (
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <h4 className="text-sm font-medium mb-2">Booking Reason</h4>
                                    <p className="text-muted-foreground">{selectedEvent.resource.reason}</p>
                                </div>
                            )}

                            {selectedEvent.resource.notes && (
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <h4 className="text-sm font-medium mb-2">Admin Notes</h4>
                                    <p className="text-muted-foreground">{selectedEvent.resource.notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
} 