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
import { Check, Box, Loader2, CalendarDays, Clock, AlertCircle } from "lucide-react";
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
import { useIsMobile } from '@/hooks/use-mobile';
import { apiGet } from '@/lib/apiClient';

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
    isDisabled?: boolean;
    conflict?: boolean;
}

// Custom event styling with better visual feedback
const eventStyleGetter = (event: any) => {
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

// Add this helper to detect dark mode
const isDarkMode = typeof window !== 'undefined' && (document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches);

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
    const [availableGearOptions, setAvailableGearOptions] = useState<GearOption[]>([]);
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
            }

            // Fetch available gear first
            const { data: gearData, error: gearError } = await apiGet<{ data: Gear[]; error: string | null }>(`/api/gears/available`);
            if (gearError) {
                console.error("Error fetching gear:", gearError);
                throw new Error(`Failed to fetch gear: ${gearError}`);
            }
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
            const { data: requestData, error: requestError } = await supabase
                .rpc('handle_gear_reservation', {
                    p_gear_ids: selectedGears,
                    p_user_id: currentUserId,
                    p_reason: bookingReason,
                    p_start_date: startDate.toISOString(),
                    p_end_date: endDate.toISOString(),
                    p_duration: `${durationInDays} days`
                });

            if (requestError) throw requestError;

            toast({
                title: "Booking Requests Submitted",
                description: `Your reservation requests for ${selectedGears.length} gear(s) have been submitted for approval.`
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

    // Add this useEffect to dynamically check conflicts but show all available gear
    useEffect(() => {
        if (!selectedDates.start || !selectedDates.end) return;

        const fetchAvailableGearWithConflicts = async () => {
            const { data: gearList, error } = await supabase
                .from('gears')
                .select('id, name, category, status')
                .eq('status', 'Available');

            if (error) {
                // handle error
                return;
            }

            // Check for conflicts for each gear
            const gearOptions = await Promise.all(
                gearList.map(async function (gear: any) {
                    if (!selectedDates.start || !selectedDates.end) return {
                        value: gear.id,
                        label: `${gear.name} (${gear.category})`,
                        isDisabled: true,
                        conflict: false
                    };
                    const { data: hasConflict } = await supabase.rpc('check_gear_booking_conflict', {
                        p_gear_id: gear.id,
                        p_start_date: selectedDates.start.toISOString(),
                        p_end_date: selectedDates.end.toISOString()
                    });
                    return {
                        value: gear.id,
                        label: `${gear.name} (${gear.category})`,
                        isDisabled: !!hasConflict,
                        conflict: !!hasConflict
                    };
                })
            );
            setAvailableGear(gearList); // still used elsewhere if needed
            setAvailableGearOptions(gearOptions);
        };

        fetchAvailableGearWithConflicts();
    }, [selectedDates.start, selectedDates.end]);

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
            <Card className="w-full max-w-full">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                        <CalendarDays className="h-6 w-6" />
                        Gear Reservation Calendar
                    </CardTitle>
                    <CardDescription className="text-lg">
                        View existing reservations and make new booking requests. Click on any time slot to book gear.
                    </CardDescription>
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
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                            <p>Loading calendar data...</p>
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
                                                <Card key={event.id} className="w-full max-w-full">
                                                    <CardContent className="py-3 px-4 flex flex-col gap-1 w-full max-w-full">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-base">{event.title}</span>
                                                            <Badge variant="outline" className={
                                                                event.resource.status === 'Approved' ? 'bg-green-100 text-green-800 border-green-200' :
                                                                    event.resource.status === 'Pending' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                                                        event.resource.status === 'Rejected' ? 'bg-red-100 text-red-800 border-red-200' : ''
                                                            }>
                                                                {event.resource.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {format(new Date(event.start), 'p')} - {format(new Date(event.end), 'p')}
                                                        </div>
                                                        {event.resource.reason && (
                                                            <div className="text-xs text-muted-foreground">{event.resource.reason}</div>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="self-end mt-2"
                                                            onClick={() => setSelectedEvent(event)}
                                                        >
                                                            Details
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : (
                                // Desktop: full calendar grid
                                <div className="mt-4 w-full max-w-full">
                                    <div className="h-[400px] md:h-[600px] bg-white dark:bg-gray-900 rounded-lg border border-input shadow-sm overflow-hidden w-full max-w-full">
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
                                            className="rounded-lg"
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Booking Dialog */}
            <Dialog open={!!selectedSlot} onOpenChange={(open) => !open && setSelectedSlot(null)}>
                <DialogContent className="w-full max-w-[95vw] p-1 sm:max-w-[600px] sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Book Gear</DialogTitle>
                        <DialogDescription className="text-base">
                            Create new gear reservation requests. Select multiple gear items if needed.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 py-2">
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <h4 className="font-medium text-sm">Selected Time Period</h4>
                                <div className="flex flex-col space-y-1 w-full responsive-calendar-wrapper overflow-x-auto max-w-full">
                                    <span className="text-sm text-muted-foreground">Start</span>
                                    <CalendarComponent
                                        mode="single"
                                        selected={selectedDates.start}
                                        onSelect={(date) => setSelectedDates(dates => ({ ...dates, start: date }))}
                                        className="rounded-md border w-full responsive-calendar"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-medium text-sm">Available Gear</h4>
                                {availableGear.length > 0 ? (
                                    <div className="p-2 sm:p-4 rounded-lg border bg-card w-full">
                                        <ReactSelect<GearOption, true>
                                            isMulti
                                            options={availableGearOptions}
                                            value={selectedGearOptions}
                                            onChange={(selected: MultiValue<GearOption>) => {
                                                const selectedArray = Array.from(selected);
                                                setSelectedGearOptions(selectedArray);
                                                setSelectedGears(selectedArray.map(item => item.value));
                                            }}
                                            placeholder="Select gear items..."
                                            className="w-full max-w-full"
                                            isOptionDisabled={(option, _selectValue) => !!option.isDisabled}
                                            formatOptionLabel={(option) => (
                                                <span title={option.isDisabled ? 'Already booked for this period' : ''} style={option.isDisabled ? { color: isDarkMode ? '#888' : '#aaa' } : {}}>
                                                    {option.label}
                                                </span>
                                            )}
                                            styles={{
                                                menu: (provided) => ({
                                                    ...provided,
                                                    backgroundColor: isDarkMode ? '#18181b' : '#fff',
                                                    color: isDarkMode ? '#f4f4f5' : '#222',
                                                }),
                                                option: (provided, state) => ({
                                                    ...provided,
                                                    backgroundColor: state.isSelected
                                                        ? (isDarkMode ? '#27272a' : '#e0e7ff')
                                                        : state.isFocused
                                                            ? (isDarkMode ? '#27272a' : '#f1f5f9')
                                                            : isDarkMode ? '#18181b' : '#fff',
                                                    color: state.isDisabled
                                                        ? (isDarkMode ? '#888' : '#aaa')
                                                        : (isDarkMode ? '#f4f4f5' : '#222'),
                                                    cursor: state.isDisabled ? 'not-allowed' : 'pointer',
                                                    opacity: state.isDisabled ? 0.7 : 1,
                                                }),
                                                control: (provided, state) => ({
                                                    ...provided,
                                                    backgroundColor: isDarkMode ? '#18181b' : '#fff',
                                                    borderColor: state.isFocused ? (isDarkMode ? '#6366f1' : '#6366f1') : (isDarkMode ? '#27272a' : '#e5e7eb'),
                                                    boxShadow: state.isFocused ? (isDarkMode ? '0 0 0 2px #6366f1' : '0 0 0 2px #6366f1') : 'none',
                                                }),
                                                multiValue: (provided) => ({
                                                    ...provided,
                                                    backgroundColor: isDarkMode ? '#27272a' : '#e0e7ff',
                                                    color: isDarkMode ? '#f4f4f5' : '#222',
                                                }),
                                                singleValue: (provided) => ({
                                                    ...provided,
                                                    color: isDarkMode ? '#f4f4f5' : '#222',
                                                }),
                                                input: (provided) => ({
                                                    ...provided,
                                                    color: isDarkMode ? '#f4f4f5' : '#222',
                                                }),
                                                placeholder: (provided) => ({
                                                    ...provided,
                                                    color: isDarkMode ? '#888' : '#888',
                                                }),
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center p-4 rounded-lg border border-dashed w-full">
                                        <div className="text-center">
                                            <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/70" />
                                            <p className="mt-2 text-sm text-muted-foreground">No gear available for this time period</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-medium text-sm">Booking Details</h4>
                                <div className="space-y-2">
                                    <Textarea
                                        placeholder="Describe the purpose of your booking..."
                                        value={bookingReason}
                                        onChange={(e) => setBookingReason(e.target.value)}
                                        className="min-h-[80px] resize-none w-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:gap-4 w-full">
                        <Button variant="outline" className="w-full sm:w-auto" onClick={() => setSelectedSlot(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleBookingSubmit}
                            disabled={selectedGears.length === 0 || !bookingReason.trim()}
                            className="w-full sm:w-auto min-w-[120px]"
                        >
                            {selectedGears.length > 0 ? `Request (${selectedGears.length})` : 'Submit Request'}
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
                                    selectedEvent.resource.status === 'Approved' && "bg-green-100 text-green-800",
                                    selectedEvent.resource.status === 'Pending' && "bg-amber-100 text-amber-800",
                                    selectedEvent.resource.status === 'Rejected' && "bg-red-100 text-red-800"
                                )}>
                                    {selectedEvent.resource.status}
                                </Badge>
                                {selectedEvent.resource.approvedBy && (
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
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}