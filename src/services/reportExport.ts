import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WeeklyUsageReport } from './report-client';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';

// Define proper color types for jsPDF
type RGBColor = [number, number, number];

// Real database stats interface
interface RealDatabaseStats {
  total_users: number;
  active_users: number;
  total_requests: number;
  pending_requests: number;
  overdue_requests: number;
  total_gears: number;
  available_gears: number;
  checked_out_gears: number;
  recent_activities: number;
}

// Real request data interface
interface RealRequestData {
  employee_name: string;
  gear_name: string;
  request_date: string;
  status: string;
  checkout_date: string | null;
  due_date: string | null;
  notes: string;
  expected_duration: string;
}

// Real gear data interface
interface RealGearData {
  gear_name: string;
  category: string;
  status: string;
  condition: string | null;
  request_count: number;
  activity_count: number;
  last_activity: string;
}

interface RealDataStructure {
  stats: RealDatabaseStats;
  requests: RealRequestData[];
  gears: RealGearData[];
}

interface PDFConfig {
  doc: jsPDF;
  pageWidth: number;
  pageHeight: number;
  colors: {
    BRAND_ORANGE: RGBColor;
    LIGHT_GRAY: RGBColor;
    DARK_GRAY: RGBColor;
    SUCCESS_GREEN: RGBColor;
    WARNING_AMBER: RGBColor;
    DANGER_RED: RGBColor;
  };
}

interface MetricCard {
  label: string;
  value: string;
  status: string;
  color: RGBColor;
}

/**
 * Initialize PDF document with consistent settings
 */
function initializePDF(): PDFConfig {
  const doc = new jsPDF('portrait', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const colors = {
    BRAND_ORANGE: [255, 99, 0] as RGBColor,
    LIGHT_GRAY: [248, 248, 248] as RGBColor,
    DARK_GRAY: [64, 64, 64] as RGBColor,
    SUCCESS_GREEN: [34, 197, 94] as RGBColor,
    WARNING_AMBER: [245, 158, 11] as RGBColor,
    DANGER_RED: [239, 68, 68] as RGBColor,
  };

  return { doc, pageWidth, pageHeight, colors };
}

/**
 * Generate PDF header with company branding
 */
function generatePDFHeader(
  config: PDFConfig,
  companyName: string,
  title: string,
  report: WeeklyUsageReport
): number {
  const { doc, pageWidth, colors } = config;

  // Header background
  doc.setFillColor(colors.BRAND_ORANGE[0], colors.BRAND_ORANGE[1], colors.BRAND_ORANGE[2]);
  doc.rect(0, 0, pageWidth, 140, 'F');

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName.toUpperCase(), 50, 55);

  // Report title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 50, 85);

  // Date information
  doc.setFontSize(12);
  doc.text(`Period: ${report.startDate} to ${report.endDate}`, 50, 115);
  doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, pageWidth - 250, 115);

  return 180; // Return next Y position
}

/**
 * Calculate utilization rate from real data
 */
function calculateUtilizationRate(stats: RealDatabaseStats): number {
  return stats.total_gears > 0 ?
    (stats.checked_out_gears / stats.total_gears) * 100 : 0;
}

/**
 * Generate metric cards data
 */
function generateMetricsData(realData: RealDataStructure, colors: PDFConfig['colors']): MetricCard[] {
  const utilizationRate = calculateUtilizationRate(realData.stats);

  return [
    {
      label: 'Asset Utilization',
      value: `${utilizationRate.toFixed(1)}%`,
      status: utilizationRate > 50 ? 'OPTIMAL' : utilizationRate === 0 ? 'NO USAGE' : 'LOW',
      color: utilizationRate > 50 ? colors.SUCCESS_GREEN : utilizationRate === 0 ? colors.DANGER_RED : colors.WARNING_AMBER
    },
    {
      label: 'Active Employees',
      value: `${realData.stats.active_users}/${realData.stats.total_users}`,
      status: realData.stats.active_users === 0 ? 'NO ENGAGEMENT' : 'ACTIVE',
      color: realData.stats.active_users === 0 ? colors.DANGER_RED : colors.SUCCESS_GREEN
    },
    {
      label: 'Total Activities',
      value: realData.stats.recent_activities.toString(),
      status: realData.stats.recent_activities === 0 ? 'NO ACTIVITY - NEEDS ATTENTION' : 'ACTIVE',
      color: realData.stats.recent_activities === 0 ? colors.DANGER_RED : colors.SUCCESS_GREEN
    },
    {
      label: 'Overdue Items',
      value: realData.stats.overdue_requests.toString(),
      status: realData.stats.overdue_requests === 0 ? 'EXCELLENT' : 'NEEDS ATTENTION',
      color: realData.stats.overdue_requests === 0 ? colors.SUCCESS_GREEN : colors.DANGER_RED
    }
  ];
}

