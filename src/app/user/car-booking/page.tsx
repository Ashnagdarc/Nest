"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { createCarBooking, listCarBookings } from '@/services/car-bookings';
import type { CarBooking } from '@/types/car-bookings';
import { useToast } from '@/hooks/use-toast';

export default function UserCarBookingPage() {
    const { register, handleSubmit, reset, formState: { errors } } = useForm<{ employeeName: string; dateOfUse: string; timeSlot: string; destination?: string; purpose?: string }>();
    const { toast } = useToast();
    const [rows, setRows] = useState<CarBooking[]>([]);
    const [history, setHistory] = useState<CarBooking[]>([]);

    const load = async () => {
        const recent = await listCarBookings({ page: 1, pageSize: 10, status: 'Approved' });
        setRows(recent.data);
        const histCompleted = await listCarBookings({ page: 1, pageSize: 10, status: 'Completed' });
        const histRejected = await listCarBookings({ page: 1, pageSize: 10, status: 'Rejected' });
        setHistory([...(histCompleted.data || []), ...(histRejected.data || [])]);
    };

    useEffect(() => { load(); }, []);

    const onSubmit = async (v: any) => {
        const res = await createCarBooking(v);
        if (res.success) {
            reset();
            toast({ title: 'Submitted', description: 'Your car booking was submitted for approval.' });
            load();
        } else {
            toast({ title: 'Error', description: res.error || 'Failed to submit', variant: 'destructive' });
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Book a Car</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                        <Input placeholder="Employee Name" {...register('employeeName', { required: true })} />
                        {errors.employeeName && <div className="text-xs text-destructive">Employee name is required</div>}
                        <Input type="date" placeholder="Date of Use" {...register('dateOfUse', { required: true })} />
                        {errors.dateOfUse && <div className="text-xs text-destructive">Date is required</div>}
                        <Input placeholder="Time Slot (e.g., 12:00-1:30 PM)" {...register('timeSlot', { required: true })} />
                        {errors.timeSlot && <div className="text-xs text-destructive">Time slot is required</div>}
                        <Input placeholder="Destination" {...register('destination')} />
                        <Input placeholder="Purpose" {...register('purpose')} />
                        <Button type="submit">Submit Booking</Button>
                    </form>
                </CardContent>
            </Card>

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
                                    <div>Status: {b.status}</div>
                                </div>
                                <div className="flex gap-2">
                                    {b.status === 'Approved' && (
                                        <Button size="sm" variant="outline" onClick={async () => { const res = await fetch('/api/car-bookings/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: b.id }), credentials: 'include' }); const j = await res.json(); if (j.success) { setRows(prev => prev.filter(x => x.id !== b.id)); setHistory(prev => [{ ...b, status: 'Completed', updated_at: new Date().toISOString() } as any, ...prev]); toast({ title: 'Thanks', description: 'Car return submitted.' }); } else { toast({ title: 'Error', description: j.error || 'Failed', variant: 'destructive' }); } }}>I returned the car</Button>
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
