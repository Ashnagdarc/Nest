"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminReportData } from '@/lib/reports/types';

const STATUS_COLORS = ['#2563eb', '#f59e0b', '#ef4444', '#10b981', '#64748b', '#8b5cf6'];

interface ReportChartsProps {
    report: AdminReportData | null;
    loading?: boolean;
}

function ChartSkeleton({ height = 280 }: { height?: number }) {
    return <div className="animate-pulse rounded-md bg-muted" style={{ height }} />;
}

export function ReportCharts({ report, loading = false }: ReportChartsProps) {
    const trendData = report?.trends || [];
    const hasTrendActivity = trendData.some((point) =>
        point.requests > 0 || point.checkouts > 0 || point.checkins > 0 || point.damages > 0
    );

    return (
        <div className="grid gap-4 xl:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Daily activity</CardTitle>
                    <CardDescription>Requests, check-outs, and check-ins per day</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    {loading ? (
                        <ChartSkeleton height={300} />
                    ) : hasTrendActivity ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="requests" name="Requests" stroke="#2563eb" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="checkouts" name="Check-outs" stroke="#10b981" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="checkins" name="Check-ins" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            No activity in this date range
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Request status</CardTitle>
                    <CardDescription>How requests ended up in this period</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    {loading ? (
                        <ChartSkeleton height={300} />
                    ) : (report?.requestStatus.length || 0) > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={report?.requestStatus}
                                    dataKey="count"
                                    nameKey="status"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={95}
                                    paddingAngle={2}
                                >
                                    {report?.requestStatus.map((entry, index) => (
                                        <Cell key={entry.status} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            No requests in this date range
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="xl:col-span-2">
                <CardHeader>
                    <CardTitle className="text-base">Popular gear</CardTitle>
                    <CardDescription>Top requested items by units requested</CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                    {loading ? (
                        <ChartSkeleton height={320} />
                    ) : (report?.popularGear.length || 0) > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={report?.popularGear.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="unitsRequested" name="Units requested" fill="#2563eb" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="requestCount" name="Request lines" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            No gear request data in this date range
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