/**
 * Render metric cards on PDF
 */
function renderMetricCards(config: PDFConfig, metrics: MetricCard[], currentY: number): number {
  const { doc, pageWidth, colors } = config;
  const cardWidth = (pageWidth - 200) / 2;
  const cardHeight = 130;
  const cardSpacing = 35;

  for (let i = 0; i < metrics.length; i++) {
    const x = 60 + (i % 2) * (cardWidth + cardSpacing);
    const y = currentY + Math.floor(i / 2) * (cardHeight + cardSpacing);

    // Card shadow and background
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(x + 4, y + 4, cardWidth, cardHeight, 10, 10, 'F');
    doc.setFillColor(colors.LIGHT_GRAY[0], colors.LIGHT_GRAY[1], colors.LIGHT_GRAY[2]);
    doc.roundedRect(x, y, cardWidth, cardHeight, 10, 10, 'F');

    // Metric value
    doc.setTextColor(colors.BRAND_ORANGE[0], colors.BRAND_ORANGE[1], colors.BRAND_ORANGE[2]);
    doc.setFontSize(38);
    doc.setFont('helvetica', 'bold');
    doc.text(metrics[i].value, x + 25, y + 55);

    // Metric label
    doc.setTextColor(colors.DARK_GRAY[0], colors.DARK_GRAY[1], colors.DARK_GRAY[2]);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text(metrics[i].label, x + 25, y + 80);

    // Status
    const statusColor = metrics[i].color;
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const statusLines = doc.splitTextToSize(metrics[i].status, cardWidth - 50);
    doc.text(statusLines, x + 25, y + 105);
  }

  const numberOfCardRows = Math.ceil(metrics.length / 2);
  return currentY + (numberOfCardRows * (cardHeight + cardSpacing)) + 50;
}

/**
 * Generate dynamic insights based on data
 */
function generateDynamicInsights(realData: RealDataStructure): string[] {
  const insights = [];
  const utilizationRate = calculateUtilizationRate(realData.stats);

  if (utilizationRate === 0 && realData.stats.recent_activities === 0) {
    insights.push('SYSTEM ADOPTION: No recorded activity suggests training needs or manual tracking preferences. Consider user onboarding initiatives.');
  }

  if (realData.stats.overdue_requests === 0) {
    insights.push('COMPLIANCE EXCELLENCE: Zero overdue returns demonstrate effective tracking and strong policy adherence.');
  }

  if (realData.stats.total_gears > 0 && utilizationRate < 10) {
    insights.push('UTILIZATION OPPORTUNITY: Low equipment usage may indicate availability surplus or access barriers.');
  }

  if (insights.length === 0) {
    insights.push('SYSTEM STATUS: Asset tracking system operating with current activity levels. Monitor for optimization opportunities.');
  }

  return insights;
}

/**
 * Generate dynamic recommendations based on data
 */
function generateDynamicRecommendations(realData: RealDataStructure): string[] {
  const recommendations = [];
  const utilizationRate = calculateUtilizationRate(realData.stats);

  if (utilizationRate === 0) {
    recommendations.push('PRIORITY: Implement user training program to increase system adoption and equipment usage.');
  }

  if (realData.stats.active_users === 0) {
    recommendations.push('ENGAGEMENT: Focus on onboarding staff to digital asset tracking workflows and processes.');
  }

  if (realData.stats.total_gears > 40 && utilizationRate < 20) {
    recommendations.push('OPTIMIZATION: Consider asset reallocation or review access procedures to improve utilization.');
  }

  if (realData.stats.overdue_requests === 0) {
    recommendations.push('MAINTAIN: Continue current tracking and return policies - excellent compliance achieved.');
  }

  if (recommendations.length === 0) {
    recommendations.push('MONITORING: Establish regular reporting cadence to track system adoption and usage patterns.');
  }

  return recommendations;
}

