"use client";

import { Alert, AlertDescription } from '@/components/ui/alert';
import { ReportActivityTable } from '@/components/admin/reports/ReportActivityTable';
import { ReportCharts } from '@/components/admin/reports/ReportCharts';
import { ReportsPageHeader } from '@/components/admin/reports/ReportsPageHeader';
import { ReportStatsCards } from '@/components/admin/reports/ReportStatsCards';
import { useReports } from '@/hooks/admin/useReports';
import { downloadReportCsv, downloadReportExcel } from '@/lib/reports/export-report';
import { useToast } from '@/hooks/use-toast';

export default function ReportsPage() {
    const { dateRange, setDateRange, report, loading, error, refresh } = useReports();
    const { toast } = useToast();

    const handleExportExcel = () => {
        if (!report?.export) {
            toast({
                title: 'Report not ready',
                description: 'Refresh the page to load the latest report data, then export again.',
                variant: 'destructive',
            });
            return;
        }

        downloadReportExcel(report);
        toast({
            title: 'Report exported',
            description: 'Your operations report download should start shortly.',
        });
    };

    const handleExportCsv = () => {
        if (!report?.export) {
            toast({
                title: 'Report not ready',
                description: 'Refresh the page to load the latest report data, then export again.',
                variant: 'destructive',
            });
            return;
        }

        downloadReportCsv(report);
        toast({
            title: 'CSV exported',
            description: 'Your CSV download should start shortly.',
        });
    };

    return (
        <div className="space-y-6">
            <ReportsPageHeader
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                onRefresh={() => void refresh()}
                onExportExcel={handleExportExcel}
                onExportCsv={handleExportCsv}
                loading={loading}
                rangeLabel={report?.range.label}
            />

            {error ? (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            ) : null}

            <ReportStatsCards
                summary={report?.summary || null}
                topGearName={report?.popularGear[0]?.name}
                loading={loading}
            />

            <ReportCharts report={report} loading={loading} />

            <ReportActivityTable activity={report?.activity || []} loading={loading} />
        </div>
    );
}
