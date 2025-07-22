"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/apiClient";
import {
    RefreshCcw, BarChart3, Settings, Package, TrendingUp, Wrench, Users, ClipboardList, CheckCircle2, XCircle, BarChart3 as BarChartIcon
} from "lucide-react";
import type { Gear, Profile, GearRequest } from "@/types/dashboard";
import Link from "next/link";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddGearForm from "@/components/admin/add-gear-form";
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHead, TableRow, TableCell, TableBody } from '@/components/ui/table';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import BulkActionsToolbar from '@/components/admin/analytics/BulkActionsToolbar';
import AdvancedSearchBar from '@/components/admin/analytics/AdvancedSearchBar';
import { useBulkSelection } from '@/hooks/analytics/useBulkSelection';
import { useAdvancedSearch } from '@/hooks/analytics/useAdvancedSearch';

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
                    <TableHead>
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
                    </TableHead>
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

export default function AdminDashboardPage() {
    // State for all dashboard data
    const [loading, setLoading] = useState(true);
    const [gears, setGears] = useState<Gear[]>([]);
    const [users, setUsers] = useState<Profile[]>([]);
    const [requests, setRequests] = useState<GearRequest[]>([]);
    const [error, setError] = useState("");
    const [addGearOpen, setAddGearOpen] = useState(false);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            setError("");
            try {
                const gearsRes = await apiGet<{ data: Gear[] }>("/api/gears?pageSize=1000");
                const usersRes = await apiGet<{ data: Profile[] }>("/api/users?pageSize=1000");
                const requestsRes = await apiGet<{ data: GearRequest[] }>("/api/requests?pageSize=1000");
                setGears(gearsRes.data || []);
                setUsers(usersRes.data || []);
                setRequests(requestsRes.data || []);
            } catch (e: unknown) {
                function isErrorWithMessage(error: unknown): error is { message: string } {
                    return (
                        typeof error === "object" &&
                        error !== null &&
                        "message" in error &&
                        typeof (error as { message: unknown }).message === "string"
                    );
                }
                if (isErrorWithMessage(e)) {
                    setError(e.message);
                } else {
                    setError("Failed to load dashboard data");
                }
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // Compute stats
    const totalEquipment = gears.length;
    const availableEquipment = gears.filter((g: Gear) => g.status === "Available").length;
    const checkedOutEquipment = gears.filter((g: Gear) => g.status === "Checked Out").length;
    const underRepairEquipment = gears.filter((g: Gear) => g.status === "Under Repair").length;
    const utilizationRate = totalEquipment > 0 ? Math.round((checkedOutEquipment / totalEquipment) * 100) : 0;

    const totalUsers = users.length;
    const activeUsers = users.filter((u: Profile) => u.status === "Active").length;

    const pendingRequests = requests.filter((r: GearRequest) => r.status === "Pending").length;
    const approvedRequests = requests.filter((r: GearRequest) => r.status === "Approved").length;
    const rejectedRequests = requests.filter((r: GearRequest) => r.status === "Rejected").length;
    const approvalRate = requests.length > 0 ? Math.round((approvedRequests / requests.length) * 100) : 0;

    // Compute categories
    const categoriesMap: Record<string, number> = {};
    gears.forEach((g: Gear) => {
        if (!g.category) return;
        categoriesMap[g.category] = (categoriesMap[g.category] || 0) + 1;
    });
    const categories = Object.entries(categoriesMap).map(([name, count]) => ({ name, count }));

    return (
        <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 lg:space-y-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold bg-gradient-to-r from-[#ff6300] via-[#ff8533] to-[#ffaa66] bg-clip-text text-transparent truncate">
                            Welcome Admin
                        </h1>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <Button
                            variant="outline"
                            className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white text-sm sm:text-base"
                            onClick={() => window.location.reload()}
                        >
                            <RefreshCcw className="h-4 w-4 mr-2" />
                            <span className="hidden xs:inline">Refresh</span>
                            <span className="xs:hidden">Refresh</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white text-sm sm:text-base"
                        >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            <span className="hidden xs:inline">Reports</span>
                            <span className="xs:hidden">Reports</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white text-sm sm:text-base"
                        >
                            <Settings className="h-4 w-4 mr-2" />
                            <span className="hidden xs:inline">Settings</span>
                            <span className="xs:hidden">Settings</span>
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="text-red-500 font-bold text-center py-4 px-4 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</div>
                )}

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin h-12 w-12 border-4 border-orange-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : (
                    <>
                        {/* Responsive Bento Grid Layout */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
                            {/* Top row: Hero cards */}
                            <div className="sm:col-span-2 lg:col-span-3">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
                                    <div className="flex items-center gap-3 sm:gap-4 mb-4">
                                        <Package className="w-8 h-8 sm:w-12 sm:h-12 text-blue-400 flex-shrink-0" />
                                        <span className="text-lg sm:text-xl lg:text-2xl font-bold text-black dark:text-white truncate">Total Equipment</span>
                                    </div>
                                    <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-black dark:text-white mb-2">{totalEquipment}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{availableEquipment} available</div>
                                </div>
                            </div>
                            <div className="sm:col-span-2 lg:col-span-3">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
                                    <div className="flex items-center gap-3 sm:gap-4 mb-4">
                                        <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 text-purple-400 flex-shrink-0" />
                                        <span className="text-lg sm:text-xl lg:text-2xl font-bold text-black dark:text-white truncate">Utilization Rate</span>
                                    </div>
                                    <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-black dark:text-white mb-2">{utilizationRate}%</div>
                                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full mt-2">
                                        <div className="h-2 bg-purple-500 rounded-full" style={{ width: `${utilizationRate}%` }} />
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Equipment in use</div>
                                </div>
                            </div>

                            {/* Second row: Equipment/User stats */}
                            <div className="sm:col-span-1 lg:col-span-2">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
                                    <div className="flex items-center gap-3 sm:gap-4 mb-4">
                                        <Package className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 flex-shrink-0" />
                                        <span className="text-base sm:text-lg font-bold text-black dark:text-white truncate">Checked Out</span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black dark:text-white mb-2">{checkedOutEquipment}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">In use</div>
                                </div>
                            </div>
                            <div className="sm:col-span-1 lg:col-span-2">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
                                    <div className="flex items-center gap-3 sm:gap-4 mb-4">
                                        <Wrench className="w-6 h-6 sm:w-8 sm:h-8 text-red-400 flex-shrink-0" />
                                        <span className="text-base sm:text-lg font-bold text-black dark:text-white truncate">Under Repair</span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black dark:text-white mb-2">{underRepairEquipment}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Maintenance</div>
                                </div>
                            </div>
                            <div className="sm:col-span-1">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
                                    <div className="flex items-center gap-3 sm:gap-4 mb-4">
                                        <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 flex-shrink-0" />
                                        <span className="text-base sm:text-lg font-bold text-black dark:text-white truncate">Total Users</span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black dark:text-white mb-2">{totalUsers}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Registered</div>
                                </div>
                            </div>
                            <div className="sm:col-span-1">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
                                    <div className="flex items-center gap-3 sm:gap-4 mb-4">
                                        <Users className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 flex-shrink-0" />
                                        <span className="text-base sm:text-lg font-bold text-black dark:text-white truncate">Active Users</span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black dark:text-white mb-2">{activeUsers}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Recently active</div>
                                </div>
                            </div>

                            {/* Third row: Request stats */}
                            <div className="sm:col-span-1">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
                                    <div className="flex items-center gap-3 sm:gap-4 mb-4">
                                        <ClipboardList className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 flex-shrink-0" />
                                        <span className="text-base sm:text-lg font-bold text-black dark:text-white truncate">Pending</span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black dark:text-white mb-2">{pendingRequests}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Awaiting approval</div>
                                </div>
                            </div>
                            <div className="sm:col-span-1">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
                                    <div className="flex items-center gap-3 sm:gap-4 mb-4">
                                        <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 flex-shrink-0" />
                                        <span className="text-base sm:text-lg font-bold text-black dark:text-white truncate">Approved</span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black dark:text-white mb-2">{approvedRequests}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Approved</div>
                                </div>
                            </div>
                            <div className="sm:col-span-1">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
                                    <div className="flex items-center gap-3 sm:gap-4 mb-4">
                                        <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-400 flex-shrink-0" />
                                        <span className="text-base sm:text-lg font-bold text-black dark:text-white truncate">Rejected</span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black dark:text-white mb-2">{rejectedRequests}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Rejected</div>
                                </div>
                            </div>
                            <div className="sm:col-span-2 lg:col-span-3">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
                                    <div className="flex items-center gap-3 sm:gap-4 mb-4">
                                        <BarChartIcon className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 flex-shrink-0" />
                                        <span className="text-base sm:text-lg font-bold text-black dark:text-white truncate">Approval Rate</span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black dark:text-white mb-2">{approvalRate}%</div>
                                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full mt-2">
                                        <div className="h-2 bg-green-500 rounded-full" style={{ width: `${approvalRate}%` }} />
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Request approvals</div>
                                </div>
                            </div>

                            {/* Quick Actions and Recent Activity */}
                            <div className="sm:col-span-2 lg:col-span-3">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
                                    <div className="font-bold text-base sm:text-lg mb-4 text-black dark:text-white">Quick Actions</div>
                                    <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                                        <Dialog open={addGearOpen} onOpenChange={setAddGearOpen}>
                                            <DialogTrigger asChild>
                                                <Button className="bg-blue-500 hover:bg-blue-600 text-white text-sm sm:text-base w-full sm:w-auto">
                                                    + Add Equipment
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-md">
                                                <DialogHeader>
                                                    <DialogTitle>Add New Equipment</DialogTitle>
                                                </DialogHeader>
                                                <AddGearForm onSubmit={() => setAddGearOpen(false)} />
                                            </DialogContent>
                                        </Dialog>
                                        <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base w-full sm:w-auto">
                                            <Link href="/admin/manage-requests">Manage Requests</Link>
                                        </Button>
                                        <Button asChild className="bg-purple-500 hover:bg-purple-600 text-white text-sm sm:text-base w-full sm:w-auto">
                                            <Link href="/admin/reports">View Reports</Link>
                                        </Button>
                                        <Button asChild className="bg-green-500 hover:bg-green-600 text-white text-sm sm:text-base w-full sm:w-auto">
                                            <Link href="/admin/manage-users">User Management</Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div className="sm:col-span-2 lg:col-span-3">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
                                    <div className="font-bold text-base sm:text-lg mb-4 text-black dark:text-white">Recent Activity</div>
                                    <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                                        <li className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            Check-in Activity – 1 day ago
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            Request Approved – 2 days ago
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                            Equipment Added – 3 days ago
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                            User Registered – 4 days ago
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Equipment Categories */}
                            <div className="sm:col-span-2 lg:col-span-6">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent">
                                    <div className="font-bold text-base sm:text-lg mb-4 text-black dark:text-white">Equipment Categories</div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
                                        {categories.map((cat) => (
                                            <div key={cat.name} className="border border-gray-300 dark:border-gray-700 rounded-xl p-3 sm:p-4 bg-white dark:bg-transparent flex flex-col items-center text-center">
                                                <span className="text-sm sm:text-base font-semibold text-black dark:text-white truncate w-full">{cat.name}</span>
                                                <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-blue-500 mt-2">{cat.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Collapsible analytics views */}
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
                    </>
                )}
            </div>
        </div>
    );
}
