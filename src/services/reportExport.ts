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
  // Initialize the PDF document
  const doc = new jsPDF('portrait', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Add the title
  doc.setFontSize(20);
  doc.setTextColor(0, 51, 102);
  doc.text(title, pageWidth / 2, 50, { align: 'center' });
  
  // Add the date range
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Report Period: ${report.startDate} to ${report.endDate}`,
    pageWidth / 2,
    75,
    { align: 'center' }
  );
  
  // Add generation timestamp
  const now = new Date();
  doc.setFontSize(10);
  doc.text(
    `Generated: ${now.toLocaleString()}`,
    pageWidth / 2,
    95,
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
  
  // Add summary section
  doc.setFontSize(14);
  doc.setTextColor(0, 51, 102);
  doc.text('Summary Statistics', 40, 130);
  
  // Create summary table
  autoTable(doc, {
    startY: 145,
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
    headStyles: { 
      fillColor: [0, 51, 102],
      textColor: 255
    },
    styles: {
      halign: 'left',
      fontSize: 11
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' }
    }
  });
  
  // Add detailed report section
  doc.setFontSize(14);
  doc.setTextColor(0, 51, 102);
  doc.text('Detailed Activity by Gear', 40, doc.lastAutoTable.finalY + 40);
  
  // Convert the report data to table format
  const tableData = report.gearUsage.map(item => [
    item.gearName,
    item.requestCount.toString(),
    item.checkoutCount.toString(),
    item.checkinCount.toString(),
    item.bookingCount.toString(),
    item.damageCount.toString(),
    (item.requestCount + item.checkoutCount + item.checkinCount + 
     item.bookingCount + item.damageCount).toString()
  ]);
  
  // Add the main data table
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 50,
    head: [['Gear Name', 'Requests', 'Check-outs', 'Check-ins', 'Bookings', 'Damages', 'Total Activity']],
    body: tableData,
    theme: 'striped',
    headStyles: { 
      fillColor: [0, 51, 102],
      textColor: 255
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240]
    },
    styles: {
      fontSize: 10,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' }
    }
  });
  
  // Add footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    
    // Footer text
    doc.text(
      'GearFlow - Equipment Management System',
      40,
      doc.internal.pageSize.getHeight() - 30
    );
    
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
  const headers = ['Gear Name', 'Requests', 'Check Outs', 'Check Ins', 'Bookings', 'Damage Reports', 'Total Activity'];
  
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
  const csvContent = [
    ...metadataRows,
    ...summaryRows,
    ['DETAILED ACTIVITY BY GEAR'],
    headers,
    ...rows,
    totalRow
  ]
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
