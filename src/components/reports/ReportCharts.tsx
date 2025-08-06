/**
 * Report Charts Component
 * 
 * Chart components for displaying weekly activity report data.
 * Supports multiple chart types and interactive data visualization.
 * 
 * @component
 */

import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WeeklyUsageReport } from '@/services/report-client';

const CHART_COLORS = {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    purple: '#8b5cf6'
};

interface ReportChartsProps {
    report: WeeklyUsageReport;
    chartType: 'line' | 'bar' | 'pie';
    onChartTypeChange: (type: 'line' | 'bar' | 'pie') => void;
    activityDistribution: Array<{ name: string; value: number }>;
    chartColors: string[];
}

export function ReportCharts({
    report,
    chartType,
    onChartTypeChange,
    activityDistribution,
    chartColors
}: ReportChartsProps) {
    return (
        <div className="grid gap-6">
            {/* Summary Statistics Chart */}
            <Card className="break-inside-avoid">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Activity Summary</CardTitle>
                        <Select value={chartType} onValueChange={onChartTypeChange}>
                            <SelectTrigger className="w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bar">Bar</SelectItem>
                                <SelectItem value="pie">Pie</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>

                <CardContent className="pt-0">
                    <ResponsiveContainer width="100%" height={220}>
                        {chartType === 'bar' ? (
                            <BarChart
                                data={[
                                    { name: 'Requests', value: report.totalRequests },
                                    { name: 'Check-outs', value: report.totalCheckouts },
                                    { name: 'Check-ins', value: report.totalCheckins },
                                    { name: 'Active Users', value: report.uniqueUsers }
                                ]}
                                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <RechartsTooltip />
                                <Bar dataKey="value" fill={CHART_COLORS.primary} />
                            </BarChart>
                        ) : (
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Requests', value: report.totalRequests },
                                        { name: 'Check-outs', value: report.totalCheckouts },
                                        { name: 'Check-ins', value: report.totalCheckins }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {chartColors.map((color, index) => (
                                        <Cell key={`cell-${index}`} fill={color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        )}
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Activity Distribution Pie Chart */}
            {activityDistribution.length > 0 && (
                <Card className="break-inside-avoid">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Activity Distribution</CardTitle>
                    </CardHeader>

                    <CardContent className="pt-0">
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={activityDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {activityDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}
        </div>
    );
} 