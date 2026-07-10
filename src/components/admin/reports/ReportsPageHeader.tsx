"use client";

import { Download, RefreshCw } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import PageHeader from '@/components/foundation/PageHeader';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ReportsPageHeaderProps {
    dateRange: DateRange | undefined;
    onDateRangeChange: (range: DateRange | undefined) => void;
    onRefresh: () => void;
    onExportExcel: () => void;
    onExportCsv: () => void;
    loading?: boolean;
    rangeLabel?: string;
}

export function ReportsPageHeader({
    dateRange,
    onDateRangeChange,
    onRefresh,
    onExportExcel,
    onExportCsv,
    loading = false,
    rangeLabel,
}: ReportsPageHeaderProps) {
    return (
        <PageHeader
            title="Reports & Analytics"
            subtitle={rangeLabel}
            actions={(
                <div className="flex flex-wrap items-center gap-2">
                    <DatePickerWithRange dateRange={dateRange} onDateRangeChange={onDateRangeChange} />
                    <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading} aria-label="Refresh report">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" disabled={loading}>
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={onExportExcel}>
                                Excel report (.xls)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onExportCsv}>
                                CSV data (.csv)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
        />
    );
}
