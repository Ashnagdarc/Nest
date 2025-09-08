"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { listCarBookings, approveCarBooking, rejectCarBooking, assignCar, listCars } from '@/services/car-bookings';
import type { CarBooking } from '@/types/car-bookings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminManageCarBookingsPage() {
    const [pending, setPending] = useState<CarBooking[]>([]);
    const [approved, setApproved] = useState<CarBooking[]>([]);
    const [history, setHistory] = useState<CarBooking[]>([]);
    const [cars, setCars] = useState<Array<{ id: string; label: string; plate?: string }>>([]);

    const load = async () => {
        const [p, a, c, r] = await Promise.all([
            listCarBookings({ page: 1, pageSize: 100, status: 'Pending' }),
            listCarBookings({ page: 1, pageSize: 100, status: 'Approved' }),
            listCarBookings({ page: 1, pageSize: 100, status: 'Completed' }),
            listCarBookings({ page: 1, pageSize: 100, status: 'Rejected' }),
        ]);
        setPending(p.data);
        setApproved(a.data);
        setHistory([...(c.data || []), ...(r.data || [])]);
        const carRes = await listCars();
        setCars(carRes.data);
    };

    useEffect(() => { load(); }, []);

    const bySlot = (rows: CarBooking[]) => {
        const m = new Map<string, CarBooking[]>();
        for (const r of rows) {
            const key = `${r.date_of_use}|${r.time_slot}`;
            const a = m.get(key) || [];
            a.push(r);
            m.set(key, a);
        }
        return m;
    };

    const sections: Array<{ key: string; title: string; rows: CarBooking[]; renderActions: (b: CarBooking) => JSX.Element }> = [
        {
            key: 'pending',
            title: 'Pending Approvals',
            rows: pending,
            renderActions: (b) => (
                <div className="flex items-center gap-2">
                    <Select onValueChange={async (carId) => { const r = await assignCar(b.id, carId); if (r.conflict) alert('Warning: Assigned car has an overlapping approved booking.'); }}>
                        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Assign car" /></SelectTrigger>
                        <SelectContent>
                            {cars.map(c => <SelectItem key={c.id} value={c.id}>{c.label}{c.plate ? ` (${c.plate})` : ''}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button size="sm" onClick={async () => { await approveCarBooking(b.id); load(); }}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={async () => { await rejectCarBooking(b.id); load(); }}>Reject</Button>
                </div>
            )
        },
        {
            key: 'approved',
            title: 'Pending Check-ins',
            rows: approved,
            renderActions: () => <div className="text-xs text-muted-foreground">User will complete from their page</div>
        },
        {
            key: 'history',
            title: 'History',
            rows: history,
            renderActions: () => <div className="text-xs text-muted-foreground">—</div>
        },
    ];

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            {sections.map(section => {
                const grouped = bySlot(section.rows);
                return (
                    <Card key={section.key}>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>{section.title}</span>
                                <span className="text-sm text-muted-foreground">{section.rows.length}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {section.rows.map(b => {
                                    const overlaps = (grouped.get(`${b.date_of_use}|${b.time_slot}`) || []).filter(x => x.status === 'Approved' && x.id !== b.id).length;
                                    return (
                                        <div key={b.id} className="flex items-center justify-between border rounded p-2">
                                            <div className="text-sm">
                                                <div className="font-medium">{b.employee_name} — {b.date_of_use} ({b.time_slot})</div>
                                                <div className="text-muted-foreground">{b.destination} · {b.purpose}</div>
                                                <div> Status: {b.status} {overlaps > 0 && <span className="text-amber-600 ml-2">• {overlaps} overlap(s)</span>} </div>
                                            </div>
                                            {section.renderActions(b)}
                                        </div>
                                    );
                                })}
                                {section.rows.length === 0 && <div className="text-sm text-muted-foreground">No items.</div>}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
