/**
 * Report Tables Component
 * 
 * Table components for displaying user and gear activity data.
 * Handles filtering, sorting, and detailed activity display.
 * 
 * @component
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, Package } from 'lucide-react';
import { WeeklyUsageReport, UserStats, GearStats } from '@/services/report-client';

interface ReportTablesProps {
    report: WeeklyUsageReport;
    selectedUser: UserStats | null;
    selectedGear: GearStats | null;
    onSelectUser: (user: UserStats) => void;
    onSelectGear: (gear: GearStats) => void;
}

export function ReportTables({
    report,
    selectedUser,
    selectedGear,
    onSelectUser,
    onSelectGear
}: ReportTablesProps) {
    return (
        <div className="space-y-6">
            {/* User Activity Table */}
            <Card className="break-inside-avoid">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Users className="h-4 w-4" />
                        User Activity
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="text-xs font-medium">User</TableHead>
                                    <TableHead className="text-center text-xs font-medium w-20">Requests</TableHead>
                                    <TableHead className="text-center text-xs font-medium w-20">Check-Outs</TableHead>
                                    <TableHead className="text-center text-xs font-medium w-20">Overdue</TableHead>
                                    <TableHead className="text-center text-xs font-medium w-20">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.userStats.filter(user => user.requests > 0 || user.checkouts > 0 || user.checkins > 0).length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-6 text-sm text-muted-foreground">
                                            No user activity for this period.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    report.userStats
                                        .filter(user => user.requests > 0 || user.checkouts > 0 || user.checkins > 0)
                                        .sort((a, b) => (b.requests + b.checkouts) - (a.requests + a.checkouts))
                                        .slice(0, 10) // Show top 10 users
                                        .map((user, idx) => (
                                            <TableRow
                                                key={user.id || idx}
                                                className={`hover:bg-muted/30 ${selectedUser?.id === user.id ? 'bg-muted/50' : ''}`}
                                            >
                                                <TableCell className="py-2">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarImage src={undefined} alt={user.name} />
                                                            <AvatarFallback className="text-xs">{user.name?.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm font-medium truncate">{user.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center text-sm py-2">{user.requests}</TableCell>
                                                <TableCell className="text-center text-sm py-2">{user.checkouts}</TableCell>
                                                <TableCell className="text-center py-2">
                                                    {user.overdue > 0 ? (
                                                        <Badge variant="destructive" className="text-xs">{user.overdue}</Badge>
                                                    ) : (
                                                        <span className="text-sm">{user.overdue}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center py-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onSelectUser(user)}
                                                        className="text-xs"
                                                    >
                                                        View
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Gear Activity Table */}
            <Card className="break-inside-avoid">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Package className="h-4 w-4" />
                        Gear Activity
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="text-xs font-medium">Gear</TableHead>
                                    <TableHead className="text-center text-xs font-medium w-20">Requests</TableHead>
                                    <TableHead className="text-center text-xs font-medium w-20">Check-Outs</TableHead>
                                    <TableHead className="text-center text-xs font-medium w-20">Utilization</TableHead>
                                    <TableHead className="text-center text-xs font-medium w-20">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.gearUsage.filter(gear => gear.requestCount > 0 || gear.checkoutCount > 0 || gear.checkinCount > 0).length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-6 text-sm text-muted-foreground">
                                            No gear activity for this period.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    report.gearUsage
                                        .filter(gear => gear.requestCount > 0 || gear.checkoutCount > 0 || gear.checkinCount > 0)
                                        .sort((a, b) => (b.requestCount + b.checkoutCount) - (a.requestCount + a.checkoutCount))
                                        .slice(0, 10) // Show top 10 gear items
                                        .map((gear, idx) => (
                                            <TableRow
                                                key={gear.gearName || idx}
                                                className={`hover:bg-muted/30`}
                                            >
                                                <TableCell className="py-2">
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-medium">{gear.gearName}</p>
                                                        <p className="text-xs text-muted-foreground">{gear.status || 'Unknown status'}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center text-sm py-2">{gear.requestCount}</TableCell>
                                                <TableCell className="text-center text-sm py-2">{gear.checkoutCount}</TableCell>
                                                <TableCell className="text-center py-2">
                                                    <Badge
                                                        variant={gear.utilization && gear.utilization > 70 ? "destructive" :
                                                            gear.utilization && gear.utilization > 40 ? "default" : "secondary"}
                                                        className="text-xs"
                                                    >
                                                        {gear.utilization ? `${gear.utilization.toFixed(0)}%` : 'N/A'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center py-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-xs"
                                                    >
                                                        View
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 