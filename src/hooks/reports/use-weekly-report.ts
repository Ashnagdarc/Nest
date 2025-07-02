/**
 * Weekly Report Hook
 * 
 * Custom hook for managing weekly activity report data.
 * Handles data fetching, processing, and state management.
 * 
 * @hook
 */

import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { WeeklyUsageReport, UserStats, GearStats, generateUsageReportForRange } from '@/services/report-client';
import { generateCsvReport, generateReportInsights, calculatePerformanceMetrics } from '@/services/reportExport';

export function useWeeklyReport() {
    const [report, setReport] = useState<WeeklyUsageReport | null>(null);
    const [previousReport, setPreviousReport] = useState<WeeklyUsageReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
    const [selectedGear, setSelectedGear] = useState<GearStats | null>(null);
    const [chartType, setChartType] = useState<'line' | 'bar' | 'pie'>('line');

    // Generate the report
    const generateReport = async (dateRange: DateRange | undefined) => {
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

    // Get insights and metrics
    const getInsightsAndMetrics = () => {
        if (!report) return { insights: [], recommendations: [], performanceMetrics: null };

        const { insights, recommendations } = generateReportInsights(report, previousReport || undefined);
        const performanceMetrics = report && previousReport ? calculatePerformanceMetrics(report, previousReport) : null;

        return { insights, recommendations, performanceMetrics };
    };

    // Prepare chart data
    const getChartData = () => {
        if (!report) return { activityDistribution: [], chartColors: [] };

        const activityDistribution = [
            { name: 'Requests', value: report.gearUsage.reduce((sum, gear) => sum + gear.requestCount, 0) },
            { name: 'Check-outs', value: report.gearUsage.reduce((sum, gear) => sum + gear.checkoutCount, 0) },
            { name: 'Check-ins', value: report.gearUsage.reduce((sum, gear) => sum + gear.checkinCount, 0) },
            { name: 'Damages', value: report.gearUsage.reduce((sum, gear) => sum + gear.damageCount, 0) }
        ].filter(item => item.value > 0);

        const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

        return { activityDistribution, chartColors };
    };

    return {
        // Data
        report,
        previousReport,
        selectedUser,
        selectedGear,

        // State
        isLoading,
        error,
        chartType,

        // Actions
        generateReport,
        downloadAsCsv,
        setSelectedUser,
        setSelectedGear,
        setChartType,

        // Computed data
        getInsightsAndMetrics,
        getChartData,
    };
} 