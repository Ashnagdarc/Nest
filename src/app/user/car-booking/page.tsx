"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { createCarBooking, listCarBookings } from '@/services/car-bookings';
import type { CarBooking } from '@/types/car-bookings';
import { useToast } from '@/hooks/use-toast';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiGet } from '@/lib/apiClient';

export default function UserCarBookingPage() {
    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<{ employeeName: string; dateOfUse: string; timeSlot?: string; startTime?: string; endTime?: string; destination?: string; purpose?: string }>();
    const { toast } = useToast();
    const [durationMin, setDurationMin] = useState<number>(120);
    // const [showMoreStart, setShowMoreStart] = useState<boolean>(false);
    const [rows, setRows] = useState<CarBooking[]>([]);
    const [history, setHistory] = useState<CarBooking[]>([]);
    const [assignedMap, setAssignedMap] = useState<Record<string, { label?: string; plate?: string }>>({});
    const [returningId, setReturningId] = useState<string | null>(null);
    const [overlapOpen, setOverlapOpen] = useState(false);
    const [overlapText, setOverlapText] = useState('Selected time overlaps another booking for that day.');
    const [overlapSuggestion, setOverlapSuggestion] = useState<string | null>(null);

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

    // Auto-set end time when start changes and end is missing or invalid
    useEffect(() => {
        const start = watch('startTime');
        const end = watch('endTime');
        if (!start) return;
        const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const fromMin = (m: number) => {
            const hh = String(Math.floor(m / 60) % 24).padStart(2, '0');
            const mm = String(m % 60).padStart(2, '0');
            return `${hh}:${mm}`;
        };
        if (!end || toMin(end) <= toMin(start)) {
            const plus = fromMin((toMin(start) + durationMin) % (24 * 60));
            setValue('endTime', plus);
        }
    }, [watch('startTime'), durationMin]);

    // quickSetStart removed (not used)
    const quickSetDuration = (minutes: number) => {
        const s = watch('startTime');
        if (!s) return;
        const [h, m] = s.split(':').map(Number);
        const total = h * 60 + m + minutes;
        const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
        const mm = String(total % 60).padStart(2, '0');
        setValue('endTime', `${hh}:${mm}`);
    };

    const applyDuration = (minutes: number) => {
        setDurationMin(minutes);
        quickSetDuration(minutes);
    };

    const load = async () => {
        const recent = await listCarBookings({ page: 1, pageSize: 10, status: 'Approved' });
        setRows(recent.data);
        const histCompleted = await listCarBookings({ page: 1, pageSize: 10, status: 'Completed' });
        const histRejected = await listCarBookings({ page: 1, pageSize: 10, status: 'Rejected' });
        const hist = [...(histCompleted.data || []), ...(histRejected.data || [])];
        setHistory(hist);
        // fetch assigned cars for approved + history items
        const idsArr = [...(recent.data || []).map(b => b.id), ...hist.map(b => b.id)];
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

    useEffect(() => { load(); }, []);

    const onSubmit = async (v: { employeeName: string; dateOfUse: string; timeSlot?: string; startTime?: string; endTime?: string; destination?: string; purpose?: string }) => {
        if (!v.timeSlot && !(v.startTime && v.endTime)) {
            toast({ title: 'Time missing', description: 'Select a preset slot or enter start/end time.', variant: 'destructive' });
            return;
        }
        if (v.startTime && v.endTime && v.startTime >= v.endTime) {
            toast({ title: 'Invalid time range', description: 'Start time must be before end time.', variant: 'destructive' });
            return;
        }
        const res = await createCarBooking(v);
        if (res.success) {
            reset();
            toast({ title: 'Submitted', description: 'Your car booking was submitted for approval.' });
            load();
        } else {
            const msg = res.error || 'Failed to submit';
            if (msg.toLowerCase().includes('overlap')) {
                setOverlapText(msg);
                // Suggest next available start time (15m increments) by scanning today's Pending/Approved bookings
                try {
                    const [p1, p2] = await Promise.all([
                        listCarBookings({ page: 1, pageSize: 200, status: 'Approved', dateOfUse: v.dateOfUse }),
                        listCarBookings({ page: 1, pageSize: 200, status: 'Pending', dateOfUse: v.dateOfUse }),
                    ]);
                    const rowsAll = [...(p1.data || []), ...(p2.data || [])];
                    const toMin = (t: string) => { const [hh, mm] = t.split(':').map(Number); return hh * 60 + mm; };
                    const parseRange = (b: CarBooking): [number, number] | null => {
                        if (b.start_time && b.end_time) return [toMin(b.start_time.slice(0, 5)), toMin(b.end_time.slice(0, 5))];
                        if (b.time_slot && b.time_slot.includes('-')) {
                            const [s, e] = b.time_slot.split('-').map(x => x.trim());
                            // best-effort parse HH:MM from either '09:00' or '09:00 AM'
                            const clean = (x: string) => x.match(/\d{1,2}:\d{2}/)?.[0] || x;
                            return [toMin(clean(s)), toMin(clean(e))];
                        }
                        return null;
                    };
                    const busy: Array<[number, number]> = [];
                    for (const b of rowsAll) { const r = parseRange(b); if (r) busy.push(r); }
                    busy.sort((a, b) => a[0] - b[0]);
                    const desiredStart = v.startTime ? toMin(v.startTime) : 0;
                    const step = 15; // minutes
                    let probe = Math.max(desiredStart, 0);
                    // If user provided duration, use it; else assume 60m to find a slot
                    const dur = v.startTime && v.endTime ? (toMin(v.endTime) - toMin(v.startTime)) : 60;
                    const overlapsWithDur = (s: number) => busy.some(([bs, be]) => !(s + dur <= bs || s >= be));
                    let guard = 0;
                    while (overlapsWithDur(probe) && guard < 24 * 60 / step) { probe += step; guard++; }
                    if (guard < 24 * 60 / step) {
                        const hh = String(Math.floor(probe / 60)).padStart(2, '0');
                        const mm = String(probe % 60).padStart(2, '0');
                        setOverlapSuggestion(`${hh}:${mm}`);
                    } else {
                        setOverlapSuggestion(null);
                    }
                } catch { setOverlapSuggestion(null); }
                setOverlapOpen(true);
            } else {
                toast({ title: 'Error', description: msg, variant: 'destructive' });
            }
        }
    };

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
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Start time</div>
                                <Input aria-label="Start time" type="time" step="900" placeholder="Start" {...register('startTime', { required: true })} />
                                <div className="mt-2">
                                    {/* quick-start times hidden for simplicity */}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">End time</div>
                                <Input aria-label="End time" type="time" step="900" placeholder="End" {...register('endTime', { required: true })} />
                                <div className="mt-2">
                                    <div className="text-xs text-muted-foreground mb-1">Duration</div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[30, 60, 120, 240, 360, 480].map(min => (
                                            <Button type="button" key={min} onClick={() => applyDuration(min)} size="sm" variant={durationMin === min ? 'default' : 'outline'} className="justify-center">
                                                {min < 60 ? `${min}m` : `${Math.round(min / 60)}h`}
                                            </Button>
                                        ))}
                                    </div>
                                    {(() => {
                                        const s: string | undefined = watch('startTime');
                                        const e: string | undefined = watch('endTime');
                                        if (!s || !e) return null;
                                        return <div className="text-xs text-muted-foreground mt-1">Ends at {e}</div>;
                                    })()}
                                </div>
                            </div>
                        </div>
                        {(() => {
                            const s = watch('startTime');
                            const e = watch('endTime');
                            if (!s || !e) return null;
                            const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
                            const sm = toMin(s);
                            const em = toMin(e);
                            const today = new Date().toISOString().slice(0, 10);
                            const selected = watch('dateOfUse');
                            if (selected === today) {
                                const now = new Date();
                                const mins = now.getHours() * 60 + now.getMinutes();
                                const next15 = Math.ceil(mins / 15) * 15;
                                const hh = String(Math.floor(next15 / 60)).padStart(2, '0');
                                const mm = String(next15 % 60).padStart(2, '0');
                                const minStart = `${hh}:${mm}`;
                                if (s < minStart) {
                                    return <div className="text-xs text-destructive">Start can’t be in the past. Next available is {minStart}.</div>;
                                }
                            }
                            if (sm >= em) {
                                return <div className="text-xs text-destructive">Start time must be before end time.</div>;
                            }
                            const dur = em - sm;
                            const hrs = Math.floor(dur / 60);
                            const mins = dur % 60;
                            return <div className="text-xs text-muted-foreground">Duration: {hrs > 0 ? `${hrs}h` : ''}{mins > 0 ? ` ${mins}m` : hrs === 0 ? ' < 1m' : ''}</div>;
                        })()}
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Destination</div>
                            <Input placeholder="Destination" {...register('destination')} />
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Purpose</div>
                            <Input placeholder="Purpose" {...register('purpose')} />
                        </div>
                        <Button type="submit" className="w-full" disabled={overlapOpen}>Submit Booking</Button>
                    </form>
                </CardContent>
            </Card>

            <Dialog open={overlapOpen} onOpenChange={setOverlapOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Time slot unavailable</DialogTitle>
                    </DialogHeader>
                    <div className="text-sm text-muted-foreground">
                        {overlapText}
                        {overlapSuggestion && (
                            <div className="mt-2">Next available suggestion: <span className="font-medium">{overlapSuggestion}</span></div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setOverlapOpen(false)}>OK</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle>My Recent Car Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {rows.map(b => (
                            <div key={b.id} className="border rounded p-2 text-sm flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{b.date_of_use} — {b.start_time && b.end_time ? `${b.start_time.slice(0, 5)}-${b.end_time.slice(0, 5)}` : b.time_slot}</div>
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
                                        <Button size="sm" variant="outline" disabled={returningId === b.id} onClick={async () => { setReturningId(b.id); try { const res = await fetch('/api/car-bookings/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: b.id }), credentials: 'include' }); const j: { success?: boolean; error?: string } = await res.json(); if (j.success) { setRows(prev => prev.filter(x => x.id !== b.id)); setHistory(prev => [{ ...b, status: 'Completed', updated_at: new Date().toISOString() } as CarBooking, ...prev]); toast({ title: 'Thanks', description: 'Car return submitted.' }); } else { toast({ title: 'Error', description: j.error || 'Failed', variant: 'destructive' }); } } finally { setReturningId(null); } }}>
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
                                <div className="font-medium">{b.date_of_use} — {b.start_time && b.end_time ? `${b.start_time.slice(0, 5)}-${b.end_time.slice(0, 5)}` : b.time_slot}</div>
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
