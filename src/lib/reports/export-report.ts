import { format } from 'date-fns';
import type { AdminReportData } from '@/lib/reports/types';
import { cell, escapeCsv, escapeHtml, percentOf, reportFilenameStem, sumRow } from '@/lib/reports/export-helpers';

const EXPORT_STYLES = `
  body { font-family: Calibri, Arial, sans-serif; color: #111827; margin: 28px; }
  h1 { font-size: 22pt; margin: 0 0 4px; font-weight: 700; }
  .meta { color: #6b7280; font-size: 10pt; margin-bottom: 28px; }
  h2 { font-size: 11pt; margin: 32px 0 10px; padding: 10px 12px; background: #1e40af; color: #fff; font-weight: 600; }
  .kpi-grid { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  .kpi-grid td { width: 25%; padding: 14px 12px; border: 1px solid #dbeafe; background: #f8fbff; vertical-align: top; }
  .kpi-value { font-size: 18pt; font-weight: 700; color: #1e40af; line-height: 1.1; }
  .kpi-label { font-size: 9pt; color: #64748b; margin-top: 4px; }
  table.data { border-collapse: collapse; width: 100%; margin-bottom: 6px; font-size: 10pt; }
  table.data th { background: #1e40af; color: #fff; padding: 9px 10px; text-align: left; font-weight: 600; }
  table.data td { padding: 8px 10px; border: 1px solid #e5e7eb; vertical-align: top; }
  table.data tr:nth-child(even) td { background: #f9fafb; }
  table.data tr.total td { background: #dbeafe; font-weight: 700; }
  .num { text-align: right; white-space: nowrap; }
  .note { color: #6b7280; font-size: 9pt; margin: 0 0 12px; }
  .empty { color: #6b7280; font-style: italic; padding: 12px 0; }
`;

function csvSection(title: string, rows: Array<Array<string | number>>): string[] {
    return [
        title.toUpperCase(),
        ...rows.map((row) => {
            const isTotal = row[0] === 'Period total' || row[0] === 'Total';
            return row.map((value) => escapeCsv(value, isTotal)).join(',');
        }),
        '',
    ];
}

