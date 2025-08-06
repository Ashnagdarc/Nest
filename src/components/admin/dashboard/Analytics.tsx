"use client";

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHead, TableRow, TableCell, TableBody, TableHeader } from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useAdvancedSearch } from '@/hooks/analytics/useAdvancedSearch';
import { useBulkSelection } from '@/hooks/analytics/useBulkSelection';
import AdvancedSearchBar from '@/components/admin/analytics/AdvancedSearchBar';
import BulkActionsToolbar from '@/components/admin/analytics/BulkActionsToolbar';

// Add types for analytics views
interface WeeklyTrendRow {
    week: string;
    total_requests: number;
    total_checkouts: number;
}
interface OverdueGearRow {
    request_id: string;
    gear_name: string;
    full_name: string;
    email: string;
    due_date: string;
}
interface UserActivityRow {
    user_id: string;
    full_name: string;
    email: string;
    total_requests: number;
    total_checkouts: number;
    total_returns: number;
}
interface GearMaintenanceRow {
    gear_id: string;
    gear_name: string;
    maintenance_events: number;
    last_maintenance: string;
}

function WeeklyTrendsChart() {
    const [data, setData] = useState<WeeklyTrendRow[]>([]);
    const supabase = createClient();
    useEffect(() => {
        supabase
            .from('weekly_request_trends')
            .select('*')
            .order('week', { ascending: true })
            .then(({ data }) => setData(data || []));
    }, []);
    return (
        <Card className="mb-6">
            <CardHeader><CardTitle>Weekly Request Trends</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Week</TableCell>
                            <TableCell>Total Requests</TableCell>
                            <TableCell>Total Checkouts</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map(row => (
                            <TableRow key={row.week}>
                                <TableCell>{row.week?.slice(0, 10)}</TableCell>
                                <TableCell>{row.total_requests}</TableCell>
                                <TableCell>{row.total_checkouts}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function OverdueGearTable() {
    const [data, setData] = useState<OverdueGearRow[]>([]);
    const [search, setSearch] = useState('');
    const supabase = createClient();
    useEffect(() => {
        supabase
            .from('overdue_gear')
            .select('*')
            .then(({ data }) => setData(data || []));
    }, []);
    // Advanced search
    const filteredData = useAdvancedSearch(
        data,
        { query: search },
        ['gear_name', 'full_name', 'email']
    );
    // Bulk selection
    const selectionData = filteredData.map(row => ({ ...row, id: row.request_id }));
    const {
        selectedIds,
        isSelected,
        toggleSelect,
        selectAll,
        deselectAll,
        allSelected,
        someSelected
    } = useBulkSelection(selectionData);
    // Bulk action handler
    function handleBulkAction(action: string) {
        if (action === 'remind') {
            // TODO: Implement reminder logic
            alert(`Send reminder to: ${selectedIds.join(', ')}`);
        } else if (action === 'export') {
            // TODO: Implement export logic
            alert(`Exporting: ${selectedIds.join(', ')}`);
        }
    }
    return (
        <Card className="mb-6">
            <CardHeader><CardTitle>Overdue Gear</CardTitle></CardHeader>
            <CardContent>
                <AdvancedSearchBar value={search} onChange={setSearch} placeholder="Search gear, user, or email..." />
                <BulkActionsToolbar
                    selectedIds={selectedIds}
                    actions={[{ label: 'Send Reminder', value: 'remind' }, { label: 'Export', value: 'export' }]}
                    onAction={handleBulkAction}
                />
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    ref={el => { if (el) el.indeterminate = someSelected; }}
                                    onChange={e => e.target.checked ? selectAll() : deselectAll()}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            <TableHead>Gear</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Due Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {selectionData.map(row => (
                            <TableRow key={row.request_id} className={isSelected(row.id) ? 'bg-orange-50 dark:bg-orange-900/10' : ''}>
                                <TableCell>
                                    <input
                                        type="checkbox"
                                        checked={isSelected(row.id)}
                                        onChange={() => toggleSelect(row.id)}
                                        aria-label={`Select row for ${row.gear_name}`}
                                    />
                                </TableCell>
                                <TableCell>{row.gear_name}</TableCell>
                                <TableCell>{row.full_name}</TableCell>
                                <TableCell>{row.email}</TableCell>
                                <TableCell>{row.due_date}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function UserActivityLeaderboard() {
    const [data, setData] = useState<UserActivityRow[]>([]);
    const supabase = createClient();
    useEffect(() => {
        supabase
            .from('user_activity_summary')
            .select('*')
            .order('total_requests', { ascending: false })
            .then(({ data }) => setData(data || []));
    }, []);
    return (
        <Card className="mb-6">
            <CardHeader><CardTitle>User Activity Leaderboard</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>User</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Requests</TableCell>
                            <TableCell>Checkouts</TableCell>
                            <TableCell>Returns</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map(row => (
                            <TableRow key={row.user_id}>
                                <TableCell>{row.full_name}</TableCell>
                                <TableCell>{row.email}</TableCell>
                                <TableCell>{row.total_requests}</TableCell>
                                <TableCell>{row.total_checkouts}</TableCell>
                                <TableCell>{row.total_returns}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function GearMaintenanceSummary() {
    const [data, setData] = useState<GearMaintenanceRow[]>([]);
    const supabase = createClient();
    useEffect(() => {
        supabase
            .from('gear_maintenance_summary')
            .select('*')
            .order('last_maintenance', { ascending: false })
            .then(({ data }) => setData(data || []));
    }, []);
    return (
        <Card className="mb-6">
            <CardHeader><CardTitle>Gear Maintenance Summary</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Gear</TableCell>
                            <TableCell>Maintenance Events</TableCell>
                            <TableCell>Last Maintenance</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map(row => (
                            <TableRow key={row.gear_id}>
                                <TableCell>{row.gear_name}</TableCell>
                                <TableCell>{row.maintenance_events}</TableCell>
                                <TableCell>{row.last_maintenance}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export function Analytics() {
    return (
        <Accordion type="multiple" className="mb-8">
            <AccordionItem value="weekly-trends">
                <AccordionTrigger>Weekly Request Trends</AccordionTrigger>
                <AccordionContent><WeeklyTrendsChart /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="overdue-gear">
                <AccordionTrigger>Overdue Gear</AccordionTrigger>
                <AccordionContent><OverdueGearTable /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="user-activity">
                <AccordionTrigger>User Activity Leaderboard</AccordionTrigger>
                <AccordionContent><UserActivityLeaderboard /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="gear-maintenance">
                <AccordionTrigger>Gear Maintenance Summary</AccordionTrigger>
                <AccordionContent><GearMaintenanceSummary /></AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
