import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, FileText, FileSpreadsheet } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { WeeklyUsageReport, GearUsage, generateUsageReportForRange, UserStats, GearStats } from "@/services/report";
import { generatePdfReport, generateCsvReport } from "@/services/reportExport";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ChartContainer } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Helper to format numbers with commas
const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

interface WeeklyReportProps {
  dateRange: DateRange | undefined;
}

export function WeeklyActivityReport({ dateRange }: WeeklyReportProps) {
  const [report, setReport] = useState<WeeklyUsageReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [selectedGear, setSelectedGear] = useState<GearStats | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Function to generate the report based on date range
  const generateReport = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      setError('Please select a date range');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const generatedReport = await generateUsageReportForRange(
        dateRange.from,
        dateRange.to
      );
      setReport(generatedReport);
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to download the report as CSV
  const downloadAsCsv = () => {
    if (!report) return;
    generateCsvReport(report);
  };

  // Function to download the report as PDF (WYSIWYG snapshot)
  const downloadAsPdf = async () => {
    if (!reportRef.current) return;
    const element = reportRef.current;
    // Use html2canvas to capture the report
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    // Calculate image dimensions to fit A4
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    let position = 0;
    let remainingHeight = imgHeight;
    let pageNum = 0;
    // Multi-page logic
    while (remainingHeight > 0) {
      const sourceY = (imgHeight - remainingHeight) * (canvas.height / imgHeight);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      // Calculate the height for this page in source pixels
      const pageCanvasHeight = Math.min(canvas.height - sourceY, (pageHeight * canvas.width) / pageWidth);
      pageCanvas.height = pageCanvasHeight;
      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          canvas,
          0, sourceY, canvas.width, pageCanvasHeight, // source x, y, w, h
          0, 0, canvas.width, pageCanvasHeight // dest x, y, w, h
        );
      }
      const pageImgData = pageCanvas.toDataURL('image/png');
      if (pageNum > 0) pdf.addPage();
      pdf.addImage(pageImgData, 'PNG', 0, 0, imgWidth, pageHeight);
      remainingHeight -= pageHeight;
      pageNum++;
    }
    pdf.save(`gear-activity-report-snapshot.pdf`);
  };

  // Function to calculate total activity count
  const calculateTotalActivity = (gear: GearUsage): number => {
    return gear.requestCount + gear.checkoutCount + gear.checkinCount + gear.bookingCount + gear.damageCount;
  };

  // Calculate activity totals if report exists
  const totals = report?.gearUsage.reduce(
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

  return (
    <Card className="shadow-md" ref={reportRef}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Weekly Activity Report</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={generateReport}
              disabled={isLoading || !dateRange?.from || !dateRange?.to}
              size="sm"
              variant="outline"
              className="h-9"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                    <path d="M3.5 2C3.22386 2 3 2.22386 3 2.5V12.5C3 12.7761 3.22386 13 3.5 13H11.5C11.7761 13 12 12.7761 12 12.5V6H8.5C8.22386 6 8 5.77614 8 5.5V2H3.5ZM9 2.70711L11.2929 5H9V2.70711ZM2 2.5C2 1.67157 2.67157 1 3.5 1H8.5C8.63261 1 8.75979 1.05268 8.85355 1.14645L12.8536 5.14645C12.9473 5.24021 13 5.36739 13 5.5V12.5C13 13.3284 12.3284 14 11.5 14H3.5C2.67157 14 2 13.3284 2 12.5V2.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                  </svg>
                  Generate Report
                </>
              )}
            </Button>
            {report && (
              <div className="flex gap-2">
                <Button onClick={downloadAsCsv} size="sm" variant="outline" className="h-9">
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-green-500" />
                  CSV
                </Button>
                <Button onClick={downloadAsPdf} size="sm" variant="outline" className="h-9">
                  <FileText className="mr-2 h-4 w-4 text-blue-500" />
                  PDF (Snapshot)
                </Button>
              </div>
            )}
          </div>
        </div>
        <CardDescription>
          Comprehensive summary of gear activities for the selected period
          {report && ` (${report.startDate} to ${report.endDate})`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-destructive/10 p-4 rounded-lg mb-4 text-destructive border border-destructive/20">
            <p className="font-medium">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-8">
            <Skeleton className="h-8 w-1/2 mb-4" />
            <Skeleton className="h-32 w-full mb-4" />
            <Skeleton className="h-8 w-1/3 mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : report ? (
          <TooltipProvider>
            <div className="space-y-8">
              {/* --- Activity Trend Chart --- */}
              {report.activityTrends && report.activityTrends.length > 0 && (
                <div className="bg-muted/10 p-4 rounded-lg border">
                  <h3 className="font-semibold text-lg mb-2 text-primary">Activity Trends</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={report.activityTrends} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <RechartsTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="requests" stroke="#0D8ABC" strokeWidth={2} name="Requests" />
                      <Line type="monotone" dataKey="checkouts" stroke="#32A852" strokeWidth={2} name="Check-Outs" />
                      <Line type="monotone" dataKey="damages" stroke="#E03A3F" strokeWidth={2} name="Damages" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <Separator className="my-6" />
              {/* --- Summary Section --- */}
              <div className="bg-muted/10 p-4 rounded-lg border">
                <h3 className="font-semibold text-lg mb-2 text-primary">Summary & Insights</h3>
                <p className="text-muted-foreground mb-2">{report.summary}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  <div>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <span className="block text-xs text-muted-foreground">Most Active User</span>
                      </TooltipTrigger>
                      <TooltipContent>User with the most requests and check-outs.</TooltipContent>
                    </UITooltip>
                    <span className="font-bold flex items-center gap-2">
                      {report.mostActiveUser ? (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={report.userStats.find(u => u.name === report.mostActiveUser)?.avatar_url || undefined} alt={report.mostActiveUser} />
                          <AvatarFallback>{report.mostActiveUser.charAt(0)}</AvatarFallback>
                        </Avatar>
                      ) : null}
                      {report.mostActiveUser ? (
                        <button className="underline text-primary" onClick={() => setSelectedUser(report.userStats.find(u => u.name === report.mostActiveUser) || null)}>{report.mostActiveUser}</button>
                      ) : '-'}
                    </span>
                  </div>
                  <div>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <span className="block text-xs text-muted-foreground">Most Active Gear</span>
                      </TooltipTrigger>
                      <TooltipContent>Gear with the most requests and check-outs.</TooltipContent>
                    </UITooltip>
                    <span className="font-bold">{report.mostActiveGear || '-'}</span>
                  </div>
                  <div>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <span className="block text-xs text-muted-foreground">Unique Users</span>
                      </TooltipTrigger>
                      <TooltipContent>Number of unique users who participated.</TooltipContent>
                    </UITooltip>
                    <span className="font-bold">{report.uniqueUsers}</span>
                  </div>
                  <div>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <span className="block text-xs text-muted-foreground">Avg. Request Duration</span>
                      </TooltipTrigger>
                      <TooltipContent>Average duration of requests in days.</TooltipContent>
                    </UITooltip>
                    <span className="font-bold">{report.avgRequestDuration.toFixed(1)} days</span>
                  </div>
                  <div>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <span className="block text-xs text-muted-foreground">Overdue Returns</span>
                      </TooltipTrigger>
                      <TooltipContent>Number of overdue returns.</TooltipContent>
                    </UITooltip>
                    <Badge variant={report.overdueReturns > 0 ? "destructive" : "secondary"} className="font-bold">{report.overdueReturns}</Badge>
                  </div>
                  <div>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <span className="block text-xs text-muted-foreground">Utilization Rate</span>
                      </TooltipTrigger>
                      <TooltipContent>Percentage of gears currently checked out.</TooltipContent>
                    </UITooltip>
                    <Badge variant="secondary" className="font-bold">{report.utilizationRate.toFixed(1)}%</Badge>
                  </div>
                </div>
              </div>
              <Separator className="my-6" />
              {/* --- User Activity Table --- */}
              <div className="border rounded-lg overflow-x-auto">
                <h4 className="font-semibold text-base p-4 pb-0 text-primary">User Activity</h4>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <span>User</span>
                          </TooltipTrigger>
                          <TooltipContent>User name and avatar.</TooltipContent>
                        </UITooltip>
                      </TableHead>
                      <TableHead className="text-center">
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <span>Requests</span>
                          </TooltipTrigger>
                          <TooltipContent>Number of requests made.</TooltipContent>
                        </UITooltip>
                      </TableHead>
                      <TableHead className="text-center">
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <span>Check-Outs</span>
                          </TooltipTrigger>
                          <TooltipContent>Number of check-outs.</TooltipContent>
                        </UITooltip>
                      </TableHead>
                      <TableHead className="text-center">
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <span>Check-Ins</span>
                          </TooltipTrigger>
                          <TooltipContent>Number of check-ins.</TooltipContent>
                        </UITooltip>
                      </TableHead>
                      <TableHead className="text-center">
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <span>Overdue</span>
                          </TooltipTrigger>
                          <TooltipContent>Number of overdue items.</TooltipContent>
                        </UITooltip>
                      </TableHead>
                      <TableHead className="text-center">
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <span>Damages</span>
                          </TooltipTrigger>
                          <TooltipContent>Number of damages reported.</TooltipContent>
                        </UITooltip>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.userStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No user activity for this period.</TableCell>
                      </TableRow>
                    ) : report.userStats.map((user, idx) => (
                      <TableRow key={user.id || idx}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                              <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <button className="underline text-primary" onClick={() => setSelectedUser(user)}>{user.name}</button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{user.requests}</TableCell>
                        <TableCell className="text-center">{user.checkouts}</TableCell>
                        <TableCell className="text-center">{user.checkins}</TableCell>
                        <TableCell className="text-center">{user.overdue > 0 ? <Badge variant="destructive">{user.overdue}</Badge> : user.overdue}</TableCell>
                        <TableCell className="text-center">{user.damages > 0 ? <Badge variant="destructive">{user.damages}</Badge> : user.damages}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Separator className="my-6" />
              {/* --- Gear Activity & Status Table --- */}
              <div className="border rounded-lg overflow-x-auto">
                <h4 className="font-semibold text-base p-4 pb-0 text-primary">Gear Activity & Status</h4>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <span>Gear Name</span>
                          </TooltipTrigger>
                          <TooltipContent>Gear name and image.</TooltipContent>
                        </UITooltip>
                      </TableHead>
                      <TableHead>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <span>Status</span>
                          </TooltipTrigger>
                          <TooltipContent>Current status of the gear.</TooltipContent>
                        </UITooltip>
                      </TableHead>
                      <TableHead className="text-center">
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <span>Requests</span>
                          </TooltipTrigger>
                          <TooltipContent>Number of requests.</TooltipContent>
                        </UITooltip>
                      </TableHead>
                      <TableHead className="text-center">
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <span>Check-Outs</span>
                          </TooltipTrigger>
                          <TooltipContent>Number of check-outs.</TooltipContent>
                        </UITooltip>
                      </TableHead>
                      <TableHead className="text-center">
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <span>Check-Ins</span>
                          </TooltipTrigger>
                          <TooltipContent>Number of check-ins.</TooltipContent>
                        </UITooltip>
                      </TableHead>
                      <TableHead className="text-center">
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <span>Bookings</span>
                          </TooltipTrigger>
                          <TooltipContent>Number of bookings.</TooltipContent>
                        </UITooltip>
                      </TableHead>
                      <TableHead className="text-center">
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <span>Damages</span>
                          </TooltipTrigger>
                          <TooltipContent>Number of damages.</TooltipContent>
                        </UITooltip>
                      </TableHead>
                      <TableHead className="text-center">
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <span>Utilization</span>
                          </TooltipTrigger>
                          <TooltipContent>Utilization percentage.</TooltipContent>
                        </UITooltip>
                      </TableHead>
                      <TableHead className="text-center">
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <span>Last Activity</span>
                          </TooltipTrigger>
                          <TooltipContent>Last activity timestamp.</TooltipContent>
                        </UITooltip>
                      </TableHead>
                      <TableHead className="text-center">
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <span>Total Activity</span>
                          </TooltipTrigger>
                          <TooltipContent>Total activity count.</TooltipContent>
                        </UITooltip>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.gearUsage.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No gear activity for this period.</TableCell>
                      </TableRow>
                    ) : report.gearUsage.map((gear, idx) => (
                      <TableRow key={gear.id || idx}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {gear.image_url ? (
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={gear.image_url} alt={gear.gearName} />
                                <AvatarFallback>{gear.gearName?.charAt(0)}</AvatarFallback>
                              </Avatar>
                            ) : (
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>{gear.gearName?.charAt(0)}</AvatarFallback>
                              </Avatar>
                            )}
                            <button className="underline text-primary" onClick={() => setSelectedGear(gear)}>{gear.gearName}</button>
                          </div>
                        </TableCell>
                        <TableCell>{gear.status ? <Badge variant="secondary">{gear.status}</Badge> : '-'}</TableCell>
                        <TableCell className="text-center">{gear.requestCount}</TableCell>
                        <TableCell className="text-center">{gear.checkoutCount}</TableCell>
                        <TableCell className="text-center">{gear.checkinCount}</TableCell>
                        <TableCell className="text-center">{gear.bookingCount}</TableCell>
                        <TableCell className="text-center">{gear.damageCount > 0 ? <Badge variant="destructive">{gear.damageCount}</Badge> : gear.damageCount}</TableCell>
                        <TableCell className="text-center">{gear.utilization !== undefined ? `${gear.utilization.toFixed(1)}%` : '-'}</TableCell>
                        <TableCell className="text-center">{gear.lastActivity ? new Date(gear.lastActivity).toLocaleString() : '-'}</TableCell>
                        <TableCell className="text-center">{calculateTotalActivity(gear)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* --- Drilldown Modals --- */}
              <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>User Details</DialogTitle>
                  </DialogHeader>
                  {selectedUser && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={selectedUser.avatar_url || undefined} alt={selectedUser.name} />
                          <AvatarFallback>{selectedUser.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-lg">{selectedUser.name}</span>
                      </div>
                      <div className="space-y-1">
                        <div>Requests: {selectedUser.requests}</div>
                        <div>Check-Outs: {selectedUser.checkouts}</div>
                        <div>Check-Ins: {selectedUser.checkins}</div>
                        <div>Overdue: {selectedUser.overdue}</div>
                        <div>Damages: {selectedUser.damages}</div>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
              <Dialog open={!!selectedGear} onOpenChange={() => setSelectedGear(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Gear Details</DialogTitle>
                  </DialogHeader>
                  {selectedGear && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={selectedGear.image_url || undefined} alt={selectedGear.gearName} />
                          <AvatarFallback>{selectedGear.gearName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-lg">{selectedGear.gearName}</span>
                      </div>
                      <div className="space-y-1">
                        <div>Status: {selectedGear.status || '-'}</div>
                        <div>Requests: {selectedGear.requestCount}</div>
                        <div>Check-Outs: {selectedGear.checkoutCount}</div>
                        <div>Check-Ins: {selectedGear.checkinCount}</div>
                        <div>Bookings: {selectedGear.bookingCount}</div>
                        <div>Damages: {selectedGear.damageCount}</div>
                        <div>Utilization: {selectedGear.utilization !== undefined ? `${selectedGear.utilization.toFixed(1)}%` : '-'}</div>
                        <div>Last Activity: {selectedGear.lastActivity ? new Date(selectedGear.lastActivity).toLocaleString() : '-'}</div>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </TooltipProvider>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mb-4 text-muted"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a4 4 0 018 0v2m-4-4V7m0 0a4 4 0 10-8 0v4a4 4 0 008 0z" /></svg>
            <span className="text-lg font-semibold">No activity data for this period.</span>
            <span className="text-sm">Try selecting a different date range.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
