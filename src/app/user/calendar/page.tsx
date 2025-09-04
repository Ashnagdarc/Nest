"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Calendar, momentLocalizer, SlotInfo } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from '@/lib/supabase/client';
import moment from "moment";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2, CalendarDays, Clock, AlertCircle, Package } from "lucide-react";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { logError as loggerError, logInfo as loggerInfo } from '@/lib/logger';
import ReactSelect from "react-select";
import { useIsMobile } from '@/hooks/use-mobile';
import { apiGet } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

const localizer = momentLocalizer(moment);

interface BookingData {
    id: string;
    gear_id: string;
    user_id: string;
    gear_name?: string;
    gear_category?: string;
    start_date: string;
    end_date: string;
    status: string;
    reason: string;
    notes?: string;
    is_all_day: boolean;
    user_full_name?: string;
    user_email?: string;
    user_role?: string;
    color?: string;
    approver_full_name?: string;
    approved_at?: string;
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
    isDisabled?: boolean;
    conflict?: boolean;
    category?: string;
    availableQuantity?: number;
    totalQuantity?: number;
    gearId?: string; // Original gear ID for booking
    unitNumber?: number; // Unit number for multi-quantity items
}

interface EventResource {
    id?: string;
    status?: string;
    isOwnBooking?: boolean;
    color?: string;
    gearName?: string;
    gearCategory?: string;
    userName?: string;
    userEmail?: string;
    reason?: string;
    notes?: string;
    canCancel?: boolean;
    canApprove?: boolean;
    canReject?: boolean;
    approvedBy?: string;
    approvedAt?: string;
}

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    allDay: boolean;
    resource?: EventResource;
}

// Custom event styling with better visual feedback
const eventStyleGetter = (event: CalendarEvent) => {
    const status = event.resource?.status?.toLowerCase() || '';
    const isOwnBooking = event.resource?.isOwnBooking;

    const style: React.CSSProperties = {
        borderRadius: '8px',
        opacity: 1,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.85em',
        padding: '6px 10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        height: '100%',
        overflow: 'hidden'
    };

    if (event.resource?.color) {
        style.backgroundColor = event.resource.color;
    } else {
        switch (status) {
            case 'approved':
                style.backgroundColor = '#22c55e';
                style.boxShadow = '0 2px 4px rgba(34,197,94,0.2)';
                break;
            case 'pending':
                style.backgroundColor = '#f59e0b';
                style.boxShadow = '0 2px 4px rgba(245,158,11,0.2)';
                break;
            case 'rejected':
                style.backgroundColor = '#ef4444';
                style.boxShadow = '0 2px 4px rgba(239,68,68,0.2)';
                break;
            default:
                style.backgroundColor = '#6b7280';
                style.boxShadow = '0 2px 4px rgba(107,114,128,0.2)';
        }
    }

    // Add a highlight effect for the user's own bookings
    if (isOwnBooking) {
        style.border = '2px solid rgba(255,255,255,0.5)';
        style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    }

    return {
        style,
        className: 'hover:scale-[1.02] hover:shadow-md transition-all'
    };
};



