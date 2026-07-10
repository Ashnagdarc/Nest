import type { AdminReportData } from '@/lib/reports/types';

/** Show "-" instead of 0 for cleaner spreadsheet readability */
export function cell(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number' && value === 0) return '-';
    if (typeof value === 'string' && value.trim() === '') return '-';
    return String(value);
}

export function escapeHtml(value: string | number | null | undefined, preserveZero = false): string {
    const text = preserveZero ? String(value ?? '') : cell(value);
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function escapeCsv(value: string | number | null | undefined, preserveZero = false): string {
    const text = preserveZero ? String(value ?? '') : cell(value);
    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

export function percentOf(value: number, total: number): string {
    if (total <= 0 || value === 0) return '-';
    return `${Math.round((value / total) * 100)}%`;
}

export function reportFilenameStem(report: AdminReportData): string {
    return `nest-report-${report.range.from.slice(0, 10)}-to-${report.range.to.slice(0, 10)}`;
}

export function sumRow(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0);
}
