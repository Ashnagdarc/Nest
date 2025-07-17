/**
 * Report Metrics Component
 * 
 * Displays performance metrics and key statistics for weekly activity reports.
 * Shows comparison data and trend indicators.
 * 
 * @component
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Users } from 'lucide-react';
import { WeeklyUsageReport } from '@/services/report-client';

interface PerformanceMetrics {
    activityChange: number;
    utilizationChange: number;
    userGrowth: number;
    trend: string;
}

interface ReportMetricsProps {
    report: WeeklyUsageReport;
    performanceMetrics?: PerformanceMetrics | null;
}

export function ReportMetrics({ report, performanceMetrics }: ReportMetricsProps) {
    const activeUsers = report.userStats.filter(user => user.requests > 0 || user.checkouts > 0 || user.checkins > 0).length;

    return (
        <div className="space-y-6">
            {/* Performance Metrics (if comparison data available) */}
            {performanceMetrics && (
                <Card className="break-inside-avoid">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Performance Comparison</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    {performanceMetrics.activityChange >= 0 ? (
                                        <TrendingUp className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <TrendingDown className="h-4 w-4 text-red-600" />
                                    )}
                                    <span className={`text-sm font-bold ${performanceMetrics.activityChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {performanceMetrics.activityChange >= 0 ? '+' : ''}{performanceMetrics.activityChange.toFixed(1)}%
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">Activity Change</p>
                            </div>

                            <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    {performanceMetrics.utilizationChange >= 0 ? (
                                        <TrendingUp className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <TrendingDown className="h-4 w-4 text-red-600" />
                                    )}
                                    <span className={`text-sm font-bold ${performanceMetrics.utilizationChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {performanceMetrics.utilizationChange >= 0 ? '+' : ''}{performanceMetrics.utilizationChange.toFixed(1)}%
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">Utilization</p>
                            </div>

                            <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    <Users className="h-4 w-4 text-purple-600" />
                                    <span className={`text-sm font-bold ${performanceMetrics.userGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {performanceMetrics.userGrowth >= 0 ? '+' : ''}{performanceMetrics.userGrowth}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">User Growth</p>
                            </div>

                            <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    <Badge variant={performanceMetrics.trend === 'Improving' ? 'default' : 'secondary'}>
                                        {performanceMetrics.trend}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">Trend</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Summary Metrics */}
            <Card className="break-inside-avoid">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Summary Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                            <p className="text-lg font-bold text-blue-600">{activeUsers}</p>
                            <p className="text-xs text-muted-foreground">Active Users</p>
                        </div>

                        <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                            <p className="text-lg font-bold text-green-600">{report.utilizationRate.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">Utilization</p>
                        </div>

                        <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                            <p className="text-lg font-bold text-orange-600">{report.avgRequestDuration.toFixed(1)}</p>
                            <p className="text-xs text-muted-foreground">Avg Days</p>
                        </div>

                        <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                            <p className="text-lg font-bold text-red-600">{report.overdueReturns}</p>
                            <p className="text-xs text-muted-foreground">Overdue</p>
                        </div>

                        <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                            <p className="text-lg font-bold text-purple-600">{report.totalRequests}</p>
                            <p className="text-xs text-muted-foreground">Requests</p>
                        </div>

                        <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg">
                            <p className="text-lg font-bold text-indigo-600">{report.gearUsage.length}</p>
                            <p className="text-xs text-muted-foreground">Active Gear</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Top Performers */}
            <Card className="break-inside-avoid">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Top Performers</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">Most Active User</h4>
                            <p className="text-lg font-semibold">{report.mostActiveUser || 'N/A'}</p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">Most Active Gear</h4>
                            <p className="text-lg font-semibold">{report.mostActiveGear || 'N/A'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 