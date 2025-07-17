/**
 * Weekly Activity Report Component
 * 
 * Clean, refactored weekly activity report interface.
 * Orchestrates multiple focused components and hooks.
 * 
 * @component
 */

import React, { useRef } from 'react';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { ReportCharts, ReportMetrics } from './index';
import { generateCsvReport, generatePdfReport } from '@/services/reportExport';
import { WeeklyUsageReport, generateUsageReportForRange } from '@/services/report-client';
import { generateReportInsights, calculatePerformanceMetrics } from '@/services/reportExport';

interface WeeklyReportProps {
    dateRange: DateRange | undefined;
}

// Type definitions for insights to ensure proper rendering
interface InsightObject {
    type: string;
    title: string;
    description: string;
    priority: string;
}

export function WeeklyActivityReport({ dateRange }: WeeklyReportProps) {
    const reportRef = useRef<HTMLDivElement>(null);

    // Simplified state
    const [report, setReport] = React.useState<WeeklyUsageReport | null>(null);
    const [previousReport, setPreviousReport] = React.useState<WeeklyUsageReport | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [chartType, setChartType] = React.useState<'line' | 'bar' | 'pie'>('bar');

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

    // Download handlers
    const downloadAsCsv = () => {
        if (!report) return;
        generateCsvReport(report);
    };

    const downloadAsPdf = () => {
        if (!report) return;
        generatePdfReport(report, 'Weekly Activity Report');
    };

    // Get insights and metrics
    const { insights, recommendations, performanceMetrics } = React.useMemo(() => {
        if (!report) return { insights: [], recommendations: [], performanceMetrics: null };

        const { insights, recommendations } = generateReportInsights(report, previousReport || undefined);
        const performanceMetrics = report && previousReport ? calculatePerformanceMetrics(report, previousReport) : null;

        return { insights, recommendations, performanceMetrics };
    }, [report, previousReport]);

    // Helper function to safely render insights
    const renderInsight = (insight: unknown): string => {
        if (typeof insight === 'object' && insight !== null && 'description' in insight) {
            return (insight as InsightObject).description;
        }
        return String(insight);
    };

    // Helper function to safely render recommendations
    const renderRecommendation = (recommendation: unknown): string => {
        if (typeof recommendation === 'object' && recommendation !== null && 'description' in recommendation) {
            return (recommendation as InsightObject).description;
        }
        return String(recommendation);
    };

    // Prepare chart data
    const { activityDistribution, chartColors } = React.useMemo(() => {
        if (!report) return { activityDistribution: [], chartColors: [] };

        const activityDistribution = [
            { name: 'Requests', value: report.gearUsage.reduce((sum, gear) => sum + gear.requestCount, 0) },
            { name: 'Check-outs', value: report.gearUsage.reduce((sum, gear) => sum + gear.checkoutCount, 0) },
            { name: 'Check-ins', value: report.gearUsage.reduce((sum, gear) => sum + gear.checkinCount, 0) },
            { name: 'Damages', value: report.gearUsage.reduce((sum, gear) => sum + gear.damageCount, 0) }
        ].filter(item => item.value > 0);

        const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

        return { activityDistribution, chartColors };
    }, [report]);

    return (
        <div ref={reportRef} className="space-y-6">
            {/* Header with Actions */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle>Weekly Activity Report</CardTitle>
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
                    {/* Report Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">{report.summary}</p>
                        </CardContent>
                    </Card>

                    {/* Performance Metrics */}
                    <ReportMetrics
                        report={report}
                        performanceMetrics={performanceMetrics}
                    />

                    {/* Charts */}
                    <ReportCharts
                        report={report}
                        chartType={chartType}
                        onChartTypeChange={setChartType}
                        activityDistribution={activityDistribution}
                        chartColors={chartColors}
                    />

                    {/* Insights & Recommendations */}
                    {(insights.length > 0 || recommendations.length > 0) && (
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Insights */}
                            {insights.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Key Insights</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2">
                                            {insights.slice(0, 5).map((insight, index) => (
                                                <li key={index} className="text-sm text-muted-foreground">
                                                    • {renderInsight(insight)}
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Recommendations */}
                            {recommendations.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Recommendations</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2">
                                            {recommendations.slice(0, 5).map((recommendation, index) => (
                                                <li key={index} className="text-sm text-muted-foreground">
                                                    • {renderRecommendation(recommendation)}
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* No Data State */}
            {!report && !isLoading && !error && (
                <Card>
                    <CardContent className="pt-12 pb-12 text-center">
                        <p className="text-muted-foreground">
                            Select a date range and click "Generate Report" to view activity data.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
} 