import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WeeklyUsageReport } from './report';

/**
 * Generates and downloads a PDF report from a WeeklyUsageReport.
 * 
 * @param report The weekly usage report data
 * @param title The title of the report
 */
export function generatePdfReport(report: WeeklyUsageReport, title: string = 'Weekly Gear Activity Report') {
  // Helper to get finalY from autoTable result
  function getFinalY(result: any, fallback: number) {
    return result && typeof result.finalY === 'number' ? result.finalY : fallback;
  }
  // Initialize the PDF document
  const doc = new jsPDF('portrait', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Eden Oasis Realty Logo Text ---
  doc.setFontSize(28);
  doc.setTextColor('#0070F3');
  doc.setFont('helvetica', 'bold');
  doc.text('Eden Oasis Realty', pageWidth / 2, 40, { align: 'center' });
  doc.setFont('helvetica', 'normal');

  // Add the title
  doc.setFontSize(20);
  doc.setTextColor('#0070F3');
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, 70, { align: 'center' });
  doc.setFont('helvetica', 'normal');

  // Add the date range
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Report Period: ${report.startDate} to ${report.endDate}`,
    pageWidth / 2,
    95,
    { align: 'center' }
  );

  // Add generation timestamp
  const now = new Date();
  doc.setFontSize(10);
  doc.text(
    `Generated: ${now.toLocaleString()}`,
    pageWidth / 2,
    115,
    { align: 'center' }
  );

  // Calculate totals
  const totals = report.gearUsage.reduce(
    (acc, item) => {
      return {
        requests: acc.requests + item.requestCount,
        checkouts: acc.checkouts + item.checkoutCount,
        checkins: acc.checkins + item.checkinCount,
        bookings: acc.bookings + item.bookingCount,
        damages: acc.damages + item.damageCount,
      };
    },
    { requests: 0, checkouts: 0, checkins: 0, bookings: 0, damages: 0 }
  );

  // --- Summary & Insights Section ---
  let currentY = 130;
  doc.setFontSize(15);
  doc.setTextColor('#0070F3');
  doc.setFont('helvetica', 'bold');
  doc.text('Summary & Insights', 40, currentY);
  doc.setFont('helvetica', 'normal');
  currentY += 18;
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text(report.summary || 'No summary available.', 40, currentY, { maxWidth: pageWidth - 80 });
  currentY += 30;

  // --- Key Stats Table ---
  const keyStats = [
    ['Most Active User', report.mostActiveUser || '-'],
    ['Most Active Gear', report.mostActiveGear || '-'],
    ['Unique Users', report.uniqueUsers.toString()],
    ['Avg. Request Duration', report.avgRequestDuration.toFixed(1) + ' days'],
    ['Overdue Returns', report.overdueReturns.toString()],
    ['Utilization Rate', report.utilizationRate.toFixed(1) + '%']
  ];
  const keyStatsTable = autoTable(doc, {
    startY: currentY,
    head: [['Metric', 'Value']],
    body: keyStats,
    theme: 'grid',
    headStyles: { fillColor: [0, 112, 243], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 11, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 180 }, 1: { cellWidth: 180 } }
  });
  currentY = getFinalY(keyStatsTable, currentY + 25) + 30;

  // --- Summary Statistics Table ---
  doc.setFontSize(15);
  doc.setTextColor('#0070F3');
  doc.setFont('helvetica', 'bold');
  doc.text('Summary Statistics', 40, currentY);
  doc.setFont('helvetica', 'normal');
  currentY += 10;
  const summaryStatsTable = autoTable(doc, {
    startY: currentY + 5,
    head: [['Metric', 'Value']],
    body: [
      ['Total Gears with Activity', report.gearUsage.length.toString()],
      ['Total Requests', totals.requests.toString()],
      ['Total Check-outs', totals.checkouts.toString()],
      ['Total Check-ins', totals.checkins.toString()],
      ['Total Bookings', totals.bookings.toString()],
      ['Total Damage Reports', totals.damages.toString()],
    ],
    theme: 'striped',
    headStyles: { fillColor: [0, 112, 243], textColor: 255, fontStyle: 'bold' },
    styles: { halign: 'left', fontSize: 11, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 180 }, 1: { cellWidth: 180 } }
  });
  currentY = getFinalY(summaryStatsTable, currentY + 25) + 30;

  // --- User Activity Table ---
  doc.setFontSize(15);
  doc.setTextColor('#0070F3');
  doc.setFont('helvetica', 'bold');
  doc.text('User Activity', 40, currentY);
  doc.setFont('helvetica', 'normal');
  currentY += 10;
  const userTableResult = autoTable(doc, {
    startY: currentY + 5,
    head: [['User', 'Requests', 'Check-Outs', 'Check-Ins', 'Overdue', 'Damages']],
    body: report.userStats.map(u => [u.name, u.requests, u.checkouts, u.checkins, u.overdue, u.damages]),
    theme: 'striped',
    headStyles: { fillColor: [0, 112, 243], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 'auto' } }
  });
  currentY = getFinalY(userTableResult, currentY + 25) + 30;

  // --- Gear Activity & Status Table ---
  doc.setFontSize(15);
  doc.setTextColor('#0070F3');
  doc.setFont('helvetica', 'bold');
  doc.text('Gear Activity & Status', 40, currentY);
  doc.setFont('helvetica', 'normal');
  currentY += 10;
  const gearTableResult = autoTable(doc, {
    startY: currentY + 5,
    head: [['Gear Name', 'Status', 'Requests', 'Check-Outs', 'Check-Ins', 'Bookings', 'Damages', 'Utilization', 'Last Activity', 'Total Activity']],
    body: report.gearUsage.map(g => [
      g.gearName,
      g.status || '-',
      g.requestCount,
      g.checkoutCount,
      g.checkinCount,
      g.bookingCount,
      g.damageCount,
      g.utilization !== undefined ? g.utilization.toFixed(1) + '%' : '-',
      g.lastActivity ? new Date(g.lastActivity).toLocaleString() : '-',
      (g.requestCount + g.checkoutCount + g.checkinCount + g.bookingCount + g.damageCount)
    ]),
    theme: 'striped',
    headStyles: { fillColor: [0, 112, 243], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 'auto' } }
  });
  currentY = getFinalY(gearTableResult, currentY + 25) + 30;

  // --- Watermark/Footer ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor('#0070F3');
    doc.text(
      'Eden Oasis Realty',
      40,
      doc.internal.pageSize.getHeight() - 30
    );
    doc.setTextColor(150, 150, 150);
    // Page numbers
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 40,
      doc.internal.pageSize.getHeight() - 30,
      { align: 'right' }
    );
  }

  // Save the PDF
  doc.save(`gear-activity-report-${report.startDate}-to-${report.endDate}.pdf`);
}

/**
 * Generates and downloads an Excel-compatible CSV report from a WeeklyUsageReport.
 * 
 * @param report The weekly usage report data
 */
export function generateCsvReport(report: WeeklyUsageReport) {
  // Create headers
  const headers = ['Generated by Eden Oasis Realty', '', '', '', '', '', ''];
  const subHeaders = ['Gear Name', 'Requests', 'Check Outs', 'Check Ins', 'Bookings', 'Damage Reports', 'Total Activity'];

  // Create rows for each gear
  const rows = report.gearUsage.map(gear => [
    gear.gearName,
    gear.requestCount.toString(),
    gear.checkoutCount.toString(),
    gear.checkinCount.toString(),
    gear.bookingCount.toString(),
    gear.damageCount.toString(),
    (gear.requestCount + gear.checkoutCount + gear.checkinCount +
      gear.bookingCount + gear.damageCount).toString()
  ]);

  // Add metadata rows at the top
  const metadataRows = [
    ['GearFlow Weekly Activity Report'],
    [`Report Period: ${report.startDate} to ${report.endDate}`],
    [`Generated: ${new Date().toLocaleString()}`],
    [''] // Empty row for spacing
  ];

  // Calculate totals for a summary row
  const totals = report.gearUsage.reduce(
    (acc, gear) => {
      return {
        requests: acc.requests + gear.requestCount,
        checkouts: acc.checkouts + gear.checkoutCount,
        checkins: acc.checkins + gear.checkinCount,
        bookings: acc.bookings + gear.bookingCount,
        damages: acc.damages + gear.damageCount
      };
    },
    { requests: 0, checkouts: 0, checkins: 0, bookings: 0, damages: 0 }
  );

  // Add summary rows before the detailed data
  const summaryRows = [
    ['SUMMARY STATISTICS'],
    ['Total Gears with Activity', report.gearUsage.length.toString()],
    ['Total Requests', totals.requests.toString()],
    ['Total Check-outs', totals.checkouts.toString()],
    ['Total Check-ins', totals.checkins.toString()],
    ['Total Bookings', totals.bookings.toString()],
    ['Total Damage Reports', totals.damages.toString()],
    [''] // Empty row for spacing
  ];

  // Add a total row at the end
  const totalRow = [
    'TOTALS',
    totals.requests.toString(),
    totals.checkouts.toString(),
    totals.checkins.toString(),
    totals.bookings.toString(),
    totals.damages.toString(),
    (totals.requests + totals.checkouts + totals.checkins +
      totals.bookings + totals.damages).toString()
  ];

  // Combine everything into CSV content
  const csvContent = [headers, subHeaders, ...summaryRows, ['DETAILED ACTIVITY BY GEAR'], headers, ...rows, totalRow]
    .map(row => row.join(','))
    .join('\n');

  // Create and download the CSV file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `gear-activity-report-${report.startDate}-to-${report.endDate}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
