import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WeeklyUsageReport } from './report';
import { format } from 'date-fns';

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
  if (report.activityTrends && report.activityTrends.length > 0) {
    csvData.push([]); // Empty row
    csvData.push(['ACTIVITY TRENDS']);
    csvData.push(['Date', 'Requests', 'Check-outs', 'Damages']);
    report.activityTrends.forEach(trend => {
      csvData.push([
        trend.date,
        trend.requests,
        trend.checkouts,
        trend.damages
      ]);
    });
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
