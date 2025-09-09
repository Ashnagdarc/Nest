"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { listCarBookings, approveCarBooking, rejectCarBooking, assignCar, listCars } from '@/services/car-bookings';
import type { CarBooking } from '@/types/car-bookings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// import { RefreshCcw } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

function StatusPill({ status, updatedAt }: { status: string; updatedAt?: string }) {
    const color = status === 'Approved' ? 'bg-amber-100 text-amber-700' :
        status === 'Pending' ? 'bg-blue-100 text-blue-700' :
            status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700';
    const rel = updatedAt ? new Date(updatedAt) : undefined;
    return (
        <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full ${color}`}>{status}</span>
            {rel && <span className="text-xs text-muted-foreground">• updated {(updatedAt || '').slice(11, 16)}Z</span>}
        </div>
    );
}

function ReturnedTag({ visible }: { visible: boolean }) {
    if (!visible) return null;
    return <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 ml-2">Returned</span>;
}

// helper animation class toggle based on in_use
function cardAnim(inUse: boolean) {
    return inUse ? 'transition-opacity duration-500 opacity-50' : 'transition-opacity duration-500 opacity-100';
}

export default function AdminManageCarBookingsPage() {
    const [pending, setPending] = useState<CarBooking[]>([]);
    const [approved, setApproved] = useState<CarBooking[]>([]);
    const [history, setHistory] = useState<CarBooking[]>([]);
    const [cars, setCars] = useState<Array<{ id: string; label: string; plate?: string }>>([]);
    const [carStatus, setCarStatus] = useState<Array<{ id: string; label: string; plate?: string; in_use: boolean; image_url?: string }>>([]);
    const [carDialogOpen, setCarDialogOpen] = useState(false);
    const [carDialogData, setCarDialogData] = useState<{ label: string; plate?: string; rows: CarBooking[] } | null>(null);
    const [editImageOpen, setEditImageOpen] = useState(false);
    const [editCar, setEditCar] = useState<{ id: string; label: string; image_url?: string } | null>(null);
    const [imageUrl, setImageUrl] = useState('');
    const [bookingCarMap, setBookingCarMap] = useState<Record<string, { label?: string; plate?: string; car_id?: string }>>({});
    const [assigningId, setAssigningId] = useState<string | null>(null);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [reassignId, setReassignId] = useState<string | null>(null);
    const [sectionLoading, setSectionLoading] = useState<{ pending?: boolean; approved?: boolean; history?: boolean; cars?: boolean }>({});

    const supabase = createClient();
    const { toast } = useToast();

    const load = async () => {
        setSectionLoading({ pending: true, approved: true, history: true, cars: true });
        const [p, a, c, r] = await Promise.all([
            listCarBookings({ page: 1, pageSize: 100, status: 'Pending' }),
            listCarBookings({ page: 1, pageSize: 100, status: 'Approved' }),
            listCarBookings({ page: 1, pageSize: 100, status: 'Completed' }),
            listCarBookings({ page: 1, pageSize: 100, status: 'Rejected' }),
        ]);
        setPending(p.data);
        setApproved(a.data);
        const hist = [...(c.data || []), ...(r.data || [])];
        setHistory(hist);
        const carRes = await listCars();
        setCars(carRes.data);
        // fetch assigned cars for pending, approved, and history items
        const idsArr = [
            ...(p.data || []).map((b: CarBooking) => b.id),
            ...(a.data || []).map((b: CarBooking) => b.id),
            ...(hist || []).map((b: CarBooking) => b.id),
        ];
        const ids = idsArr.join(',');
        if (ids) {
            const assigned = await apiGet<{ data: Array<{ booking_id: string; car_id?: string; label?: string; plate?: string }> }>(`/api/cars/assigned?bookingIds=${encodeURIComponent(ids)}`);
            const map: Record<string, { car_id?: string; label?: string; plate?: string }> = {};
            (assigned.data || []).forEach((a) => { map[a.booking_id] = { car_id: a.car_id, label: a.label, plate: a.plate }; });
            setBookingCarMap(map);
        } else {
            setBookingCarMap({});
        }
        const status = await apiGet<{ data: Array<{ id: string; label: string; plate?: string; in_use: boolean; image_url?: string }> }>(`/api/cars/status`);
        setCarStatus(status.data || []);
        setSectionLoading({ pending: false, approved: false, history: false, cars: false });
    };

    useEffect(() => { load(); }, []);

    // Realtime refresh when bookings or assignments change
    useEffect(() => {
        const bookings = supabase
            .channel('car_bookings_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'car_bookings' }, () => {
                load();
            })
            .subscribe();
        const assignments = supabase
            .channel('car_assignment_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'car_assignment' }, () => {
                load();
            })
            .subscribe();
        return () => { supabase.removeChannel(bookings); supabase.removeChannel(assignments); };
    }, []);

    const bySlot = (rows: CarBooking[]) => {
        const m = new Map<string, CarBooking[]>();
        for (const r of rows) {
            const label = r.start_time && r.end_time ? `${r.start_time.slice(0, 5)}-${r.end_time.slice(0, 5)}` : (r.time_slot || '');
            const key = `${r.date_of_use}|${label}`;
            const a = m.get(key) || [];
            a.push(r);
            m.set(key, a);
        }
        return m;
    };

    const to12h = (hhmm: string | null | undefined): string => {
        if (!hhmm) return '';
        const [h, m] = hhmm.slice(0, 5).split(':').map(Number);
        const d = new Date(); d.setHours(h, m, 0, 0);
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    };
    const range12h = (s?: string | null, e?: string | null, fallback?: string | null) => {
        if (s && e) return `${to12h(s)}-${to12h(e)}`;
        if (fallback) return fallback;
        return '';
    };

    const openCarDialog = async (car: { id: string; label: string; plate?: string }) => {
        const res = await apiGet<{ data: CarBooking[] }>(`/api/cars/${car.id}/bookings`);
        setCarDialogData({ label: car.label, plate: car.plate, rows: res.data || [] });
        setCarDialogOpen(true);
    };

    const openEdit = (c: { id: string; label: string; image_url?: string }) => {
        setEditCar(c);
        setImageUrl(c.image_url || '');
        setEditImageOpen(true);
    };

    const saveImage = async () => {
        if (!editCar) return;
        await fetch(`/api/cars/${editCar.id}/image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl }), credentials: 'include' });
        setEditImageOpen(false);
        load();
    };

    const sections: Array<{ key: 'pending' | 'approved' | 'history'; title: string; rows: CarBooking[]; renderActions: (b: CarBooking) => JSX.Element }> = [
        {
            key: 'pending',
            title: 'Pending Approvals',
            rows: pending,
            renderActions: (b) => (
                <div className="flex items-center gap-2">
                    <Select defaultValue={bookingCarMap[b.id]?.car_id} disabled={assigningId === b.id} onValueChange={async (carId) => { setAssigningId(b.id); try { const r = await assignCar(b.id, carId); if (r.conflict) { toast({ title: 'Overlap detected', description: 'Assigned car overlaps another approved booking in this slot.', variant: 'destructive' }); } else { toast({ title: 'Assigned', description: 'Car assigned to booking.' }); await load(); } } finally { setAssigningId(null); } }}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Assign car" /></SelectTrigger>
                        <SelectContent>
                            {cars.map(c => <SelectItem key={c.id} value={c.id}>{c.label}{c.plate ? ` (${c.plate})` : ''}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button size="sm" disabled={!bookingCarMap[b.id]?.car_id || approvingId === b.id} onClick={async () => { setApprovingId(b.id); try { await approveCarBooking(b.id); toast({ title: 'Approved', description: 'Booking approved.' }); await load(); } catch { toast({ title: 'Error', description: 'Failed to approve', variant: 'destructive' }); } finally { setApprovingId(null); } }}>{approvingId === b.id ? 'Approving…' : 'Approve'}</Button>
                    <Button size="sm" variant="destructive" disabled={rejectingId === b.id} onClick={async () => { setRejectingId(b.id); try { await rejectCarBooking(b.id); toast({ title: 'Rejected', description: 'Booking rejected.' }); await load(); } catch { toast({ title: 'Error', description: 'Failed to reject', variant: 'destructive' }); } finally { setRejectingId(null); } }}>{rejectingId === b.id ? 'Rejecting…' : 'Reject'}</Button>
                </div>
            )
        },
        {
            key: 'approved',
            title: 'Pending Check-ins',
            rows: approved,
            renderActions: (b) => {
                const carInfo = bookingCarMap[b.id];
                // After approval, show assigned car; allow optional reassign with audit
                if (reassignId === b.id) {
                    return (
                        <div className="flex items-center gap-2">
                            <Select defaultValue={carInfo?.car_id} disabled={assigningId === b.id} onValueChange={async (carId) => { setAssigningId(b.id); try { const r = await assignCar(b.id, carId); if (r.conflict) { toast({ title: 'Overlap detected', description: 'Assigned car overlaps another approved booking in this slot.', variant: 'destructive' }); } else { toast({ title: 'Reassigned', description: 'Car reassigned to booking.' }); await load(); } } finally { setAssigningId(null); } }}>
                                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select car" /></SelectTrigger>
                                <SelectContent>
                                    {cars.map(c => <SelectItem key={c.id} value={c.id}>{c.label}{c.plate ? ` (${c.plate})` : ''}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Button size="sm" variant="outline" onClick={() => setReassignId(null)}>Done</Button>
                        </div>
                    );
                }
                return (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Assigned: {carInfo?.label || '—'} {carInfo?.plate ? `(${carInfo.plate})` : ''}</span>
                        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setReassignId(b.id)}>Change</Button>
                    </div>
                );
            }
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
            <div className="flex items-center justify-between">
                <CardTitle>Manage Car Bookings</CardTitle>
                <Button variant="outline" size="sm" onClick={() => { load(); toast({ title: 'Refreshed', description: 'Data reloaded.' }); }}>Refresh</Button>
            </div>
            {/* Cars Overview */}
            <Card>
                <CardHeader>
                    <CardTitle>Cars Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {sectionLoading.cars && [0, 1, 2].map(i => (
                            <div key={i} className="border rounded overflow-hidden animate-pulse">
                                <div className="h-28 bg-muted" />
                                <div className="p-3">
                                    <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                                    <div className="h-3 bg-muted rounded w-1/3" />
                                </div>
                            </div>
                        ))}
                        {carStatus.map(c => (
                            <div key={c.id} className={`border rounded overflow-hidden ${cardAnim(c.in_use)}`}>
                                <button onClick={() => openCarDialog(c)} className="block w-full">
                                    <div className="relative h-28 w-full bg-card">
                                        {c.image_url ? (
                                            <Image src={c.image_url} alt={c.label} fill className="object-cover" unoptimized />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                                        )}
                                    </div>
                                    <div className="p-3 text-sm text-left">
                                        <div className="font-medium">{c.label}</div>
                                        <div className="text-muted-foreground text-xs">{c.plate || '—'}</div>
                                        <div className={`text-xs mt-1 ${c.in_use ? 'text-amber-600' : 'text-emerald-600'}`}>{c.in_use ? 'Checked out' : 'Available'}</div>
                                    </div>
                                </button>
                                <div className="p-2 border-t flex justify-end">
                                    <Button size="sm" variant="outline" onClick={() => openEdit(c)}>Edit Image</Button>
                                </div>
                            </div>
                        ))}
                        {!sectionLoading.cars && carStatus.length === 0 && <div className="text-sm text-muted-foreground">No cars</div>}
                    </div>
                </CardContent>
            </Card>

            {/* Edit Image Dialog */}
            <Dialog open={editImageOpen} onOpenChange={setEditImageOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Image for {editCar?.label}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Input placeholder="https://..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setEditImageOpen(false)}>Cancel</Button>
                            <Button onClick={saveImage}>Save</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog */}
            <Dialog open={carDialogOpen} onOpenChange={setCarDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{carDialogData?.label} {carDialogData?.plate ? `(${carDialogData?.plate})` : ''}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 max-h-[50vh] overflow-auto">
                        {(carDialogData?.rows || []).map((b: CarBooking) => (
                            <div key={b.id} className="border rounded p-2 text-sm">
                                <div className="font-medium">{b.employee_name} — {b.date_of_use} ({range12h(b.start_time, b.end_time, b.time_slot || '')})</div>
                                <div className="text-xs">Status: {b.status}</div>
                            </div>
                        ))}
                        {(carDialogData?.rows || []).length === 0 && <div className="text-sm text-muted-foreground">No recent bookings</div>}
                    </div>
                </DialogContent>
            </Dialog>

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
                                {sectionLoading[section.key] && [0, 1, 2].map(i => (
                                    <div key={i} className="flex items-center justify-between border rounded p-3 animate-pulse">
                                        <div className="space-y-2 w-full mr-4">
                                            <div className="h-4 bg-muted rounded w-2/3" />
                                            <div className="h-3 bg-muted rounded w-1/2" />
                                        </div>
                                        <div className="h-6 w-24 bg-muted rounded" />
                                    </div>
                                ))}
                                {section.rows.map(b => {
                                    const label = b.start_time && b.end_time ? `${b.start_time.slice(0, 5)}-${b.end_time.slice(0, 5)}` : (b.time_slot || '');
                                    const overlaps = (grouped.get(`${b.date_of_use}|${label}`) || []).filter(x => x.status === 'Approved' && x.id !== b.id).length;
                                    const isReturned = (section.key === 'history' && b.status === 'Completed');
                                    const carInfo = bookingCarMap[b.id];
                                    return (
                                        <div key={b.id} className="flex items-center justify-between border rounded p-3">
                                            <div className="text-sm">
                                                <div className="font-medium">{b.employee_name} — {b.date_of_use} ({range12h(b.start_time, b.end_time, b.time_slot || '')})</div>
                                                <div className="text-muted-foreground">{b.destination} · {b.purpose}</div>
                                                <div className="flex items-center gap-2">
                                                    <StatusPill status={b.status} updatedAt={b.updated_at || undefined} />
                                                    {section.key === 'history' && <ReturnedTag visible={isReturned} />}
                                                    {carInfo && (section.key === 'approved' || section.key === 'history') && (
                                                        <span className="text-xs text-muted-foreground">• Car: {carInfo.label || '—'} {carInfo.plate ? `(${carInfo.plate})` : ''}</span>
                                                    )}
                                                </div>
                                                {overlaps > 0 && <div className="text-amber-600 text-xs mt-1">{overlaps} overlap(s) in this slot</div>}
                                            </div>
                                            {section.renderActions(b)}
                                        </div>
                                    );
                                })}
                                {!sectionLoading[section.key] && section.rows.length === 0 && <div className="text-sm text-muted-foreground">No items.</div>}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
