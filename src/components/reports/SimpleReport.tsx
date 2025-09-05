/**
 * Simple Report Component
 * 
 * A clean, simplified report interface that works with existing database tables.
 * No complex dependencies or broken table references.
 * 
 * @component
 */

import React, { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, FileSpreadsheet, Loader2, Download, BarChart3, Users, Package, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';

interface SimpleReportProps {
    dateRange: DateRange | undefined;
}

interface ReportData {
    // Summary metrics
    totalGears: number;
    totalAvailableGears: number;
    totalCheckedOutGears: number;
    utilizationRate: number;
    totalUsers: number;
    activeUsers: number;

    // Request metrics
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;

    // Activity metrics
    totalCheckins: number;
    checkouts: number;
    checkins_count: number;
    totalMaintenance: number;
    damageReports: number;

    // Data arrays
    popularGears: Array<{ name: string; category?: string; count: number }>;
    recentActivity: Array<{
        id: string;
        type: string;
        timestamp: string;
        status: string;
        userName: string;
        gearName: string;
        gearCategory?: string;
        notes: string;
    }>;
    weeklyTrends: Array<{
        week: string;
        weekLabel: string;
        requests: number;
        damages: number;
        checkouts: number;
        checkins: number;
    }>;
}

export function SimpleReport({ dateRange }: SimpleReportProps) {
    const [report, setReport] = useState<ReportData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Generate the report
    const generateReport = async () => {
        if (!dateRange?.from || !dateRange?.to) {
            setError('Please select a date range');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/admin/simple-reports?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`);

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            if (!result.data) {
                throw new Error('No data received from reports API');
            }

            setReport(result.data);
        } catch (err) {
            console.error('Error generating report:', err);
            setError('Failed to generate report. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Download handlers (simplified)
    const downloadAsCsv = () => {
        if (!report) return;

        const csvData = [
            ['Metric', 'Value'],
            ['Total Gears', report.totalGears],
            ['Available Gears', report.totalAvailableGears],
            ['Checked Out Gears', report.totalCheckedOutGears],
            ['Utilization Rate', `${report.utilizationRate}%`],
            ['Total Users', report.totalUsers],
            ['Active Users', report.activeUsers],
            ['Total Requests', report.totalRequests],
            ['Pending Requests', report.pendingRequests],
            ['Approved Requests', report.approvedRequests],
            ['Rejected Requests', report.rejectedRequests],
            ['Total Check-ins', report.totalCheckins],
            ['Check-outs', report.checkouts],
            ['Check-ins', report.checkins_count],
            ['Total Maintenance', report.totalMaintenance],
            ['Damage Reports', report.damageReports]
        ];

        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gear-report-${dateRange?.from?.toISOString().split('T')[0]}-to-${dateRange?.to?.toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const downloadAsPdf = () => {
        // Simple PDF generation using browser print
        window.print();
    };

    // Chart colors
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
        <div className="space-y-6">
            {/* Header with Actions */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                Equipment Usage Report
                            </CardTitle>
                            {dateRange?.from && dateRange?.to && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={generateReport} disabled={isLoading || !dateRange?.from || !dateRange?.to}>
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Generate Report
                            </Button>

                            {report && (
                                <>
                                    <Button variant="outline" onClick={downloadAsCsv}>
                                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                                        CSV
                                    </Button>
                                    <Button variant="outline" onClick={downloadAsPdf}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        PDF
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Error Display */}
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Loading State */}
            {isLoading && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-64 w-full" />
                            <div className="grid grid-cols-3 gap-4">
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Report Content */}
            {report && !isLoading && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Equipment</CardTitle>
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{report.totalGears}</div>
                                <p className="text-xs text-muted-foreground">
                                    {report.totalAvailableGears} available
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{report.utilizationRate}%</div>
                                <p className="text-xs text-muted-foreground">
                                    {report.totalCheckedOutGears} checked out
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{report.totalRequests}</div>
                                <p className="text-xs text-muted-foreground">
                                    {report.pendingRequests} pending
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{report.activeUsers}</div>
                                <p className="text-xs text-muted-foreground">
                                    of {report.totalUsers} total users
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Activity Overview */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Activity Overview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={report.weeklyTrends}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="weekLabel" />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="requests" fill="#3b82f6" name="Requests" />
                                            <Bar dataKey="checkouts" fill="#10b981" name="Check-outs" />
                                            <Bar dataKey="checkins" fill="#f59e0b" name="Check-ins" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Request Status Distribution */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Request Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Approved', value: report.approvedRequests, color: '#10b981' },
                                                    { name: 'Pending', value: report.pendingRequests, color: '#f59e0b' },
                                                    { name: 'Rejected', value: report.rejectedRequests, color: '#ef4444' }
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {[
                                                    { name: 'Approved', value: report.approvedRequests, color: '#10b981' },
                                                    { name: 'Pending', value: report.pendingRequests, color: '#f59e0b' },
                                                    { name: 'Rejected', value: report.rejectedRequests, color: '#ef4444' }
                                                ].map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Popular Gears */}
                    {report.popularGears.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Most Popular Equipment</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {report.popularGears.map((gear, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{gear.name}</p>
                                                    {gear.category && (
                                                        <p className="text-sm text-muted-foreground">{gear.category}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge variant="secondary">{gear.count} requests</Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Recent Activity */}
                    {report.recentActivity.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Activity</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {report.recentActivity.slice(0, 10).map((activity) => (
                                        <div key={activity.id} className="flex items-center gap-3 p-3 border rounded-lg">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                                                {activity.userName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm">
                                                    <span className="font-medium">{activity.userName}</span>{' '}
                                                    <span className="text-muted-foreground">{activity.notes}</span>
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(activity.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                            <Badge
                                                variant={
                                                    activity.status === 'Approved' ? 'default' :
                                                        activity.status === 'Rejected' ? 'destructive' :
                                                            activity.status === 'Pending' ? 'secondary' : 'outline'
                                                }
                                                className="text-xs"
                                            >
                                                {activity.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* No Data State */}
            {!report && !isLoading && !error && (
                <Card>
                    <CardContent className="pt-12 pb-12 text-center">
                        <p className="text-muted-foreground">
                            Select a date range and click "Generate Report" to view equipment usage data.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