export default function UserCalendarPage() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
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
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [availableGearOptions, setAvailableGearOptions] = useState<GearOption[]>([]);
    const [adminNotes, setAdminNotes] = useState<string>('');
    const [isApproving, setIsApproving] = useState<boolean>(false);
    const isMobile = useIsMobile();
    const [mobileSelectedDay, setMobileSelectedDay] = useState<Date>(new Date());

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
                setCurrentUserRole(profile?.role || null);
            }

            // Fetch available gear first
            const { data: gearData, error: gearError } = await apiGet<{ data: Gear[]; error: string | null }>(`/api/gears/available`);
            if (gearError) {
                console.error("Error fetching gear:", gearError);
                throw new Error(`Failed to fetch gear: ${gearError}`);
            }
            setAvailableGear(gearData || []);

            // Then fetch calendar bookings using secure API endpoint
            const response = await fetch('/api/calendar/bookings', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                loggerError(new Error(`API Error: ${response.status} - ${errorText}`), 'fetchEvents', {
                    userId: currentUserId,
                    status: response.status,
                    error: errorText
                });
                console.error("Error fetching bookings:", errorText);
                throw new Error(`Failed to fetch bookings: ${errorText}`);
            }

            const bookingsResponse = await response.json();
            const bookingsData = bookingsResponse.bookings || [];

            loggerInfo('Bookings fetched successfully', 'fetchEvents', {
                count: bookingsData?.length || 0,
                userId: currentUserId
            });

            // Process bookings into events
            const calendarEvents = bookingsData.map((booking: BookingData) => {
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

    // Handle slot selection - check for conflicts and show appropriate modal
    const handleSelectSlot = (slotInfo: SlotInfo) => {
        // Check if there are any existing reservations in this time slot
        const conflictingEvents = events.filter(event => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            const slotStart = new Date(slotInfo.start);
            const slotEnd = new Date(slotInfo.end);

            // Check for time overlap
            return (slotStart < eventEnd && slotEnd > eventStart);
        });

        if (conflictingEvents.length > 0) {
            // Show existing reservation modal
            setSelectedEvent(conflictingEvents[0]); // Show the first conflicting event
        } else {
            // Show booking creation modal
            setSelectedSlot(slotInfo);
        }
    };

    // Handle event selection - show reservation details
    const handleSelectEvent = (event: CalendarEvent) => {
        setSelectedEvent(event);
    };

    // Handle reservation cancellation
    const handleCancelReservation = async (bookingId: string) => {
        if (!currentUserId) return;

        setIsApproving(true);
        try {
            const response = await fetch(`/api/calendar/bookings/${bookingId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Failed to cancel reservation');
            }

            toast({
                title: "Reservation Cancelled",
                description: "Your reservation has been successfully cancelled."
            });

            // Refresh events to remove cancelled reservation
            await fetchEvents();

            // Close dialog
            setSelectedEvent(null);

        } catch (error) {
            console.error('Error cancelling reservation:', error);
            toast({
                title: "Error",
                description: "Failed to cancel reservation",
                variant: "destructive"
            });
        } finally {
            setIsApproving(false);
        }
    };

    // Handle booking approval (admin only)
    const handleApproveBooking = async (bookingId: string, approve: boolean) => {
        if (currentUserRole !== 'Admin') return;

        setIsApproving(true);
        try {
            const endpoint = approve
                ? '/api/calendar/bookings/approve'
                : '/api/calendar/bookings/approve';

            const method = approve ? 'POST' : 'PUT';

            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    booking_id: bookingId,
                    admin_notes: adminNotes
                })
            });

            if (!response.ok) {
                throw new Error('Failed to process booking');
            }

            const result = await response.json();

            toast({
                title: approve ? "Booking Approved" : "Booking Rejected",
                description: result.message
            });

            // Refresh events to show updated status
            await fetchEvents();

            // Close dialog and reset
            setSelectedEvent(null);
            setAdminNotes('');

        } catch (error) {
            console.error('Error processing booking:', error);
            toast({
                title: "Error",
                description: `Failed to ${approve ? 'approve' : 'reject'} booking`,
                variant: "destructive"
            });
        } finally {
            setIsApproving(false);
        }
    };

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
    }, [supabase]);




    // Handle booking submission
    const handleBookingSubmit = async () => {
        if (selectedGears.length === 0 || !selectedDates.start || !selectedDates.end || !bookingReason || !currentUserId) {
            toast({
                title: "Missing Information",
                description: "Please select at least one gear and fill in all required fields."
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
                description: "End date must be after start date."
            });
            return;
        }

        try {
            // Start loading state
            setIsLoading(true);

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
                        description: `${conflictingGear?.name || 'Selected gear'} is already booked for the selected time period.`
                    });
                    return;
                }
            }

            // Calculate duration in days
            const durationInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

            // Use the helper function to handle the reservation
            const { error: requestError } = await supabase
                .rpc('handle_gear_reservation', {
                    p_gear_ids: selectedGears,
                    p_user_id: currentUserId,
                    p_reason: bookingReason,
                    p_start_date: startDate.toISOString(),
                    p_end_date: endDate.toISOString(),
                    p_duration: `${durationInDays} days`
                });

            if (requestError) throw requestError;

            // Send email notification for reservation creation
            try {
                const response = await fetch('/api/notifications/reservation-created', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        gearIds: selectedGears,
                        startDate: startDate.toISOString(),
                        endDate: endDate.toISOString(),
                        reason: bookingReason
                    })
                });

                if (!response.ok) {
                    console.warn('Failed to send reservation creation email');
                }
            } catch (emailError) {
                console.warn('Error sending reservation creation email:', emailError);
            }

            toast({
                title: "Calendar Reservation Created",
                description: `Your reservation for ${selectedGears.length} gear(s) has been added to the calendar and is pending admin approval.`
            });

            // Reset form state
            setSelectedSlot(null);
            setSelectedGears([]);
            setSelectedGearOptions([]);
            setBookingReason("");

            // Refetch calendar data to show new bookings
            await fetchEvents();

            // Navigate to My Requests page so user can see their request
            router.push('/user/my-requests');
        } catch (error: any) {
            console.error("Error creating bookings:", error);
            loggerError(error, 'handleBookingSubmit', {
                userId: currentUserId,
                selectedGears,
                error: error.message
            });
            toast({
                title: "Booking Failed",
                description: error.message || "Could not create bookings. Please try again."
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Enhanced gear fetching with quantity display
    useEffect(() => {
        const fetchAvailableGear = async () => {
            try {
                const { data: gearList, error } = await supabase
                    .from('gears')
                    .select('id, name, category, status, quantity, available_quantity')
                    .gt('available_quantity', 0)
                    .order('category', { ascending: true })
                    .order('name', { ascending: true });

                if (error) {
                    console.error('Error fetching available gear:', error);
                    return;
                }

                // Create gear options - individual units for items with quantity > 1
                const gearOptions: GearOption[] = [];

                gearList.forEach((gear: any) => {
                    if (gear.quantity > 1 && gear.available_quantity > 0) {
                        // Create individual options for each available unit
                        for (let i = 1; i <= gear.available_quantity; i++) {
                            gearOptions.push({
                                value: `${gear.id}_${i}`, // Unique identifier for each unit
                                label: `${gear.name} #${i} (${gear.category})`,
                                isDisabled: false,
                                conflict: false,
                                category: gear.category,
                                availableQuantity: 1, // Each individual unit
                                totalQuantity: gear.quantity,
                                gearId: gear.id, // Original gear ID for booking
                                unitNumber: i
                            });
                        }
                    } else if (gear.available_quantity > 0) {
                        // Single item or single available unit
                        gearOptions.push({
                            value: gear.id,
                            label: `${gear.name} (${gear.category})`,
                            isDisabled: false,
                            conflict: false,
                            category: gear.category,
                            availableQuantity: gear.available_quantity,
                            totalQuantity: gear.quantity,
                            gearId: gear.id
                        });
                    }
                });

                setAvailableGear(gearList);
                setAvailableGearOptions(gearOptions);
            } catch (error) {
                console.error('Error in fetchAvailableGear:', error);
            }
        };

        fetchAvailableGear();
    }, []); // Fetch on component mount

    // Separate effect for conflict checking when dates are selected
    useEffect(() => {
        if (!selectedDates.start || !selectedDates.end || availableGearOptions.length === 0) return;

        const checkConflicts = async () => {
            try {
                const updatedOptions = await Promise.all(
                    availableGearOptions.map(async (option) => {
                        // Use the original gear ID for conflict checking
                        const gearIdForCheck = option.gearId || option.value;
                        const { data: hasConflict } = await supabase.rpc('check_gear_booking_conflict', {
                            p_gear_id: gearIdForCheck,
                            p_start_date: selectedDates.start!.toISOString(),
                            p_end_date: selectedDates.end!.toISOString()
                        });

                        return {
                            ...option,
                            isDisabled: !!hasConflict,
                            conflict: !!hasConflict,
                            label: hasConflict
                                ? `${option.label.split(' (')[0]} - Unavailable for selected dates`
                                : option.label // Keep original label
                        };
                    })
                );

                setAvailableGearOptions(updatedOptions);
            } catch (error) {
                console.error('Error checking conflicts:', error);
            }
        };

        checkConflicts();
    }, [selectedDates.start, selectedDates.end, availableGearOptions]);

    // Filter events for the selected day (mobile)
    const mobileDayEvents = events.filter(e => {
        if (!mobileSelectedDay) return false;
        const start = new Date(e.start);
        return (
            start.getFullYear() === mobileSelectedDay.getFullYear() &&
            start.getMonth() === mobileSelectedDay.getMonth() &&
            start.getDate() === mobileSelectedDay.getDate()
        );
    });

    return (
        <div className="container mx-auto py-8 px-0 md:px-4 lg:px-6">
            <Card className="w-full max-w-full border-0 shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <CalendarDays className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">
                                Equipment Calendar
                            </CardTitle>
                            <CardDescription className="text-base text-muted-foreground leading-relaxed mt-1">
                                View existing reservations and book equipment for your projects. Click any date to create a new booking.
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
                                <CalendarDays className="h-4 w-4 mr-2" />
                                Month
                            </Button>
                            <Button
                                variant={viewMode === 'week' ? 'default' : 'outline'}
                                onClick={() => setViewMode('week')}
                                className="min-w-[90px] py-2 px-3 text-sm"
                            >
                                <CalendarDays className="h-4 w-4 mr-2" />
                                Week
                            </Button>
                            <Button
                                variant={viewMode === 'day' ? 'default' : 'outline'}
                                onClick={() => setViewMode('day')}
                                className="min-w-[90px] py-2 px-3 text-sm"
                            >
                                <Clock className="h-4 w-4 mr-2" />
                                Day
                            </Button>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2">
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 py-1 px-2 text-xs sm:text-sm">
                                <Check className="h-3 w-3 text-green-500 mr-1" /> Approved
                            </Badge>
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 py-1 px-2 text-xs sm:text-sm">
                                <AlertCircle className="h-3 w-3 text-amber-500 mr-1" /> Pending
                            </Badge>
                            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 py-1 px-2 text-xs sm:text-sm">
                                <AlertCircle className="h-3 w-3 text-red-500 mr-1" /> Rejected
                            </Badge>
                        </div>
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
                                <p className="text-sm text-muted-foreground">Fetching your reservations and available equipment...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Mobile view: date picker + list */}
                            {isMobile ? (
                                <div className="flex flex-col gap-4 w-full max-w-full">
                                    <div className="flex items-center justify-between mb-2 w-full max-w-full">
                                        <CalendarComponent
                                            mode="single"
                                            selected={mobileSelectedDay}
                                            onSelect={d => { if (d) setMobileSelectedDay(d); }}
                                            className="rounded-md border w-full max-w-full"
                                        />
                                        <Button
                                            className="ml-2 px-3 py-2"
                                            onClick={() => setSelectedSlot({
                                                start: mobileSelectedDay,
                                                end: mobileSelectedDay,
                                                slots: mobileSelectedDay ? [mobileSelectedDay] : [],
                                                action: 'select',
                                                resourceId: undefined
                                            })}
                                        >
                                            +
                                        </Button>
                                    </div>
                                    <div className="space-y-3 w-full max-w-full">
                                        {mobileDayEvents.length === 0 ? (
                                            <div className="text-center text-muted-foreground py-8">No bookings for this day.</div>
                                        ) : (
                                            mobileDayEvents.map(event => (
                                                <Card key={event.id} className="w-full max-w-full bg-muted/30 border shadow-sm hover:shadow-md transition-shadow">
                                                    <CardContent className="p-4 flex flex-col gap-3 w-full max-w-full">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="font-semibold text-base text-foreground">{event.title}</span>
                                                            <Badge variant="outline" className={cn(
                                                                "text-xs font-medium",
                                                                event.resource.status === 'Approved' && 'bg-green-50 text-green-700 border-green-200',
                                                                event.resource.status === 'Pending' && 'bg-amber-50 text-amber-700 border-amber-200',
                                                                event.resource.status === 'Rejected' && 'bg-red-50 text-red-700 border-red-200'
                                                            )}>
                                                                {event.resource.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center text-sm text-muted-foreground">
                                                            <Clock className="h-4 w-4 mr-2 text-primary/60" />
                                                            {format(new Date(event.start), 'p')} - {format(new Date(event.end), 'p')}
                                                        </div>
                                                        {event.resource.reason && (
                                                            <div className="bg-muted/50 rounded-lg p-3 border">
                                                                <p className="text-sm text-muted-foreground leading-relaxed">{event.resource.reason}</p>
                                                            </div>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="self-end mt-2 h-8 px-3 text-xs font-medium hover:bg-primary/10 hover:text-primary"
                                                            onClick={() => setSelectedEvent(event)}
                                                        >
                                                            View Details
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : (
                                // Desktop: enhanced full calendar grid
                                <div className="w-full max-w-full">
                                    <div className="h-[400px] md:h-[600px] bg-background rounded-xl border shadow-sm overflow-hidden w-full max-w-full">
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
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Enhanced Booking Dialog */}
            <Dialog open={!!selectedSlot} onOpenChange={(open) => !open && setSelectedSlot(null)}>
                <DialogContent className="w-full max-w-[95vw] max-h-[90vh] overflow-y-auto p-0 sm:max-w-[700px]">
                    {/* Header with improved typography */}
                    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-6 py-4">
                        <DialogHeader className="space-y-1">
                            <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
                                Book Equipment
                            </DialogTitle>
                            <DialogDescription className="text-base text-muted-foreground leading-relaxed">
                                Reserve equipment for your project. Select multiple items and specify your requirements.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="px-6 py-6 space-y-8">
                        {/* Date Selection Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <CalendarDays className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">Booking Period</h3>
                                    <p className="text-sm text-muted-foreground">Select your start date</p>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-4 border">
                                <CalendarComponent
                                    mode="single"
                                    selected={selectedDates.start}
                                    onSelect={(date) => {
                                        if (date) {
                                            // Set end date to the same day by default (can be extended later)
                                            const endDate = new Date(date);
                                            endDate.setHours(23, 59, 59, 999); // End of the selected day
                                            setSelectedDates({ start: date, end: endDate });
                                        } else {
                                            setSelectedDates({ start: undefined, end: undefined });
                                        }
                                    }}
                                    className="rounded-lg w-full"
                                    classNames={{
                                        months: "flex w-full flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 justify-center",
                                        month: "space-y-4 w-full flex flex-col",
                                        caption: "flex justify-center pt-1 relative items-center",
                                        caption_label: "text-sm font-medium",
                                        nav: "space-x-1 flex items-center",
                                        nav_button: cn(
                                            "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
                                            "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100",
                                            "hover:bg-accent hover:text-accent-foreground",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        ),
                                        table: "w-full border-collapse space-y-1",
                                        head_row: "flex w-full",
                                        head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem] flex-1 text-center",
                                        row: "flex w-full mt-2",
                                        cell: "text-center text-sm p-0 relative flex-1 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                        day: cn(
                                            "inline-flex items-center justify-center rounded-md text-sm font-normal transition-colors",
                                            "h-9 w-full p-0",
                                            "hover:bg-accent hover:text-accent-foreground",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                            "data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:hover:bg-primary data-[selected]:hover:text-primary-foreground"
                                        ),
                                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                        day_today: "bg-accent text-accent-foreground font-semibold",
                                        day_outside: "text-muted-foreground opacity-50",
                                        day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
                                        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                                        day_hidden: "invisible",
                                    }}
                                />
                            </div>
                        </div>

                        {/* Enhanced Gear Selection Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Package className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">Available Equipment</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {availableGear.length > 0 ? `${availableGear.length} items available` : 'No equipment available'}
                                    </p>
                                </div>
                            </div>

                            {availableGear.length > 0 ? (
                                <div className="bg-muted/30 rounded-xl p-4 border space-y-4">
                                    {/* Enhanced Multi-Select with better styling */}
                                    <ReactSelect<GearOption, true>
                                        isMulti
                                        options={availableGearOptions}
                                        value={selectedGearOptions}
                                        onChange={(selected: MultiValue<GearOption>) => {
                                            const selectedArray = Array.from(selected);
                                            setSelectedGearOptions(selectedArray);
                                            // For individual units, use the original gear ID; for single items, use the value
                                            setSelectedGears(selectedArray.map(item => item.gearId || item.value));
                                        }}
                                        placeholder="Search and select equipment..."
                                        className="w-full"
                                        isOptionDisabled={(option) => !!option.isDisabled}
                                        formatOptionLabel={(option) => (
                                            <div className="flex items-center gap-3 py-1">
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    option.isDisabled ? "bg-red-400" : "bg-primary/60"
                                                )}></div>
                                                <div className="flex-1">
                                                    <span className={cn(
                                                        "font-medium text-sm block",
                                                        option.isDisabled && "opacity-50"
                                                    )}>
                                                        {option.label.split(' (')[0]}
                                                    </span>
                                                    <span className={cn(
                                                        "text-xs text-muted-foreground",
                                                        option.isDisabled && "opacity-50"
                                                    )}>
                                                        {option.unitNumber
                                                            ? `Individual unit • ${option.category}`
                                                            : option.availableQuantity && option.totalQuantity && option.availableQuantity > 1
                                                                ? `${option.availableQuantity} available • ${option.category}`
                                                                : option.category
                                                        }
                                                    </span>
                                                </div>
                                                {option.isDisabled && (
                                                    <Badge variant="secondary" className="ml-auto text-xs bg-red-50 text-red-700 border-red-200">
                                                        Unavailable
                                                    </Badge>
                                                )}
                                            </div>
                                        )}
                                        styles={{
                                            control: (provided, state) => ({
                                                ...provided,
                                                backgroundColor: 'hsl(var(--background))',
                                                borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                                                borderWidth: '1px',
                                                borderRadius: '0.75rem',
                                                boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--primary) / 0.2)' : 'none',
                                                minHeight: '44px',
                                                padding: '4px',
                                                fontSize: '14px',
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    borderColor: 'hsl(var(--primary) / 0.8)',
                                                }
                                            }),
                                            menu: (provided) => ({
                                                ...provided,
                                                backgroundColor: 'hsl(var(--popover))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '0.75rem',
                                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                                                padding: '4px',
                                                zIndex: 50,
                                            }),
                                            option: (provided, state) => ({
                                                ...provided,
                                                backgroundColor: state.isSelected
                                                    ? 'hsl(var(--primary))'
                                                    : state.isFocused
                                                        ? 'hsl(var(--accent))'
                                                        : 'transparent',
                                                color: state.isSelected
                                                    ? 'hsl(var(--primary-foreground))'
                                                    : 'hsl(var(--foreground))',
                                                borderRadius: '0.5rem',
                                                margin: '2px 0',
                                                cursor: state.isDisabled ? 'not-allowed' : 'pointer',
                                                padding: '8px 12px',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                            }),
                                            multiValue: (provided) => ({
                                                ...provided,
                                                backgroundColor: 'hsl(var(--primary) / 0.1)',
                                                borderRadius: '0.5rem',
                                                border: '1px solid hsl(var(--primary) / 0.2)',
                                                margin: '2px',
                                            }),
                                            multiValueLabel: (provided) => ({
                                                ...provided,
                                                color: 'hsl(var(--primary))',
                                                fontWeight: '500',
                                                fontSize: '13px',
                                                padding: '4px 8px',
                                            }),
                                            multiValueRemove: (provided) => ({
                                                ...provided,
                                                color: 'hsl(var(--primary))',
                                                borderRadius: '0 0.5rem 0.5rem 0',
                                                '&:hover': {
                                                    backgroundColor: 'hsl(var(--primary) / 0.2)',
                                                    color: 'hsl(var(--primary))',
                                                }
                                            }),
                                            placeholder: (provided) => ({
                                                ...provided,
                                                color: 'hsl(var(--muted-foreground))',
                                                fontSize: '14px',
                                            }),
                                            input: (provided) => ({
                                                ...provided,
                                                color: 'hsl(var(--foreground))',
                                            }),
                                        }}
                                    />

                                    {/* Selected Items Preview */}
                                    {selectedGearOptions.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-medium text-foreground">Selected Items ({selectedGearOptions.length})</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedGearOptions.map((option) => (
                                                    <Badge
                                                        key={option.value}
                                                        variant="secondary"
                                                        className="bg-primary/10 text-primary border-primary/20 px-3 py-1"
                                                    >
                                                        {option.label}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-muted/30 rounded-xl p-8 border border-dashed text-center">
                                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                        <AlertCircle className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <h4 className="text-sm font-medium text-foreground mb-2">No Equipment Available</h4>
                                    <p className="text-sm text-muted-foreground">
                                        All equipment is currently booked for this time period. Please try a different date.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Enhanced Booking Details Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Clock className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">Project Details</h3>
                                    <p className="text-sm text-muted-foreground">Tell us about your project</p>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-4 border">
                                <Textarea
                                    placeholder="Describe your project, shooting requirements, or specific needs for this equipment..."
                                    value={bookingReason}
                                    onChange={(e) => setBookingReason(e.target.value)}
                                    className="min-h-[100px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm leading-relaxed placeholder:text-muted-foreground/70"
                                />
                                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                                    <span className="text-xs text-muted-foreground">
                                        {bookingReason.length}/500 characters
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        Required field
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Footer */}
                    <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t px-6 py-4">
                        <DialogFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                            <Button
                                variant="outline"
                                className="w-full sm:w-auto px-6 h-11 font-medium"
                                onClick={() => setSelectedSlot(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleBookingSubmit}
                                disabled={selectedGears.length === 0 || !bookingReason.trim()}
                                className={cn(
                                    "w-full sm:w-auto px-8 h-11 font-medium shadow-sm",
                                    "bg-primary hover:bg-primary/90 text-primary-foreground",
                                    "disabled:opacity-50 disabled:cursor-not-allowed",
                                    "transition-all duration-200"
                                )}
                            >
                                {selectedGears.length > 0 ? (
                                    <span className="flex items-center gap-2">
                                        <Check className="h-4 w-4" />
                                        Submit Request ({selectedGears.length} {selectedGears.length === 1 ? 'item' : 'items'})
                                    </span>
                                ) : (
                                    'Submit Request'
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
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
                                <p className="text-lg font-semibold">{selectedEvent.resource?.gearName || 'Unknown Gear'}</p>
                                <p className="text-sm text-muted-foreground">{selectedEvent.resource?.gearCategory || 'Unknown Category'}</p>
                            </div>

                            {!selectedEvent.resource?.isOwnBooking && (
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <h4 className="text-sm font-medium mb-2">Booked By</h4>
                                    <p className="text-lg font-semibold">{selectedEvent.resource?.userName || 'Unknown User'}</p>
                                </div>
                            )}

                            <div className="p-4 rounded-lg bg-muted/50">
                                <h4 className="text-sm font-medium mb-2">Status</h4>
                                <Badge variant="outline" className={cn(
                                    "text-base py-1.5",
                                    selectedEvent.resource?.status === 'Approved' && "bg-green-100 text-green-800",
                                    selectedEvent.resource?.status === 'Pending' && "bg-amber-100 text-amber-800",
                                    selectedEvent.resource?.status === 'Rejected' && "bg-red-100 text-red-800"
                                )}>
                                    {selectedEvent.resource?.status || 'Unknown'}
                                </Badge>
                                {selectedEvent.resource?.approvedBy && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Approved by {selectedEvent.resource.approvedBy}
                                        {selectedEvent.resource.approvedAt && ` on ${format(new Date(selectedEvent.resource.approvedAt), 'PPp')}`}
                                    </p>
                                )}
                            </div>

                            <div className="p-4 rounded-lg bg-muted/50">
                                <h4 className="text-sm font-medium mb-2">Booking Period</h4>
                                <div className="space-y-1">
                                    <p className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        <span><strong>From:</strong> {format(selectedEvent.start, 'PPp')}</span>
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        <span><strong>To:</strong> {format(selectedEvent.end, 'PPp')}</span>
                                    </p>
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

                            {/* User Cancellation Controls */}
                            {selectedEvent.resource.isOwnBooking && selectedEvent.resource.status === 'Pending' && (
                                <div className="border-t pt-6 space-y-4">
                                    <h4 className="text-lg font-semibold">Your Reservation</h4>
                                    <p className="text-sm text-muted-foreground">
                                        This reservation is pending admin approval. You can cancel it if needed.
                                    </p>

                                    <Button
                                        onClick={() => handleCancelReservation(selectedEvent.id)}
                                        disabled={isApproving}
                                        variant="destructive"
                                        className="w-full"
                                    >
                                        {isApproving ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Cancelling...
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle className="mr-2 h-4 w-4" />
                                                Cancel Reservation
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}

                            {/* Admin Approval Controls */}
                            {currentUserRole === 'Admin' && selectedEvent.resource.status === 'Pending' && (
                                <div className="border-t pt-6 space-y-4">
                                    <h4 className="text-lg font-semibold">Admin Actions</h4>

                                    <div className="space-y-3">
                                        <label className="text-sm font-medium">Admin Notes (Optional)</label>
                                        <Textarea
                                            value={adminNotes}
                                            onChange={(e) => setAdminNotes(e.target.value)}
                                            placeholder="Add notes about this booking decision..."
                                            className="min-h-[80px]"
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <Button
                                            onClick={() => handleApproveBooking(selectedEvent.id, true)}
                                            disabled={isApproving}
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                        >
                                            {isApproving ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="mr-2 h-4 w-4" />
                                                    Approve Booking
                                                </>
                                            )}
                                        </Button>

                                        <Button
                                            onClick={() => handleApproveBooking(selectedEvent.id, false)}
                                            disabled={isApproving}
                                            variant="destructive"
                                            className="flex-1"
                                        >
                                            {isApproving ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <AlertCircle className="mr-2 h-4 w-4" />
                                                    Reject Booking
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Admin Cancellation for Any Reservation */}
                            {currentUserRole === 'Admin' && selectedEvent.resource.status === 'Pending' && !selectedEvent.resource.isOwnBooking && (
                                <div className="border-t pt-4 space-y-3">
                                    <Button
                                        onClick={() => handleCancelReservation(selectedEvent.id)}
                                        disabled={isApproving}
                                        variant="outline"
                                        className="w-full border-red-200 text-red-700 hover:bg-red-50"
                                    >
                                        {isApproving ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Cancelling...
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle className="mr-2 h-4 w-4" />
                                                Cancel User's Reservation
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}