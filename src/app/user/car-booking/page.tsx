"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Dialog imports removed since we simplified the UI
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { createCarBooking, listCarBookings } from '@/services/car-bookings';
import type { CarBooking } from '@/types/car-bookings';
import { useToast } from '@/hooks/use-toast';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiGet } from '@/lib/apiClient';

export default function UserCarBookingPage() {
    const { register, handleSubmit, reset, formState: { errors } } = useForm<{ employeeName: string; dateOfUse: string; timeSlot?: string; destination?: string; purpose?: string }>();
    const { toast } = useToast();
    const [rows, setRows] = useState<CarBooking[]>([]);
    const [history, setHistory] = useState<CarBooking[]>([]);
    const [assignedMap, setAssignedMap] = useState<Record<string, { label?: string; plate?: string }>>({});
    const [returningId, setReturningId] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    // const TIME_SLOTS = useMemo(() => [
    //     '08:00-09:00',
    //     '09:00-10:00',
    //     '10:00-11:00',
    //     '11:00-12:00',
    //     '12:00-13:00',
    //     '13:00-14:00',
    //     '14:00-15:00',
    //     '15:00-16:00',
    //     '16:00-17:00',
    //     '17:00-18:00',
    // ], []);

    // Simplified: no auto-time setting needed since we only use time_slot

    // Simplified: no time calculation functions needed since we only use time_slot

    // Simplified: no duration functions needed since we only use time_slot

    const load = async () => {
        // Fetch both Pending and Approved bookings for "My Recent Car Bookings"
        const [pending, approved] = await Promise.all([
            listCarBookings({ page: 1, pageSize: 10, status: 'Pending' }),
            listCarBookings({ page: 1, pageSize: 10, status: 'Approved' })
        ]);
        const recent = [...(pending.data || []), ...(approved.data || [])];
        setRows(recent);

        // Fetch completed and rejected for history
        const [histCompleted, histRejected] = await Promise.all([
            listCarBookings({ page: 1, pageSize: 10, status: 'Completed' }),
            listCarBookings({ page: 1, pageSize: 10, status: 'Rejected' })
        ]);
        const hist = [...(histCompleted.data || []), ...(histRejected.data || [])];
        setHistory(hist);

        // Get assigned cars for all bookings
        const idsArr = [...recent.map(b => b.id), ...hist.map(b => b.id)];
        const ids = idsArr.join(',');
        if (ids) {
            const assigned = await apiGet<{ data: Array<{ booking_id: string; label?: string; plate?: string }> }>(`/api/cars/assigned?bookingIds=${encodeURIComponent(ids)}`);
            const map: Record<string, { label?: string; plate?: string }> = {};
            (assigned.data || []).forEach(a => { map[a.booking_id] = { label: a.label, plate: a.plate }; });
            setAssignedMap(map);
        } else {
            setAssignedMap({});
        }
    };

    useEffect(() => {
        setIsMounted(true);
        load();
    }, []);

    const onSubmit = async (v: { employeeName: string; dateOfUse: string; timeSlot?: string; startTime?: string; endTime?: string; destination?: string; purpose?: string }) => {
        if (!v.timeSlot) {
            toast({ title: 'Time slot required', description: 'Please enter your desired time slot.', variant: 'destructive' });
            return;
        }
        // Simplified: no time range validation needed since we only use time_slot
        const res = await createCarBooking(v);
        if (res.success) {
            reset();
            toast({ title: 'Submitted', description: 'Your car booking was submitted for approval.' });
            load();
        } else {
            const msg = res.error || 'Failed to submit';
            toast({ title: 'Error', description: msg, variant: 'destructive' });
        }
    };

    // Prevent hydration mismatch by only rendering after mount
    if (!isMounted) {
        return (
            <div className="mx-auto max-w-3xl space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Book a Car</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="h-10 bg-muted animate-pulse rounded"></div>
                            <div className="h-10 bg-muted animate-pulse rounded"></div>
                            <div className="h-10 bg-muted animate-pulse rounded"></div>
                            <div className="h-10 bg-muted animate-pulse rounded"></div>
                            <div className="h-10 bg-muted animate-pulse rounded"></div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>My Recent Car Bookings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-20 bg-muted animate-pulse rounded"></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-20 bg-muted animate-pulse rounded"></div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Book a Car</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Employee Name</div>
                            <Input placeholder="Employee Name" {...register('employeeName', { required: true })} />
                            {errors.employeeName && <div className="text-xs text-destructive mt-1">Employee name is required</div>}
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Date of use</div>
                            <Input type="date" placeholder="Date of Use" {...register('dateOfUse', { required: true })} />
                            {errors.dateOfUse && <div className="text-xs text-destructive mt-1">Date is required</div>}
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Time Slot</div>
                            <Input placeholder="e.g., 10:30 am, 2:00 pm, etc." {...register('timeSlot', { required: true })} />
                            {errors.timeSlot && <div className="text-xs text-destructive mt-1">Time slot is required</div>}
                        </div>
                        {/* Simplified: no time validation needed since we only use time_slot */}
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Destination</div>
                            <Input placeholder="Destination" {...register('destination')} />
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Purpose</div>
                            <Input placeholder="Purpose" {...register('purpose')} />
                        </div>
                        <Button type="submit" className="w-full">Submit Booking</Button>
                    </form>
                </CardContent>
            </Card>

            {/* Simplified: no overlap dialog needed since we only use time_slot */}

            <Card>
                <CardHeader>
                    <CardTitle>My Recent Car Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {rows.map(b => (
                            <div key={b.id} className="border rounded p-2 text-sm flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{b.date_of_use} — {b.time_slot}</div>
                                    <div className="text-muted-foreground">{b.destination} · {b.purpose}</div>
                                    <div className="flex items-center gap-2">
                                        <span>Status: {b.status}</span>
                                        {assignedMap[b.id] && (
                                            <span className="text-xs text-muted-foreground">• Car: {assignedMap[b.id].label || '—'} {assignedMap[b.id].plate ? `(${assignedMap[b.id].plate})` : ''}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {b.status === 'Approved' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={returningId === b.id}
                                            onClick={async () => {
                                                setReturningId(b.id);
                                                try {
                                                    const res = await fetch('/api/car-bookings/complete', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ bookingId: b.id }),
                                                        credentials: 'include'
                                                    });
                                                    const j: { success?: boolean; error?: string } = await res.json();
                                                    if (j.success) {
                                                        toast({ title: 'Thanks', description: 'Car return submitted.' });
                                                        load(); // Refresh all data 
                                                    } else {
                                                        toast({ title: 'Error', description: j.error || 'Failed', variant: 'destructive' });
                                                    }
                                                } finally {
                                                    setReturningId(null);
                                                }
                                            }}
                                        >
                                            {returningId === b.id ? 'Submitting…' : 'I returned the car'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {rows.length === 0 && <div className="text-sm text-muted-foreground">No bookings yet.</div>}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {history.map(b => (
                            <div key={b.id} className="border rounded p-2 text-sm">
                                <div className="font-medium">{b.date_of_use} — {b.time_slot}</div>
                                <div className="text-muted-foreground">{b.destination} · {b.purpose}</div>
                                <div>Status: {b.status}</div>
                            </div>
                        ))}
                        {history.length === 0 && <div className="text-sm text-muted-foreground">No history yet.</div>}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
