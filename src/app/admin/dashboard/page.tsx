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
            <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-[#ff6300] via-[#ff8533] to-[#ffaa66] bg-clip-text text-transparent">
                            Welcome Admin
                        </h1>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white" onClick={() => window.location.reload()}>
                            <RefreshCcw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                        <Button variant="outline" className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Reports
                        </Button>
                        <Button variant="outline" className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white">
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                        </Button>
                    </div>
                </div>
                {error && (
                    <div className="text-red-500 font-bold text-center py-4">{error}</div>
                )}
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin h-12 w-12 border-4 border-orange-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : (
                    <>
                        {/* Improved Bento Grid Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                            {/* Top row: Hero cards */}
                            <div className="md:col-span-3">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-6 bg-white dark:bg-transparent">
                                    <div className="flex items-center gap-4 mb-4">
                                        <Package className="w-12 h-12 text-blue-400" />
                                        <span className="text-2xl font-bold text-black dark:text-white">Total Equipment</span>
                                    </div>
                                    <div className="text-5xl font-extrabold text-black dark:text-white mb-2">{totalEquipment}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{availableEquipment} available</div>
                                </div>
                            </div>
                            <div className="md:col-span-3">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-6 bg-white dark:bg-transparent">
                                    <div className="flex items-center gap-4 mb-4">
                                        <TrendingUp className="w-12 h-12 text-purple-400" />
                                        <span className="text-2xl font-bold text-black dark:text-white">Utilization Rate</span>
                                    </div>
                                    <div className="text-5xl font-extrabold text-black dark:text-white mb-2">{utilizationRate}%</div>
                                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full mt-2">
                                        <div className="h-2 bg-purple-500 rounded-full" style={{ width: `${utilizationRate}%` }} />
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Equipment in use</div>
                                </div>
                            </div>
                            {/* Second row: Equipment/User stats */}
                            <div className="md:col-span-2">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-6 bg-white dark:bg-transparent">
                                    <div className="flex items-center gap-4 mb-4">
                                        <Package className="w-8 h-8 text-yellow-400" />
                                        <span className="text-lg font-bold text-black dark:text-white">Checked Out</span>
                                    </div>
                                    <div className="text-4xl font-extrabold text-black dark:text-white mb-2">{checkedOutEquipment}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">In use</div>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-6 bg-white dark:bg-transparent">
                                    <div className="flex items-center gap-4 mb-4">
                                        <Wrench className="w-8 h-8 text-red-400" />
                                        <span className="text-lg font-bold text-black dark:text-white">Under Repair</span>
                                    </div>
                                    <div className="text-4xl font-extrabold text-black dark:text-white mb-2">{underRepairEquipment}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Maintenance</div>
                                </div>
                            </div>
                            <div className="md:col-span-1">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-6 bg-white dark:bg-transparent">
                                    <div className="flex items-center gap-4 mb-4">
                                        <Users className="w-8 h-8 text-blue-400" />
                                        <span className="text-lg font-bold text-black dark:text-white">Total Users</span>
                                    </div>
                                    <div className="text-4xl font-extrabold text-black dark:text-white mb-2">{totalUsers}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Registered</div>
                                </div>
                            </div>
                            <div className="md:col-span-1">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-6 bg-white dark:bg-transparent">
                                    <div className="flex items-center gap-4 mb-4">
                                        <Users className="w-8 h-8 text-green-400" />
                                        <span className="text-lg font-bold text-black dark:text-white">Active Users</span>
                                    </div>
                                    <div className="text-4xl font-extrabold text-black dark:text-white mb-2">{activeUsers}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Recently active</div>
                                </div>
                            </div>
                            {/* Third row: Request stats */}
                            <div className="md:col-span-1">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-6 bg-white dark:bg-transparent">
                                    <div className="flex items-center gap-4 mb-4">
                                        <ClipboardList className="w-8 h-8 text-yellow-400" />
                                        <span className="text-lg font-bold text-black dark:text-white">Pending Requests</span>
                                    </div>
                                    <div className="text-4xl font-extrabold text-black dark:text-white mb-2">{pendingRequests}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Awaiting approval</div>
                                </div>
                            </div>
                            <div className="md:col-span-1">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-6 bg-white dark:bg-transparent">
                                    <div className="flex items-center gap-4 mb-4">
                                        <CheckCircle2 className="w-8 h-8 text-green-400" />
                                        <span className="text-lg font-bold text-black dark:text-white">Approved Requests</span>
                                    </div>
                                    <div className="text-4xl font-extrabold text-black dark:text-white mb-2">{approvedRequests}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Approved</div>
                                </div>
                            </div>
                            <div className="md:col-span-1">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-6 bg-white dark:bg-transparent">
                                    <div className="flex items-center gap-4 mb-4">
                                        <XCircle className="w-8 h-8 text-red-400" />
                                        <span className="text-lg font-bold text-black dark:text-white">Rejected Requests</span>
                                    </div>
                                    <div className="text-4xl font-extrabold text-black dark:text-white mb-2">{rejectedRequests}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Rejected</div>
                                </div>
                            </div>
                            <div className="md:col-span-3">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-6 bg-white dark:bg-transparent">
                                    <div className="flex items-center gap-4 mb-4">
                                        <BarChartIcon className="w-8 h-8 text-purple-400" />
                                        <span className="text-lg font-bold text-black dark:text-white">Approval Rate</span>
                                    </div>
                                    <div className="text-4xl font-extrabold text-black dark:text-white mb-2">{approvalRate}%</div>
                                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full mt-2">
                                        <div className="h-2 bg-green-500 rounded-full" style={{ width: `${approvalRate}%` }} />
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Request approvals</div>
                                </div>
                            </div>
                            {/* Quick Actions and Recent Activity */}
                            <div className="md:col-span-3">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-6 bg-white dark:bg-transparent">
                                    <div className="font-bold text-lg mb-4 text-black dark:text-white">Quick Actions</div>
                                    <div className="flex flex-wrap gap-3">
                                        <Dialog open={addGearOpen} onOpenChange={setAddGearOpen}>
                                            <DialogTrigger asChild>
                                                <Button className="bg-blue-500 hover:bg-blue-600 text-white">+ Add Equipment</Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Add New Equipment</DialogTitle>
                                                </DialogHeader>
                                                <AddGearForm onSubmit={() => setAddGearOpen(false)} />
                                            </DialogContent>
                                        </Dialog>
                                        <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white">
                                            <Link href="/admin/manage-requests">Manage Requests</Link>
                                        </Button>
                                        <Button asChild className="bg-purple-500 hover:bg-purple-600 text-white">
                                            <Link href="/admin/reports">View Reports</Link>
                                        </Button>
                                        <Button asChild className="bg-green-500 hover:bg-green-600 text-white">
                                            <Link href="/admin/manage-users">User Management</Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-3">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-6 bg-white dark:bg-transparent">
                                    <div className="font-bold text-lg mb-4 text-black dark:text-white">Recent Activity</div>
                                    <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                                        <li>Check-in Activity – 1 day ago</li>
                                        <li>Request Approved – 2 days ago</li>
                                        <li>Equipment Added – 3 days ago</li>
                                        <li>User Registered – 4 days ago</li>
                                    </ul>
                                </div>
                            </div>
                            {/* Equipment Categories */}
                            <div className="md:col-span-6">
                                <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-6 bg-white dark:bg-transparent mt-8">
                                    <div className="font-bold text-lg mb-4 text-black dark:text-white">Equipment Categories</div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                                        {categories.map((cat) => (
                                            <div key={cat.name} className="border border-gray-300 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-transparent flex flex-col items-center">
                                                <span className="text-xl font-semibold text-black dark:text-white">{cat.name}</span>
                                                <span className="text-3xl font-extrabold text-blue-500 mt-2">{cat.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
