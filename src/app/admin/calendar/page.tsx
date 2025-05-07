"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from '@/lib/supabase/client';
import moment from "moment";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const localizer = momentLocalizer(moment);

export default function AdminCalendarPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [gearFilter, setGearFilter] = useState("__all__");
    const [userFilter, setUserFilter] = useState("__all__");
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        const fetchEvents = async () => {
            const { data, error } = await supabase
                .from('requests')
                .select(`
                    id,
                    checked_out_at,
                    due_date,
                    request_gear (
                        gear_id,
                        gears (
                            id,
                            name
                        )
                    ),
                    user:profiles (
                        id,
                        full_name
                    )
                `)
                .not('checked_out_at', 'is', null)
                .not('due_date', 'is', null)
                .in('status', ['Approved', 'Checked Out']);
            if (error) return;
            setEvents((data || []).map((req: any) => ({
                id: req.id,
                title: `${req.request_gear?.map((g: any) => g.gears?.name).filter(Boolean).join(', ')} (${req.user?.full_name || 'User'})`,
                start: new Date(req.checked_out_at),
                end: new Date(req.due_date),
                resource: { gear: req.gears?.map((g: any) => g.name).join(', '), user: req.users?.full_name || 'User' },
            })));
        };
        fetchEvents();
    }, [supabase]);

    // Get unique gear and user names for filters
    const uniqueGearNames = useMemo(() =>
        Array.from(new Set(
            events.flatMap(e =>
                (e.resource.gear || "")
                    .split(",")
                    .map((name: string) => name.trim())
                    .filter((name: string) => name !== "")
            )
        )),
        [events]
    );
    const uniqueUserNames = useMemo(() =>
        Array.from(new Set(
            events.map(e => (e.resource.user || "").trim()).filter((name: string) => name !== "")
        )),
        [events]
    );

    // Filter events by selected gear and user
    const filteredEvents = useMemo(() => {
        return events.filter(e => {
            const gearMatch = gearFilter === "__all__" || (e.resource.gear || "").split(", ").includes(gearFilter);
            const userMatch = userFilter === "__all__" || e.resource.user === userFilter;
            return gearMatch && userMatch;
        });
    }, [events, gearFilter, userFilter]);

    const filteredGearNames = (uniqueGearNames as unknown[])
        .filter((name): name is string => typeof name === "string" && !!name && name !== undefined && name !== null && name.trim() !== "");
    console.log("Final filteredGearNames:", filteredGearNames);

    const filteredUserNames = (uniqueUserNames as unknown[])
        .filter((name): name is string => typeof name === "string" && !!name && name !== undefined && name !== null && name.trim() !== "");
    console.log("Final filteredUserNames:", filteredUserNames);

    useEffect(() => {
        if (filteredGearNames.length === 0 && gearFilter !== "__all__") {
            setGearFilter("__all__");
        }
    }, [filteredGearNames, gearFilter]);

    useEffect(() => {
        if (filteredUserNames.length === 0 && userFilter !== "__all__") {
            setUserFilter("__all__");
        }
    }, [filteredUserNames, userFilter]);

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
            <Card>
                <CardHeader>
                    <CardTitle>All Gear Reservations</CardTitle>
                    <div className="flex flex-wrap gap-4 mt-4">
                        <Select value={gearFilter} onValueChange={setGearFilter} disabled={filteredGearNames.length === 0}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filter by Gear" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">All Gear</SelectItem>
                                {filteredGearNames.map((name: string) => (
                                    <SelectItem key={name} value={name}>{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={userFilter} onValueChange={setUserFilter} disabled={filteredUserNames.length === 0}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filter by User" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">All Users</SelectItem>
                                {filteredUserNames.map((name: string) => (
                                    <SelectItem key={name} value={name}>{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {events.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">No reservations found.</div>
                    ) : (
                        <div style={{ height: 600 }}>
                            <Calendar
                                localizer={localizer}
                                events={filteredEvents}
                                startAccessor="start"
                                endAccessor="end"
                                titleAccessor="title"
                                views={[Views.MONTH, Views.WEEK, Views.DAY]}
                                defaultView={Views.MONTH}
                                popup
                                tooltipAccessor={(event: any) => `${event.title}`}
                                style={{ height: 600 }}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 