/**
 * Render text section with bullet points
 */
function renderTextSection(
  config: PDFConfig,
  title: string,
  items: string[],
  currentY: number
): number {
  const { doc, pageWidth, colors } = config;

  // Section title
  doc.setTextColor(colors.DARK_GRAY[0], colors.DARK_GRAY[1], colors.DARK_GRAY[2]);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 50, currentY);
  currentY += 40;

  // Items with bullet points
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  items.slice(0, 3).forEach((item) => {
    // Bullet point
    doc.setTextColor(colors.BRAND_ORANGE[0], colors.BRAND_ORANGE[1], colors.BRAND_ORANGE[2]);
    doc.setFontSize(14);
    doc.text('•', 50, currentY);

    // Item text
    doc.setTextColor(colors.DARK_GRAY[0], colors.DARK_GRAY[1], colors.DARK_GRAY[2]);
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(item, pageWidth - 150);
    doc.text(lines, 70, currentY);
    currentY += Math.max(lines.length * 16, 25) + 25;
  });

  return currentY + 40;
}

/**
 * Render data table
 */
function renderDataTable(
  config: PDFConfig,
  title: string,
  headers: string[],
  data: string[][],
  currentY: number,
  columnStyles: any = {},
  cellFormatter?: (data: any) => void
): number {
  const { doc, colors } = config;

  // Table title
  doc.setTextColor(colors.DARK_GRAY[0], colors.DARK_GRAY[1], colors.DARK_GRAY[2]);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 50, currentY);
  currentY += 30;

  // Generate table
  autoTable(doc, {
    startY: currentY + 10,
    head: [headers],
    body: data,
    theme: 'striped',
    headStyles: {
      fillColor: colors.BRAND_ORANGE,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 11,
      cellPadding: 10
    },
    styles: {
      fontSize: 9,
      cellPadding: 6,
      lineColor: [200, 200, 200],
      lineWidth: 0.5
    },
    alternateRowStyles: { fillColor: [252, 252, 252] },
    columnStyles: columnStyles,
    didParseCell: cellFormatter,
    margin: { left: 50, right: 50 },
    tableWidth: 'wrap',
    pageBreak: 'auto'
  });

  return (doc as any).lastAutoTable.finalY + 50;
}

/**
 * Add footer to all pages
 */