function htmlTable(headers: string[], rows: Array<Array<string | number>>, numericColumns: number[] = []): string {
    if (rows.length === 0) {
        return '<p class="empty">No records for this period.</p>';
    }

    const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('');
    const body = rows
        .map((row) => {
            const isTotal = row[0] === 'Period total' || row[0] === 'Total';
            const cells = row
                .map((value, colIndex) => {
                    const className = numericColumns.includes(colIndex) ? ' class="num"' : '';
                    return `<td${className}>${escapeHtml(value, isTotal)}</td>`;
                })
                .join('');
            return `<tr${isTotal ? ' class="total"' : ''}>${cells}</tr>`;
        })
        .join('');

    return `<table class="data"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function kpiCard(value: string | number, label: string): string {
    return `<td><div class="kpi-value">${escapeHtml(value)}</div><div class="kpi-label">${escapeHtml(label)}</div></td>`;
}

function buildKpiGrid(report: AdminReportData): string {
    const { kpis } = report.export;
    return `<table class="kpi-grid"><tr>
      ${kpiCard(kpis.gearsUsed, 'Gears used')}
      ${kpiCard(kpis.damagedGears, 'Damage reports')}
      ${kpiCard(kpis.maintenanceDone, 'Maintenance done')}
      ${kpiCard(kpis.carsBooked, 'Car bookings')}
    </tr><tr>
      ${kpiCard(kpis.carsReturned, 'Cars returned')}
      ${kpiCard(kpis.carsNotReturned, 'Cars not returned')}
      ${kpiCard(kpis.carsInMaintenance, 'Cars in maintenance')}
      ${kpiCard(kpis.gearInMaintenance, 'Gear in maintenance')}
    </tr></table>`;
}

function dailyOperationsRows(report: AdminReportData) {
    const rows = report.export.dailyOperations.map((row) => [
        row.label,
        row.gearRequests,
        row.gearReturns,
        row.gearCheckouts,
        row.damages,
        row.carBookings,
        row.carReturns,
    ]);

    if (rows.length === 0) return rows;

    rows.push([
        'Period total',
        sumRow(report.export.dailyOperations.map((row) => row.gearRequests)),
        sumRow(report.export.dailyOperations.map((row) => row.gearReturns)),
        sumRow(report.export.dailyOperations.map((row) => row.gearCheckouts)),
        sumRow(report.export.dailyOperations.map((row) => row.damages)),
        sumRow(report.export.dailyOperations.map((row) => row.carBookings)),
        sumRow(report.export.dailyOperations.map((row) => row.carReturns)),
    ]);

    return rows;
}

function gearUsageRows(report: AdminReportData) {
    return report.export.gearUsage.map((row, index) => [
        index + 1,
        row.name,
        row.category,
        row.unitsRequested,
        row.requestLines,
        row.returns,
        row.checkouts,
        row.damageReports,
    ]);
}

export function buildReportCsv(report: AdminReportData): string {
    const generatedAt = format(new Date(), 'yyyy-MM-dd HH:mm');
    const sections = report.export;
    const { kpis } = sections;
    const totalUnits = sumRow(sections.gearUsage.map((row) => row.unitsRequested));

    const lines: string[] = [
        'NEST OPERATIONS REPORT',
        `Generated,${generatedAt}`,
        `Reporting period,${report.range.label}`,
        '',
        'KEY METRICS',
        'Metric,Value',
        ['Gears used (unique)', kpis.gearsUsed].join(','),
        ['Gear units requested', kpis.gearUnitsRequested].join(','),
        ['Gear returns', kpis.gearReturns].join(','),
        ['Damage reports', kpis.damagedGears].join(','),
        ['Maintenance records', kpis.maintenanceDone].join(','),
        ['Gear in maintenance (now)', kpis.gearInMaintenance].join(','),
        ['Car bookings', kpis.carsBooked].join(','),
        ['Cars returned', kpis.carsReturned].join(','),
        ['Cars not returned', kpis.carsNotReturned].join(','),
        ['Cars in maintenance (now)', kpis.carsInMaintenance].join(','),
        ['Active car trips', kpis.activeCarTrips].join(','),
        ['Pending car bookings', kpis.pendingCarBookings].join(','),
        ['Unique car bookers', kpis.uniqueCarBookers].join(','),
        ['Fleet available / total', `${kpis.fleetAvailable} / ${kpis.fleetTotal}`].join(','),
        '',
        ...csvSection('Daily operations (active days only)', [
            ['Date', 'Gear requests', 'Gear returns', 'Gear check-outs', 'Damages', 'Car bookings', 'Car returns'],
            ...dailyOperationsRows(report),
        ]),
        ...csvSection('Gear usage this period', [
            ['Rank', 'Gear', 'Category', 'Units requested', 'Request lines', 'Returns', 'Check-outs', 'Damage reports'],
            ...gearUsageRows(report),
        ]),
        ...csvSection('Damaged gear', [
            ['Date', 'Gear', 'Category', 'Reported by', 'Source', 'Notes'],
            ...sections.damagedGears.map((row) => [row.date, row.gearName, row.category, row.reportedBy, row.source, row.notes]),
        ]),
        ...csvSection('Maintenance completed', [
            ['Date', 'Gear', 'Type', 'Status', 'Description'],
            ...sections.maintenance.map((row) => [row.date, row.gearName, row.type, row.status, row.description]),
        ]),
        ...csvSection('Car bookings', [
            ['Date', 'Time slot', 'Employee', 'Car', 'Destination', 'Purpose', 'Status', 'Returned'],
            ...sections.carBookings.map((row) => [
                row.date, row.timeSlot, row.employee, row.car, row.destination, row.purpose, row.status, row.returned,
            ]),
        ]),
        ...csvSection('Car booking frequency', [
            ['Car', 'Plate', 'Bookings', 'Completed', 'Active', 'Not returned', 'Current status'],
            ...sections.carFrequency.map((row) => [
                row.car, row.plate, row.bookings, row.completed, row.active, row.notReturned, row.currentStatus,
            ]),
        ]),
        ...csvSection('Cars not returned', [
            ['Employee', 'Car', 'Date of use', 'Time slot', 'Destination', 'Days overdue'],
            ...sections.carsNotReturned.map((row) => [
                row.employee, row.car, row.dateOfUse, row.timeSlot, row.destination, row.daysOverdue,
            ]),
        ]),
        ...csvSection('Gear request status', [
            ['Status', 'Count', '% of requests'],
            ...report.requestStatus.map((row) => [
                row.status,
                row.count,
                percentOf(row.count, report.summary.totalRequests),
            ]),
        ]),
        ...csvSection('Top gear by units requested', [
            ['Rank', 'Gear', 'Category', 'Units', '% of total units'],
            ...report.popularGear.map((row, index) => [
                index + 1,
                row.name,
                row.category || 'Uncategorized',
                row.unitsRequested,
                percentOf(row.unitsRequested, totalUnits),
            ]),
        ]),
    ];

    return `\uFEFF${lines.join('\n')}`;
}

export function buildReportExcelHtml(report: AdminReportData): string {
    const generatedAt = format(new Date(), 'PPpp');
    const { kpis } = report.export;
    const totalUnits = sumRow(report.export.gearUsage.map((row) => row.unitsRequested));

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Nest Operations Report</title>
  <style>${EXPORT_STYLES}</style>
</head>
<body>
  <h1>Nest Operations Report</h1>
  <p class="meta">Generated ${escapeHtml(generatedAt)} · Period: ${escapeHtml(report.range.label)}</p>

  ${buildKpiGrid(report)}

  <p class="note">Blank cells show "-" when there was no activity. Only days with movement are listed below.</p>

  <h2>Daily operations</h2>
  ${htmlTable(
        ['Date', 'Gear requests', 'Gear returns', 'Gear check-outs', 'Damages', 'Car bookings', 'Car returns'],
        dailyOperationsRows(report),
        [1, 2, 3, 4, 5, 6]
    )}

  <h2>Gear usage this period</h2>
  ${htmlTable(
        ['Rank', 'Gear', 'Category', 'Units requested', 'Request lines', 'Returns', 'Check-outs', 'Damage reports'],
        gearUsageRows(report),
        [0, 3, 4, 5, 6, 7]
    )}

  <h2>Damaged gear</h2>
  ${htmlTable(
        ['Date', 'Gear', 'Category', 'Reported by', 'Source', 'Notes'],
        report.export.damagedGears.map((row) => [row.date, row.gearName, row.category, row.reportedBy, row.source, row.notes])
    )}

  <h2>Maintenance completed</h2>
  ${htmlTable(
        ['Date', 'Gear', 'Type', 'Status', 'Description'],
        report.export.maintenance.map((row) => [row.date, row.gearName, row.type, row.status, row.description])
    )}

  <h2>Car bookings</h2>
  ${htmlTable(
        ['Date', 'Time slot', 'Employee', 'Car', 'Destination', 'Purpose', 'Status', 'Returned'],
        report.export.carBookings.map((row) => [
            row.date, row.timeSlot, row.employee, row.car, row.destination, row.purpose, row.status, row.returned,
        ])
    )}

  <h2>Car booking frequency</h2>
  <p class="note">How often each vehicle was booked during the period, plus current fleet status.</p>
  ${htmlTable(
        ['Car', 'Plate', 'Bookings', 'Completed', 'Active', 'Not returned', 'Current status'],
        report.export.carFrequency.map((row) => [
            row.car, row.plate, row.bookings, row.completed, row.active, row.notReturned, row.currentStatus,
        ]),
        [2, 3, 4, 5]
    )}

  <h2>Cars not returned</h2>
  ${htmlTable(
        ['Employee', 'Car', 'Date of use', 'Time slot', 'Destination', 'Days overdue'],
        report.export.carsNotReturned.map((row) => [
            row.employee, row.car, row.dateOfUse, row.timeSlot, row.destination, row.daysOverdue,
        ]),
        [5]
    )}

  <h2>Fleet snapshot</h2>
  ${htmlTable(
        ['Metric', 'Value'],
        [
            ['Fleet total', kpis.fleetTotal],
            ['Fleet available', kpis.fleetAvailable],
            ['Active trips', kpis.activeCarTrips],
            ['Pending approvals', kpis.pendingCarBookings],
            ['Unique bookers', kpis.uniqueCarBookers],
            ['Gear in maintenance', kpis.gearInMaintenance],
            ['Inventory utilization', `${report.summary.utilizationRate}%`],
        ],
        [1]
    )}

  <h2>Gear request status</h2>
  ${htmlTable(
        ['Status', 'Count', '% of requests'],
        report.requestStatus.map((row) => [
            row.status,
            row.count,
            percentOf(row.count, report.summary.totalRequests),
        ]),
        [1, 2]
    )}

  <h2>Top gear by units requested</h2>
  ${htmlTable(
        ['Rank', 'Gear', 'Category', 'Units', '% of total units'],
        report.popularGear.map((row, index) => [
            index + 1,
            row.name,
            row.category || 'Uncategorized',
            row.unitsRequested,
            percentOf(row.unitsRequested, totalUnits),
        ]),
        [0, 3, 4]
    )}
</body>
</html>`;
}

function downloadBlob(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
}

export function downloadReportExcel(report: AdminReportData) {
    downloadBlob(
        buildReportExcelHtml(report),
        `${reportFilenameStem(report)}.xls`,
        'application/vnd.ms-excel;charset=utf-8;'
    );
}

export function downloadReportCsv(report: AdminReportData) {
    downloadBlob(
        buildReportCsv(report),
        `${reportFilenameStem(report)}.csv`,
        'text/csv;charset=utf-8;'
    );
}

export function downloadReport(report: AdminReportData, format: 'excel' | 'csv' = 'excel') {
    if (format === 'csv') {
        downloadReportCsv(report);
        return;
    }
    downloadReportExcel(report);
}
