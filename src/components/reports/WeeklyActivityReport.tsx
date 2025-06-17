import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar
} from "recharts";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// UI Components
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Tooltip as UITooltip,
    TooltipTrigger,
    TooltipContent,
    TooltipProvider
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Icons
import {
    Loader2,
    FileText,
    FileSpreadsheet,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle,
    Users,
    Package,
    Activity,
    BarChart3,
    PieChart as PieChartIcon,
    Calendar,
    Target,
    Award,
    AlertCircle
} from "lucide-react";

// Services
import { WeeklyUsageReport, generateUsageReportForRange, UserStats, GearStats } from "@/services/report";
import { generateCsvReport, generateReportInsights, calculatePerformanceMetrics } from "@/services/reportExport";

// Color schemes
const CHART_COLORS = {
    primary: '#0D8ABC',
    success: '#32A852',
    warning: '#F59E0B',
    danger: '#E03A3F',
    info: '#6366F1'
};

const PIE_COLORS = ['#0D8ABC', '#32A852', '#F59E0B', '#E03A3F', '#6366F1', '#8B5CF6'];

interface WeeklyReportProps {
    dateRange: DateRange | undefined;
}

export function WeeklyActivityReport({ dateRange }: WeeklyReportProps) {
    const [report, setReport] = useState<WeeklyUsageReport | null>(null);
    const [previousReport, setPreviousReport] = useState<WeeklyUsageReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
    const [selectedGear, setSelectedGear] = useState<GearStats | null>(null);
    const [chartType, setChartType] = useState<'line' | 'bar' | 'pie'>('line');
    const reportRef = useRef<HTMLDivElement>(null);

    // Generate the report
    const generateReport = async () => {
        if (!dateRange?.from || !dateRange?.to) {
            setError('Please select a date range');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Generate current period report
            const currentReport = await generateUsageReportForRange(dateRange.from, dateRange.to);
            setReport(currentReport);

            // Generate comparison data for previous period
            const periodLength = dateRange.to.getTime() - dateRange.from.getTime();
            const previousStart = new Date(dateRange.from.getTime() - periodLength);
            const previousEnd = new Date(dateRange.to.getTime() - periodLength);

            try {
                const prevReport = await generateUsageReportForRange(previousStart, previousEnd);
                setPreviousReport(prevReport);
            } catch (compError) {
                console.warn('Could not generate comparison data:', compError);
                setPreviousReport(null);
            }

        } catch (err) {
            console.error('Error generating report:', err);
            setError('Failed to generate report. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Download as CSV
    const downloadAsCsv = () => {
        if (!report) return;
        generateCsvReport(report);
    };

    // Download as PDF
    const downloadAsPdf = async () => {
        if (!report) return;

        const pdf = new jsPDF('p', 'pt', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 40;
        const contentWidth = pageWidth - (margin * 2);
        let yPosition = margin;

        // Helper function to check if we need a new page
        const checkNewPage = (requiredHeight: number) => {
            if (yPosition + requiredHeight > pageHeight - margin) {
                pdf.addPage();
                yPosition = margin;
            }
        };

        // Helper function to add text with word wrapping
        const addText = (text: string, x: number, y: number, options: any = {}) => {
            const fontSize = options.fontSize || 12;
            const maxWidth = options.maxWidth || contentWidth;
            const color = options.color || [0, 0, 0];

            pdf.setFontSize(fontSize);
            pdf.setTextColor(color[0], color[1], color[2]);

            if (options.bold) {
                pdf.setFont('helvetica', 'bold');
            } else {
                pdf.setFont('helvetica', 'normal');
            }

            const lines = pdf.splitTextToSize(text, maxWidth);
            pdf.text(lines, x, y);
            return lines.length * fontSize * 1.2; // Return height used
        };

        // Title
        yPosition += addText('Weekly Activity Report', margin, yPosition, {
            fontSize: 20,
            bold: true,
            color: [51, 51, 51]
        });

        yPosition += 10;
        yPosition += addText(`Period: ${report.startDate} to ${report.endDate}`, margin, yPosition, {
            fontSize: 12,
            color: [102, 102, 102]
        });

        yPosition += 30;

        // Performance Metrics Section
        if (performanceMetrics) {
            checkNewPage(120);
            yPosition += addText('Performance Metrics', margin, yPosition, {
                fontSize: 16,
                bold: true,
                color: [51, 51, 51]
            });
            yPosition += 25;

            const metrics = [
                { label: 'Activity Change', value: `${performanceMetrics.activityChange >= 0 ? '+' : ''}${performanceMetrics.activityChange.toFixed(1)}%` },
                { label: 'Utilization Change', value: `${performanceMetrics.utilizationChange >= 0 ? '+' : ''}${performanceMetrics.utilizationChange.toFixed(1)}%` },
                { label: 'User Growth', value: `${performanceMetrics.userGrowth >= 0 ? '+' : ''}${performanceMetrics.userGrowth}` },
                { label: 'Trend', value: performanceMetrics.trend }
            ];

            // Create a 2x2 grid for better organization
            const colWidth = contentWidth / 2;
            const rowHeight = 50;

            metrics.forEach((metric, index) => {
                const row = Math.floor(index / 2);
                const col = index % 2;
                const x = margin + (col * colWidth);
                const y = yPosition + (row * rowHeight);

                addText(metric.label, x, y, { fontSize: 11, color: [102, 102, 102] });
                addText(metric.value, x, y + 18, { fontSize: 16, bold: true, color: [51, 51, 51] });
            });
            yPosition += Math.ceil(metrics.length / 2) * rowHeight + 25;
        }

        // Summary Section
        checkNewPage(180);
        yPosition += addText('Summary & Key Metrics', margin, yPosition, {
            fontSize: 16,
            bold: true,
            color: [51, 51, 51]
        });
        yPosition += 25;

        yPosition += addText(report.summary, margin, yPosition, {
            fontSize: 11,
            color: [51, 51, 51],
            maxWidth: contentWidth
        });
        yPosition += 25;

        // Key metrics in a well-organized grid
        const activeUsers = report.userStats.filter(user => user.requests > 0 || user.checkouts > 0 || user.checkins > 0).length;
        const keyMetrics = [
            { label: 'Active Users', value: activeUsers.toString() },
            { label: 'Utilization Rate', value: `${report.utilizationRate.toFixed(1)}%` },
            { label: 'Avg Request Duration', value: `${report.avgRequestDuration.toFixed(1)} days` },
            { label: 'Overdue Returns', value: report.overdueReturns.toString() },
            { label: 'Most Active User', value: report.mostActiveUser || 'N/A' },
            { label: 'Most Active Gear', value: report.mostActiveGear || 'N/A' }
        ];

        checkNewPage(140);
        const metricsPerRow = 3;
        const metricColWidth = contentWidth / metricsPerRow;
        const metricRowHeight = 45;

        keyMetrics.forEach((metric, index) => {
            const row = Math.floor(index / metricsPerRow);
            const col = index % metricsPerRow;
            const x = margin + (col * metricColWidth);
            const y = yPosition + (row * metricRowHeight);

            addText(metric.label, x, y, { fontSize: 11, color: [102, 102, 102] });
            addText(metric.value, x, y + 18, { fontSize: 14, bold: true, color: [51, 51, 51] });
        });
        yPosition += Math.ceil(keyMetrics.length / metricsPerRow) * metricRowHeight + 30;

        // Insights Section
        if (insights.length > 0) {
            checkNewPage(120);

            // Add a subtle separator line
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.5);
            pdf.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 15;

            yPosition += addText('Key Insights', margin, yPosition, {
                fontSize: 16,
                bold: true,
                color: [51, 51, 51]
            });
            yPosition += 25;

            insights.slice(0, 3).forEach((insight, index) => {
                checkNewPage(60);
                yPosition += addText(`• ${insight.title}`, margin, yPosition, {
                    fontSize: 12,
                    bold: true,
                    color: insight.type === 'danger' ? [220, 38, 38] : [51, 51, 51]
                });
                yPosition += addText(insight.description, margin + 15, yPosition + 5, {
                    fontSize: 10,
                    color: [102, 102, 102],
                    maxWidth: contentWidth - 15
                });
                yPosition += 15;
            });
            yPosition += 20;
        }

        // Recommendations Section
        if (recommendations.length > 0) {
            checkNewPage(100);
            yPosition += addText('Recommendations', margin, yPosition, {
                fontSize: 16,
                bold: true,
                color: [51, 51, 51]
            });
            yPosition += 20;

            recommendations.slice(0, 4).forEach((rec, index) => {
                checkNewPage(40);
                yPosition += addText(`• ${rec}`, margin, yPosition, {
                    fontSize: 11,
                    color: [51, 51, 51],
                    maxWidth: contentWidth
                });
                yPosition += 10;
            });
            yPosition += 20;
        }

        // User Activity Table
        const activeUserStats = report.userStats
            .filter(user => user.requests > 0 || user.checkouts > 0 || user.checkins > 0)
            .sort((a, b) => (b.requests + b.checkouts) - (a.requests + a.checkouts))
            .slice(0, 5);

        if (activeUserStats.length > 0) {
            checkNewPage(150);
            yPosition += addText('User Activity', margin, yPosition, {
                fontSize: 16,
                bold: true,
                color: [51, 51, 51]
            });
            yPosition += 30;

            // Table headers
            const colWidths = [contentWidth * 0.5, contentWidth * 0.15, contentWidth * 0.15, contentWidth * 0.2];
            const headers = ['User', 'Requests', 'Check-Outs', 'Overdue'];

            headers.forEach((header, index) => {
                const x = margin + colWidths.slice(0, index).reduce((sum: number, width: number) => sum + width, 0);
                addText(header, x, yPosition, { fontSize: 11, bold: true, color: [51, 51, 51] });
            });
            yPosition += 20;

            // Table rows
            activeUserStats.forEach((user, index) => {
                checkNewPage(25);
                const rowData = [user.name, user.requests.toString(), user.checkouts.toString(), user.overdue.toString()];

                rowData.forEach((data, colIndex) => {
                    const x = margin + colWidths.slice(0, colIndex).reduce((sum, width) => sum + width, 0);
                    addText(data, x, yPosition, {
                        fontSize: 10,
                        color: colIndex === 3 && user.overdue > 0 ? [220, 38, 38] : [51, 51, 51]
                    });
                });
                yPosition += 20;
            });
            yPosition += 20;
        }

        // Gear Activity Table
        const activeGearUsage = report.gearUsage
            .filter(gear => gear.requestCount > 0 || gear.checkoutCount > 0 || gear.checkinCount > 0)
            .sort((a, b) => (b.requestCount + b.checkoutCount) - (a.requestCount + a.checkoutCount))
            .slice(0, 5);

        if (activeGearUsage.length > 0) {
            checkNewPage(150);
            yPosition += addText('Top Gear Activity', margin, yPosition, {
                fontSize: 16,
                bold: true,
                color: [51, 51, 51]
            });
            yPosition += 30;

            // Table headers
            const gearColWidths = [contentWidth * 0.5, contentWidth * 0.15, contentWidth * 0.15, contentWidth * 0.2];
            const gearHeaders = ['Gear', 'Requests', 'Check-Outs', 'Status'];

            gearHeaders.forEach((header, index) => {
                const x = margin + gearColWidths.slice(0, index).reduce((sum: number, width: number) => sum + width, 0);
                addText(header, x, yPosition, { fontSize: 11, bold: true, color: [51, 51, 51] });
            });
            yPosition += 20;

            // Table rows
            activeGearUsage.forEach((gear, index) => {
                checkNewPage(25);
                const rowData = [
                    gear.gearName,
                    gear.requestCount.toString(),
                    gear.checkoutCount.toString(),
                    gear.status || '-'
                ];

                rowData.forEach((data, colIndex) => {
                    const x = margin + gearColWidths.slice(0, colIndex).reduce((sum: number, width: number) => sum + width, 0);
                    addText(data, x, yPosition, { fontSize: 10, color: [51, 51, 51] });
                });
                yPosition += 20;
            });
        }

        // Footer
        const pageCount = (pdf as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.setTextColor(102, 102, 102);
            pdf.text(`Generated on ${format(new Date(), 'PPP')} - Page ${i} of ${pageCount}`, margin, pageHeight - 20);
        }

        pdf.save(`weekly-activity-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    // Get insights and metrics
    const { insights, recommendations } = report ? generateReportInsights(report, previousReport || undefined) : { insights: [], recommendations: [] };
    const performanceMetrics = report && previousReport ? calculatePerformanceMetrics(report, previousReport) : null;

    // Prepare chart data
    const activityDistribution = report ? [
        { name: 'Requests', value: report.gearUsage.reduce((sum, gear) => sum + gear.requestCount, 0) },
        { name: 'Check-outs', value: report.gearUsage.reduce((sum, gear) => sum + gear.checkoutCount, 0) },
        { name: 'Check-ins', value: report.gearUsage.reduce((sum, gear) => sum + gear.checkinCount, 0) },
        { name: 'Damages', value: report.gearUsage.reduce((sum, gear) => sum + gear.damageCount, 0) }
    ].filter(item => item.value > 0) : [];

    return (
        <>
            <style jsx global>{`
                @media print {
                    body {
                        -webkit-print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        font-size: 12px !important;
                    }
                    .break-inside-avoid {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .print\\:block {
                        display: block !important;
                    }
                    .print\\:text-sm {
                        font-size: 0.875rem !important;
                        line-height: 1.25rem !important;
                    }
                    .print\\:text-xs {
                        font-size: 0.75rem !important;
                        line-height: 1rem !important;
                    }
                    .print\\:space-y-4 > * + * {
                        margin-top: 1rem !important;
                    }
                    .print\\:mb-4 {
                        margin-bottom: 1rem !important;
                    }
                    .print\\:text-xl {
                        font-size: 1.25rem !important;
                        line-height: 1.75rem !important;
                    }
                    .shadow-md {
                        box-shadow: none !important;
                    }
                    .grid {
                        gap: 0.75rem !important;
                    }
                    .space-y-6 > * + * {
                        margin-top: 1rem !important;
                    }
                    .mb-8 {
                        margin-bottom: 1.5rem !important;
                    }
                }
            `}</style>
            <Card className="shadow-md print:shadow-none" ref={reportRef}>
                <CardHeader className="print:pb-2">
                    <div className="flex items-center justify-between print:block">
                        <div className="flex items-center gap-2 print:mb-2">
                            <FileText className="h-5 w-5 text-primary print:h-4 print:w-4" />
                            <CardTitle className="text-lg print:text-base">Enhanced Weekly Activity Report</CardTitle>
                        </div>
                        <div className="flex items-center gap-2 print:hidden">
                            <Button
                                onClick={generateReport}
                                disabled={isLoading || !dateRange?.from || !dateRange?.to}
                                size="sm"
                                variant="outline"
                                className="h-9"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Activity className="mr-2 h-4 w-4" />
                                        Generate Report
                                    </>
                                )}
                            </Button>
                            {report && (
                                <div className="flex gap-2">
                                    <Button onClick={downloadAsCsv} size="sm" variant="outline" className="h-9">
                                        <FileSpreadsheet className="mr-2 h-4 w-4 text-green-500" />
                                        CSV
                                    </Button>
                                    <Button onClick={downloadAsPdf} size="sm" variant="outline" className="h-9">
                                        <FileText className="mr-2 h-4 w-4 text-blue-500" />
                                        PDF
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                    <CardDescription className="print:text-xs">
                        Enhanced analytics with insights, comparisons, and actionable recommendations
                        {report && ` (${report.startDate} to ${report.endDate})`}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {isLoading ? (
                        <div className="space-y-8">
                            <Skeleton className="h-8 w-1/2 mb-4" />
                            <Skeleton className="h-32 w-full mb-4" />
                            <Skeleton className="h-8 w-1/3 mb-4" />
                            <Skeleton className="h-48 w-full" />
                        </div>
                    ) : report ? (
                        <TooltipProvider>
                            <div className="space-y-6 print:space-y-4">

                                {/* Performance Metrics Cards */}
                                {performanceMetrics && (
                                    <div className="mb-8">
                                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                            <BarChart3 className="h-5 w-5" />
                                            Performance Metrics
                                        </h3>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            <Card className="border-l-4 border-l-blue-500">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs text-muted-foreground truncate">Activity Change</p>
                                                            <p className={`text-xl font-bold ${performanceMetrics.activityChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {performanceMetrics.activityChange >= 0 ? '+' : ''}{performanceMetrics.activityChange.toFixed(1)}%
                                                            </p>
                                                        </div>
                                                        {performanceMetrics.activityChange >= 0 ?
                                                            <TrendingUp className="h-6 w-6 text-green-600 flex-shrink-0" /> :
                                                            <TrendingDown className="h-6 w-6 text-red-600 flex-shrink-0" />
                                                        }
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="border-l-4 border-l-green-500">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs text-muted-foreground truncate">Utilization Change</p>
                                                            <p className={`text-xl font-bold ${performanceMetrics.utilizationChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {performanceMetrics.utilizationChange >= 0 ? '+' : ''}{performanceMetrics.utilizationChange.toFixed(1)}%
                                                            </p>
                                                        </div>
                                                        <Target className="h-6 w-6 text-green-600 flex-shrink-0" />
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="border-l-4 border-l-orange-500">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs text-muted-foreground truncate">User Growth</p>
                                                            <p className={`text-xl font-bold ${performanceMetrics.userGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {performanceMetrics.userGrowth >= 0 ? '+' : ''}{performanceMetrics.userGrowth}
                                                            </p>
                                                        </div>
                                                        <Users className="h-6 w-6 text-orange-600 flex-shrink-0" />
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="border-l-4 border-l-purple-500">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs text-muted-foreground truncate">Trend</p>
                                                            <p className="text-lg font-bold capitalize">{performanceMetrics.trend}</p>
                                                        </div>
                                                        <BarChart3 className="h-6 w-6 text-purple-600 flex-shrink-0" />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                )}

                                {/* Insights and Recommendations */}
                                {(insights.length > 0 || recommendations.length > 0) && (
                                    <div className="mb-8">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <Card className="h-fit">
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="flex items-center gap-2 text-base">
                                                        <AlertTriangle className="h-4 w-4" />
                                                        Key Insights
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-3">
                                                    {insights.length > 0 ? insights.slice(0, 3).map((insight, index) => (
                                                        <Alert key={index} variant={insight.type === 'danger' ? 'destructive' : 'default'} className="py-2">
                                                            <AlertCircle className="h-3 w-3" />
                                                            <AlertTitle className="text-sm">{insight.title}</AlertTitle>
                                                            <AlertDescription className="text-xs">{insight.description}</AlertDescription>
                                                        </Alert>
                                                    )) : (
                                                        <div className="flex items-center gap-2 text-green-600">
                                                            <CheckCircle className="h-4 w-4" />
                                                            <span className="text-sm">All metrics look healthy!</span>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>

                                            <Card className="h-fit">
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="flex items-center gap-2 text-base">
                                                        <Target className="h-4 w-4" />
                                                        Recommendations
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <ul className="space-y-2">
                                                        {recommendations.length > 0 ? recommendations.slice(0, 4).map((rec, index) => (
                                                            <li key={index} className="flex items-start gap-2">
                                                                <CheckCircle className="h-3 w-3 text-green-600 mt-1 flex-shrink-0" />
                                                                <span className="text-xs leading-relaxed">{rec}</span>
                                                            </li>
                                                        )) : (
                                                            <li className="flex items-center gap-2 text-green-600">
                                                                <Award className="h-4 w-4" />
                                                                <span className="text-sm">Keep up the excellent work!</span>
                                                            </li>
                                                        )}
                                                    </ul>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                )}

                                {/* Enhanced Charts */}
                                <div className="mb-8">
                                    {(() => {
                                        const hasActivityTrends = report.activityTrends && report.activityTrends.length > 0;
                                        const hasActivityDistribution = activityDistribution.length > 0;
                                        const chartCount = (hasActivityTrends ? 1 : 0) + (hasActivityDistribution ? 1 : 0);

                                        return (
                                            <div className={`grid gap-6 ${chartCount === 2 ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
                                                {/* Activity Trends */}
                                                {hasActivityTrends && (
                                                    <Card className="break-inside-avoid">
                                                        <CardHeader className="pb-3">
                                                            <div className="flex items-center justify-between">
                                                                <CardTitle className="flex items-center gap-2 text-base">
                                                                    <Activity className="h-4 w-4" />
                                                                    Activity Trends
                                                                </CardTitle>
                                                                <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
                                                                    <SelectTrigger className="w-20 h-8 text-xs">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="line">Line</SelectItem>
                                                                        <SelectItem value="bar">Bar</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <CardDescription className="text-xs">Daily activity patterns</CardDescription>
                                                        </CardHeader>
                                                        <CardContent className="pt-0">
                                                            <ResponsiveContainer width="100%" height={220}>
                                                                {chartType === 'line' ? (
                                                                    <LineChart data={report.activityTrends} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                                                        <CartesianGrid strokeDasharray="3 3" />
                                                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                                                        <YAxis tick={{ fontSize: 10 }} />
                                                                        <RechartsTooltip />
                                                                        <Legend />
                                                                        <Line type="monotone" dataKey="requests" stroke={CHART_COLORS.primary} strokeWidth={2} name="Requests" />
                                                                        <Line type="monotone" dataKey="checkouts" stroke={CHART_COLORS.success} strokeWidth={2} name="Check-Outs" />
                                                                        <Line type="monotone" dataKey="damages" stroke={CHART_COLORS.danger} strokeWidth={2} name="Damages" />
                                                                    </LineChart>
                                                                ) : (
                                                                    <BarChart data={report.activityTrends} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                                                        <CartesianGrid strokeDasharray="3 3" />
                                                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                                                        <YAxis tick={{ fontSize: 10 }} />
                                                                        <RechartsTooltip />
                                                                        <Legend />
                                                                        <Bar dataKey="requests" fill={CHART_COLORS.primary} name="Requests" />
                                                                        <Bar dataKey="checkouts" fill={CHART_COLORS.success} name="Check-Outs" />
                                                                        <Bar dataKey="damages" fill={CHART_COLORS.danger} name="Damages" />
                                                                    </BarChart>
                                                                )}
                                                            </ResponsiveContainer>
                                                        </CardContent>
                                                    </Card>
                                                )}

                                                {/* Activity Distribution */}
                                                {hasActivityDistribution && (
                                                    <Card className="break-inside-avoid">
                                                        <CardHeader className="pb-3">
                                                            <CardTitle className="flex items-center gap-2 text-base">
                                                                <PieChartIcon className="h-4 w-4" />
                                                                Activity Distribution
                                                            </CardTitle>
                                                            <CardDescription className="text-xs">Breakdown of all activities</CardDescription>
                                                        </CardHeader>
                                                        <CardContent className="pt-0">
                                                            <ResponsiveContainer width="100%" height={220}>
                                                                <PieChart>
                                                                    <Pie
                                                                        data={activityDistribution}
                                                                        cx="50%"
                                                                        cy="50%"
                                                                        outerRadius={70}
                                                                        fill="#8884d8"
                                                                        dataKey="value"
                                                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                                    >
                                                                        {activityDistribution.map((entry, index) => (
                                                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
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
                                    })()}
                                </div>

                                {/* Enhanced Summary */}
                                <div className="mb-8">
                                    <Card className="break-inside-avoid">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="flex items-center gap-2 text-base">
                                                <BarChart3 className="h-4 w-4" />
                                                Summary & Key Metrics
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{report.summary}</p>
                                            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                                                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                                    <p className="text-lg font-bold text-blue-600">
                                                        {report.userStats.filter(user => user.requests > 0 || user.checkouts > 0 || user.checkins > 0).length}
                                                    </p>
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
                                                    <p className="text-sm font-bold text-purple-600 truncate">{report.mostActiveUser || 'N/A'}</p>
                                                    <p className="text-xs text-muted-foreground">Top User</p>
                                                </div>
                                                <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg">
                                                    <p className="text-sm font-bold text-indigo-600 truncate">{report.mostActiveGear || 'N/A'}</p>
                                                    <p className="text-xs text-muted-foreground">Top Gear</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Enhanced Tables */}
                                <div className="space-y-6">
                                    {/* User Activity Table */}
                                    <Card className="break-inside-avoid">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="flex items-center gap-2 text-base">
                                                <Users className="h-4 w-4" />
                                                User Activity
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-muted/30">
                                                            <TableHead className="text-xs font-medium">User</TableHead>
                                                            <TableHead className="text-center text-xs font-medium w-20">Requests</TableHead>
                                                            <TableHead className="text-center text-xs font-medium w-20">Check-Outs</TableHead>
                                                            <TableHead className="text-center text-xs font-medium w-20">Overdue</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {report.userStats.filter(user => user.requests > 0 || user.checkouts > 0 || user.checkins > 0).length === 0 ? (
                                                            <TableRow>
                                                                <TableCell colSpan={4} className="text-center py-6 text-sm text-muted-foreground">
                                                                    No user activity for this period.
                                                                </TableCell>
                                                            </TableRow>
                                                        ) : (
                                                            report.userStats
                                                                .filter(user => user.requests > 0 || user.checkouts > 0 || user.checkins > 0)
                                                                .sort((a, b) => (b.requests + b.checkouts) - (a.requests + a.checkouts))
                                                                .slice(0, 5)
                                                                .map((user, idx) => (
                                                                    <TableRow key={user.id || idx} className="hover:bg-muted/30">
                                                                        <TableCell className="py-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <Avatar className="h-6 w-6">
                                                                                    <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                                                                                    <AvatarFallback className="text-xs">{user.name?.charAt(0)}</AvatarFallback>
                                                                                </Avatar>
                                                                                <span className="text-sm font-medium truncate">{user.name}</span>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-center text-sm py-2">{user.requests}</TableCell>
                                                                        <TableCell className="text-center text-sm py-2">{user.checkouts}</TableCell>
                                                                        <TableCell className="text-center py-2">
                                                                            {user.overdue > 0 ? (
                                                                                <Badge variant="destructive" className="text-xs">{user.overdue}</Badge>
                                                                            ) : (
                                                                                <span className="text-sm">{user.overdue}</span>
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Gear Activity Table */}
                                    <Card className="break-inside-avoid">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="flex items-center gap-2 text-base">
                                                <Package className="h-4 w-4" />
                                                Top Gear Activity
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-muted/30">
                                                            <TableHead className="text-xs font-medium">Gear</TableHead>
                                                            <TableHead className="text-center text-xs font-medium w-20">Requests</TableHead>
                                                            <TableHead className="text-center text-xs font-medium w-20">Check-Outs</TableHead>
                                                            <TableHead className="text-center text-xs font-medium w-24">Status</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {report.gearUsage.filter(gear => gear.requestCount > 0 || gear.checkoutCount > 0 || gear.checkinCount > 0).length === 0 ? (
                                                            <TableRow>
                                                                <TableCell colSpan={4} className="text-center py-6 text-sm text-muted-foreground">
                                                                    No gear activity for this period.
                                                                </TableCell>
                                                            </TableRow>
                                                        ) : (
                                                            report.gearUsage
                                                                .filter(gear => gear.requestCount > 0 || gear.checkoutCount > 0 || gear.checkinCount > 0)
                                                                .sort((a, b) => (b.requestCount + b.checkoutCount) - (a.requestCount + a.checkoutCount))
                                                                .slice(0, 5)
                                                                .map((gear, idx) => (
                                                                    <TableRow key={gear.id || idx} className="hover:bg-muted/30">
                                                                        <TableCell className="py-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <Avatar className="h-6 w-6">
                                                                                    <AvatarImage src={gear.image_url || undefined} alt={gear.gearName} />
                                                                                    <AvatarFallback className="text-xs">{gear.gearName?.charAt(0)}</AvatarFallback>
                                                                                </Avatar>
                                                                                <span className="text-sm font-medium truncate">{gear.gearName}</span>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-center text-sm py-2">{gear.requestCount}</TableCell>
                                                                        <TableCell className="text-center text-sm py-2">{gear.checkoutCount}</TableCell>
                                                                        <TableCell className="text-center py-2">
                                                                            {gear.status ? (
                                                                                <Badge variant="secondary" className="text-xs">{gear.status}</Badge>
                                                                            ) : (
                                                                                <span className="text-sm">-</span>
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </TooltipProvider>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Calendar className="h-16 w-16 mb-4 text-muted-foreground/50" />
                            <span className="text-lg font-semibold">No activity data for this period</span>
                            <span className="text-sm">Select a date range and click "Generate Report" to get started</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
} 