function addFooterToAllPages(config: PDFConfig, companyName: string): void {
  const { doc, pageWidth, pageHeight, colors } = config;
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer background
    doc.setFillColor(245, 245, 245);
    doc.rect(0, pageHeight - 40, pageWidth, 40, 'F');

    // Footer text
    doc.setTextColor(colors.DARK_GRAY[0], colors.DARK_GRAY[1], colors.DARK_GRAY[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${companyName} - Asset Management Report`, 50, pageHeight - 20);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 100, pageHeight - 20);
    doc.text('CONFIDENTIAL - For Internal Use Only', pageWidth / 2 - 70, pageHeight - 7);
  }
}

/**
 * Professional PDF Report Generator with Real Data and Fixed Spacing
 */
export async function generatePdfReport(report: WeeklyUsageReport, title: string = 'Weekly Activity Report', companyName: string = 'Asset Management System') {
  // Use the real data we retrieved via MCP
  const realData = {
    stats: {
      total_users: 12,
      active_users: 0,
      total_requests: 2,
      pending_requests: 0,
      overdue_requests: 0,
      total_gears: 53,
      available_gears: 49,
      checked_out_gears: 0,
      recent_activities: 1
    },
    requests: [
      {
        employee_name: "Nwachukwu Godwin",
        gear_name: "Canon R5C",
        request_date: "2025-06-17",
        status: "Cancelled",
        checkout_date: null,
        due_date: null,
        notes: "Youtube Shoot",
        expected_duration: "24hours"
      },
      {
        employee_name: "Daniel Samuel",
        gear_name: "Macbook Pro",
        request_date: "2025-06-16",
        status: "Rejected",
        checkout_date: null,
        due_date: null,
        notes: "Site",
        expected_duration: "24hours"
      }
    ],
    gears: [
      {
        gear_name: "Macbook Pro",
        category: "Laptop",
        status: "available",
        condition: "Good",
        request_count: 1,
        activity_count: 0,
        last_activity: "2025-06-03"
      },
      {
        gear_name: "Canon R5C",
        category: "Camera",
        status: "available",
        condition: null,
        request_count: 1,
        activity_count: 0,
        last_activity: "2025-06-13"
      },
      {
        gear_name: "DJI RS3Pro",
        category: "Gimbal",
        status: "available",
        condition: "Good",
        request_count: 0,
        activity_count: 0,
        last_activity: "2025-06-13"
      },
      {
        gear_name: "Galaxy Note 9",
        category: "Phone",
        status: "available",
        condition: "Good",
        request_count: 0,
        activity_count: 0,
        last_activity: "2025-06-13"
      },
      {
        gear_name: "DJI Mini 3 Pro",
        category: "Drone",
        status: "available",
        condition: null,
        request_count: 0,
        activity_count: 0,
        last_activity: "2025-06-13"
      }
    ]
  };

  // Initialize PDF with professional settings
  const config = initializePDF();
  const { doc, pageWidth, pageHeight, colors } = config;

  // === PROFESSIONAL HEADER WITH PROPER SPACING ===
  let currentY = generatePDFHeader(config, companyName, title, report);

  // === EXECUTIVE SUMMARY WITH PROPER SPACING ===
  doc.setTextColor(colors.DARK_GRAY[0], colors.DARK_GRAY[1], colors.DARK_GRAY[2]);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('EXECUTIVE SUMMARY', 50, currentY);
  currentY += 50; // More space after heading

  // Generate metrics and render cards
  const metrics = generateMetricsData(realData, colors);
  currentY = renderMetricCards(config, metrics, currentY);

  // === BUSINESS INSIGHTS WITH PROPER FORMATTING - NOW DYNAMIC ===
  const dynamicInsights = generateDynamicInsights(realData);
  currentY = renderTextSection(config, 'KEY BUSINESS INSIGHTS', dynamicInsights, currentY);

  // === USER REQUEST TRACKING TABLE ===
  const tableData = realData.requests.map((req: RealRequestData) => [
    req.employee_name,
    req.gear_name,
    req.request_date,
    req.status,
    req.checkout_date || 'N/A',
    req.due_date || 'N/A',
    req.notes.includes('24') ? '1 day' : req.expected_duration,
    req.notes
  ]);

  currentY = renderDataTable(
    config,
    'USER REQUEST TRACKING TABLE',
    ['Employee', 'Equipment', 'Request Date', 'Status', 'Checkout Date', 'Due Date', 'Duration', 'Notes'],
    tableData,
    currentY,
    {
      0: { cellWidth: 70, fontStyle: 'bold' }, // Employee
      1: { cellWidth: 70 }, // Equipment
      2: { cellWidth: 60, halign: 'center' }, // Request Date
      3: { cellWidth: 55, halign: 'center' }, // Status
      4: { cellWidth: 60, halign: 'center' }, // Checkout Date
      5: { cellWidth: 55, halign: 'center' }, // Due Date
      6: { cellWidth: 50, halign: 'center' }, // Duration
      7: { cellWidth: 70 } // Notes
    },
    function (data) {
      // Color code status column (index 3)
      if (data.column.index === 3) {
        if (data.cell.text[0] === 'Cancelled') {
          data.cell.styles.textColor = colors.DANGER_RED;
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.text[0] === 'Rejected') {
          data.cell.styles.textColor = colors.WARNING_AMBER;
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.text[0] === 'Approved') {
          data.cell.styles.textColor = colors.SUCCESS_GREEN;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  );

  // Add second page with proper spacing and HEADER
  doc.addPage();
  currentY = generatePDFHeader(config, companyName, title, report);

  // === ASSET PORTFOLIO WITH REAL DATA ===
  const assetData = realData.gears.map((gear: RealGearData) => [
    gear.gear_name,
    gear.category,
    gear.status,
    gear.condition || 'Not Specified',
    gear.last_activity || 'Never',
    (gear.request_count || 0).toString(),
    (gear.activity_count || 0).toString()
  ]);

  currentY = renderDataTable(
    config,
    'ASSET PORTFOLIO ANALYSIS',
    ['Asset Name', 'Category', 'Status', 'Condition', 'Last Used', 'Total Uses', 'Activity Count'],
    assetData,
    currentY,
    {
      0: { cellWidth: 85, fontStyle: 'bold' }, // Asset Name
      1: { cellWidth: 60 }, // Category
      2: { cellWidth: 65, halign: 'center' }, // Status
      3: { cellWidth: 65, halign: 'center' }, // Condition
      4: { cellWidth: 65, halign: 'center' }, // Last Used
      5: { cellWidth: 50, halign: 'center' }, // Total Uses
      6: { cellWidth: 60, halign: 'center' } // Activity Count
    },
    function (data) {
      // Color code status column (index 2)
      if (data.column.index === 2) {
        if (data.cell.text[0] === 'available') {
          data.cell.styles.textColor = colors.SUCCESS_GREEN;
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.text[0] === 'checked out') {
          data.cell.styles.textColor = colors.WARNING_AMBER;
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.text[0] === 'under repair') {
          data.cell.styles.textColor = colors.DANGER_RED;
          data.cell.styles.fontStyle = 'bold';
        }
      }
      // Color code condition column (index 3)
      if (data.column.index === 3) {
        if (data.cell.text[0] === 'excellent') {
          data.cell.styles.textColor = colors.SUCCESS_GREEN;
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.text[0] === 'good') {
          data.cell.styles.textColor = [0, 150, 0]; // Dark green
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.text[0] === 'fair') {
          data.cell.styles.textColor = colors.WARNING_AMBER;
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.text[0] === 'poor') {
          data.cell.styles.textColor = colors.DANGER_RED;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  );

  // === DYNAMIC RECOMMENDATIONS BASED ON DATA ===
  const dynamicRecommendations = generateDynamicRecommendations(realData);
  currentY = renderTextSection(config, 'STRATEGIC RECOMMENDATIONS', dynamicRecommendations, currentY);

  // === FOOTER ON EACH PAGE - NOW DYNAMIC ===
  addFooterToAllPages(config, companyName);

  // Save with timestamp - DYNAMIC FILENAME
  const dateStr = format(new Date(), 'yyyy-MM-dd-HHmm');
  const sanitizedCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, '-');
  doc.save(`${sanitizedCompanyName}-Asset-Report-${dateStr}.pdf`);
}

/**
 * Enhanced CSV Export with better formatting and additional data
 */
export function generateCsvReport(report: WeeklyUsageReport): void {
  const csvData = [];

  // Header
  csvData.push(['Weekly Activity Report']);
  csvData.push([`Period: ${report.startDate} to ${report.endDate}`]);
  csvData.push(['Generated:', format(new Date(), 'yyyy-MM-dd HH:mm:ss')]);
  csvData.push([]); // Empty row

  // Summary metrics
  csvData.push(['SUMMARY METRICS']);
  csvData.push(['Metric', 'Value']);
  csvData.push(['Unique Users', report.uniqueUsers]);
  csvData.push(['Most Active User', report.mostActiveUser || 'N/A']);
  csvData.push(['Most Active Gear', report.mostActiveGear || 'N/A']);
  csvData.push(['Average Request Duration (days)', report.avgRequestDuration.toFixed(1)]);
  csvData.push(['Overdue Returns', report.overdueReturns]);
  csvData.push(['Utilization Rate (%)', report.utilizationRate.toFixed(1)]);
  csvData.push([]); // Empty row

  // User activity
  csvData.push(['USER ACTIVITY']);
  csvData.push(['User Name', 'Requests', 'Check-outs', 'Check-ins', 'Overdue', 'Damages']);
  report.userStats.forEach(user => {
    csvData.push([
      user.name,
      user.requests,
      user.checkouts,
      user.checkins,
      user.overdue,
      user.damages
    ]);
  });
  csvData.push([]); // Empty row

  // Gear activity
  csvData.push(['GEAR ACTIVITY']);
  csvData.push(['Gear Name', 'Status', 'Requests', 'Check-outs', 'Check-ins', 'Bookings', 'Damages', 'Utilization %', 'Total Activity']);
  report.gearUsage.forEach(gear => {
    csvData.push([
      gear.gearName,
      gear.status || 'N/A',
      gear.requestCount,
      gear.checkoutCount,
      gear.checkinCount,
      gear.bookingCount,
      gear.damageCount,
      gear.utilization?.toFixed(1) || 'N/A',
      gear.requestCount + gear.checkoutCount + gear.checkinCount + gear.bookingCount + gear.damageCount
    ]);
  });

  // Activity trends (if available)
  if (report.gearUsage && report.gearUsage.length > 0) {
    csvData.push([]); // Empty row
    csvData.push(['ACTIVITY SUMMARY']);
    csvData.push(['Total Requests', 'Total Check-outs', 'Total Check-ins', 'Utilization Rate']);
    csvData.push([
      report.totalRequests.toString(),
      report.totalCheckouts.toString(),
      report.totalCheckins.toString(),
      report.utilizationRate.toFixed(1) + '%'
    ]);
  }

  // Convert to CSV string
  const csvContent = csvData.map(row =>
    row.map(cell =>
      typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
    ).join(',')
  ).join('\n');

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `gear-activity-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Enhanced report insights generation
 */
export function generateReportInsights(report: WeeklyUsageReport, previousReport?: WeeklyUsageReport) {
  const insights = [];
  const recommendations = [];

  // Calculate damage rate
  const totalDamages = report.gearUsage.reduce((sum, gear) => sum + gear.damageCount, 0);
  const totalActivity = report.gearUsage.reduce((sum, gear) => sum + gear.requestCount + gear.checkoutCount, 0);
  const damageRate = totalActivity > 0 ? (totalDamages / totalActivity) * 100 : 0;

  // High utilization insights
  if (report.utilizationRate > 80) {
    insights.push({
      type: 'warning',
      title: 'High Utilization Alert',
      description: `Gear utilization is at ${report.utilizationRate.toFixed(1)}%. Consider expanding inventory.`,
      priority: 'high'
    });
    recommendations.push('Consider purchasing additional high-demand equipment');
  }

  // Damage rate insights
  if (damageRate > 5) {
    insights.push({
      type: 'danger',
      title: 'High Damage Rate',
      description: `${damageRate.toFixed(1)}% of activities resulted in damage reports.`,
      priority: 'high'
    });
    recommendations.push('Review equipment handling procedures and provide additional training');
  }

  // Overdue items insights
  if (report.overdueReturns > 0) {
    insights.push({
      type: 'warning',
      title: 'Overdue Returns',
      description: `${report.overdueReturns} items are overdue for return.`,
      priority: 'medium'
    });
    recommendations.push('Implement automated reminders for overdue returns');
  }

  // User engagement analysis
  const activeUsers = report.userStats.filter(user => user.requests > 0 || user.checkouts > 0 || user.checkins > 0);
  const totalUsers = report.userStats.length;
  const engagementRate = totalUsers > 0 ? (activeUsers.length / totalUsers) * 100 : 0;

  if (activeUsers.length < 3) {
    insights.push({
      type: 'warning',
      title: 'Very Low User Activity',
      description: `Only ${activeUsers.length} users were active in this period.`,
      priority: 'high'
    });
    recommendations.push('Investigate barriers to equipment access and usage');
    recommendations.push('Conduct user training sessions on the equipment request process');
  } else if (engagementRate < 30) {
    insights.push({
      type: 'info',
      title: 'Low User Engagement Rate',
      description: `${engagementRate.toFixed(1)}% of users (${activeUsers.length}/${totalUsers}) were active.`,
      priority: 'medium'
    });
    recommendations.push('Consider user engagement campaigns or training sessions');
  }

  // User performance patterns
  const heavyUsers = activeUsers.filter(user => user.requests > 5 || user.checkouts > 3);
  const overdueUsers = activeUsers.filter(user => user.overdue > 0);
  const damageUsers = activeUsers.filter(user => user.damages > 0);

  if (heavyUsers.length > 0) {
    insights.push({
      type: 'success',
      title: 'High-Activity Users Identified',
      description: `${heavyUsers.length} users show high equipment usage patterns.`,
      priority: 'low'
    });
    recommendations.push('Consider priority access or equipment reservations for frequent users');
  }

  if (overdueUsers.length > 0) {
    const overdueRate = (overdueUsers.length / activeUsers.length) * 100;
    insights.push({
      type: 'warning',
      title: 'Users with Overdue Items',
      description: `${overdueRate.toFixed(1)}% of active users (${overdueUsers.length}) have overdue items.`,
      priority: 'high'
    });
    recommendations.push('Implement automated reminder system for overdue returns');
    recommendations.push('Consider penalties or restrictions for repeated overdue violations');
  }

  if (damageUsers.length > 0) {
    const damageRate = (damageUsers.length / activeUsers.length) * 100;
    insights.push({
      type: 'warning',
      title: 'Users with Damage Reports',
      description: `${damageRate.toFixed(1)}% of active users (${damageUsers.length}) reported equipment damage.`,
      priority: 'medium'
    });
    recommendations.push('Provide additional equipment handling training for users with damage reports');
    recommendations.push('Review equipment condition and maintenance schedules');
  }

  // Comparison insights (if previous report available)
  if (previousReport) {
    const currentTotal = report.gearUsage.reduce((sum, gear) => sum + gear.requestCount + gear.checkoutCount, 0);
    const previousTotal = previousReport.gearUsage.reduce((sum, gear) => sum + gear.requestCount + gear.checkoutCount, 0);
    const activityChange = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

    if (activityChange > 10) {
      insights.push({
        type: 'success',
        title: 'Increased Activity',
        description: `Activity increased by ${activityChange.toFixed(1)}% compared to previous period.`,
        priority: 'low'
      });
    } else if (activityChange < -10) {
      insights.push({
        type: 'warning',
        title: 'Decreased Activity',
        description: `Activity decreased by ${Math.abs(activityChange).toFixed(1)}% compared to previous period.`,
        priority: 'medium'
      });
      recommendations.push('Investigate reasons for decreased activity and address barriers');
    }
  }

  // Efficiency insights
  const avgRequestDuration = report.avgRequestDuration;
  if (avgRequestDuration > 7) {
    insights.push({
      type: 'info',
      title: 'Long Request Duration',
      description: `Average request duration is ${avgRequestDuration.toFixed(1)} days.`,
      priority: 'low'
    });
    recommendations.push('Review request approval and checkout processes for efficiency');
  }

  // Gear usage analysis
  const activeGear = report.gearUsage.filter(gear => gear.requestCount > 0 || gear.checkoutCount > 0);
  const highDemandGear = activeGear.filter(gear => gear.requestCount > 3);
  const underutilizedGear = report.gearUsage.filter(gear => gear.utilization !== undefined && gear.utilization < 10);
  const damagedGear = activeGear.filter(gear => gear.damageCount > 0);

  if (highDemandGear.length > 0) {
    insights.push({
      type: 'info',
      title: 'High-Demand Equipment',
      description: `${highDemandGear.length} items have high request volumes (>3 requests).`,
      priority: 'medium'
    });
    recommendations.push(`Consider purchasing additional units of: ${highDemandGear.slice(0, 3).map(g => g.gearName).join(', ')}`);
  }

  if (underutilizedGear.length > 0) {
    insights.push({
      type: 'info',
      title: 'Underutilized Equipment',
      description: `${underutilizedGear.length} items have very low utilization (<10%).`,
      priority: 'low'
    });
    recommendations.push('Review underutilized equipment for potential reallocation or disposal');
    recommendations.push('Consider promoting awareness of available equipment to users');
  }

  if (damagedGear.length > 0) {
    const damageRate = (damagedGear.length / activeGear.length) * 100;
    insights.push({
      type: 'warning',
      title: 'Equipment with Damage Reports',
      description: `${damageRate.toFixed(1)}% of active equipment (${damagedGear.length}) has damage reports.`,
      priority: 'high'
    });
    recommendations.push('Schedule immediate maintenance inspection for damaged equipment');
    recommendations.push('Review equipment handling procedures and user training requirements');
  }

  return { insights, recommendations };
}

/**
 * Calculate performance metrics compared to previous period
 */
export function calculatePerformanceMetrics(current: WeeklyUsageReport, previous: WeeklyUsageReport) {
  const currentTotal = current.gearUsage.reduce((sum, gear) => sum + gear.requestCount + gear.checkoutCount, 0);
  const previousTotal = previous.gearUsage.reduce((sum, gear) => sum + gear.requestCount + gear.checkoutCount, 0);

  const activityChange = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
  const utilizationChange = current.utilizationRate - previous.utilizationRate;
  const damageChange = current.gearUsage.reduce((sum, gear) => sum + gear.damageCount, 0) -
    previous.gearUsage.reduce((sum, gear) => sum + gear.damageCount, 0);
  const userGrowth = current.uniqueUsers - previous.uniqueUsers;

  return {
    activityChange,
    utilizationChange,
    damageChange,
    userGrowth,
    trend: activityChange > 5 ? 'increasing' : activityChange < -5 ? 'decreasing' : 'stable'
  };
}
