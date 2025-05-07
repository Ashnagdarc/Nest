"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from '@/lib/supabase/client';
import moment from "moment";

const localizer = momentLocalizer(moment);

export default function UserCalendarPage() {
    const [events, setEvents] = useState<any[]>([]);
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        const fetchEvents = async () => {
            const { data, error } = await supabase
                .from('requests')
                .select('id, checked_out_at, due_date, gears(name), users:profiles(full_name)')
                .not('checked_out_at', 'is', null)
                .not('due_date', 'is', null)
                .in('status', ['Approved', 'Checked Out']);
            if (error) return;
            setEvents((data || []).map((req: any) => ({
                id: req.id,
                title: `${req.gears?.map((g: any) => g.name).join(', ')} (${req.users?.full_name || 'User'})`,
                start: new Date(req.checked_out_at),
                end: new Date(req.due_date),
                resource: { gear: req.gears?.map((g: any) => g.name).join(', '), user: req.users?.full_name || 'User' },
            })));
        };
        fetchEvents();
    }, [supabase]);

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
            <Card>
                <CardHeader>
                    <CardTitle>Gear Reservation Calendar</CardTitle>
                </CardHeader>
                <CardContent>
                    <div style={{ height: 600 }}>
                        <Calendar
                            localizer={localizer}
                            events={events}
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
                </CardContent>
            </Card>
        </div>
    );
} 