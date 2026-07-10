"use client";

import { useEffect, useMemo, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import {
    ArrowDownLeft,
    ArrowUpRight,
    ClipboardList,
    RotateCcw,
    Search,
    Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PaginationFooter } from '@/components/ui/PaginationFooter';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ReportActivityRow } from '@/lib/reports/types';

interface ReportActivityTableProps {
    activity: ReportActivityRow[];
    loading?: boolean;
}

const PAGE_SIZE_OPTIONS = [15, 25, 50] as const;

type ActivityTone = 'blue' | 'emerald' | 'violet' | 'orange' | 'slate';

interface ActivityMeta {
    icon: LucideIcon;
    tone: ActivityTone;
    verb: string;
}

const TONE_STYLES: Record<ActivityTone, string> = {
    blue: 'bg-blue-500/10 text-blue-600',
    emerald: 'bg-emerald-500/10 text-emerald-600',
    violet: 'bg-violet-500/10 text-violet-600',
    orange: 'bg-orange-500/10 text-orange-600',
    slate: 'bg-muted text-muted-foreground',
};

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    const value = status.toLowerCase();
    if (value.includes('approve') || value.includes('complete')) return 'default';
    if (value.includes('reject')) return 'destructive';
    if (value.includes('pending')) return 'secondary';
    return 'outline';
}

function activityMeta(type: string): ActivityMeta {
    const value = type.toLowerCase();
    if (value.includes('check out')) {
        return { icon: ArrowUpRight, tone: 'emerald', verb: 'checked out' };
    }
    if (value.includes('check in') || value.includes('return')) {
        return { icon: ArrowDownLeft, tone: 'blue', verb: value.includes('return') ? 'returned' : 'checked in' };
    }
    if (value.includes('request')) {
        return { icon: ClipboardList, tone: 'violet', verb: 'requested' };
    }
    if (value.includes('maintenance') || value.includes('repair') || value.includes('damage')) {
        return { icon: Wrench, tone: 'orange', verb: 'logged maintenance for' };
    }
    return { icon: RotateCcw, tone: 'slate', verb: type.toLowerCase() };
}

function formatDayLabel(timestamp: string): string {
    const date = new Date(timestamp);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMM d');
}

function formatTime(timestamp: string): string {
    return format(new Date(timestamp), 'h:mm a');
}

function meaningfulDetail(row: ReportActivityRow): string | null {
    const detail = row.detail.trim();
    if (!detail) return null;
    if (detail.toLowerCase() === row.type.toLowerCase()) return null;
    if (detail === row.gearName) return null;
    return detail;
}

interface DayGroup {
    dayKey: string;
    label: string;
    rows: ReportActivityRow[];
}

function groupByDay(rows: ReportActivityRow[]): DayGroup[] {
    const groups: DayGroup[] = [];

    for (const row of rows) {
        const dayKey = format(new Date(row.timestamp), 'yyyy-MM-dd');
        const last = groups[groups.length - 1];
        if (!last || last.dayKey !== dayKey) {
            groups.push({
                dayKey,
                label: formatDayLabel(row.timestamp),
                rows: [row],
            });
            continue;
        }
        last.rows.push(row);
    }

    return groups;
}

function ActivityRow({ row }: { row: ReportActivityRow }) {
    const meta = activityMeta(row.type);
    const Icon = meta.icon;
    const detail = meaningfulDetail(row);

    return (
        <div className="flex items-start gap-3 px-3 py-2.5 sm:px-4">
            <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', TONE_STYLES[meta.tone])}>
                <Icon className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <p className="text-sm leading-snug">
                        <span className="font-medium">{row.userName}</span>
                        <span className="text-muted-foreground"> {meta.verb} </span>
                        <span className="font-medium">{row.gearName}</span>
                    </p>
                    <div className="flex shrink-0 items-center gap-2 sm:pl-3">
                        <span className="text-xs text-muted-foreground">{formatTime(row.timestamp)}</span>
                        <Badge variant={statusVariant(row.status)} className="text-[10px]">
                            {row.status}
                        </Badge>
                    </div>
                </div>

                {detail ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{detail}</p>
                ) : null}
            </div>
        </div>
    );
}

export function ReportActivityTable({ activity, loading = false }: ReportActivityTableProps) {
    const [typeFilter, setTypeFilter] = useState('all');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

    const types = useMemo(() => {
        const values = new Set(activity.map((row) => row.type));
        return Array.from(values).sort();
    }, [activity]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return activity.filter((row) => {
            const typeOk = typeFilter === 'all' || row.type === typeFilter;
            const text = `${row.userName} ${row.gearName} ${row.status} ${row.detail} ${row.type}`.toLowerCase();
            const searchOk = q === '' || text.includes(q);
            return typeOk && searchOk;
        });
    }, [activity, typeFilter, query]);

    useEffect(() => {
        setPage(1);
    }, [typeFilter, query, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);

    useEffect(() => {
        if (page !== safePage) {
            setPage(safePage);
        }
    }, [page, safePage]);

    const pageRows = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, safePage, pageSize]);

    const dayGroups = useMemo(() => groupByDay(pageRows), [pageRows]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <CardTitle className="text-base">Recent activity</CardTitle>
                        <CardDescription>
                            {loading
                                ? 'Loading events…'
                                : `${filtered.length} event${filtered.length === 1 ? '' : 's'} in this period`}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="sm:w-[200px]">
                            <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All types</SelectItem>
                            {types.map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search user, gear, or notes..."
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="h-14 animate-pulse rounded-md bg-muted" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                        No activity matches your filters
                    </div>
                ) : (
                    <>
                        <div className="overflow-hidden rounded-lg border">
                            {dayGroups.map((group) => (
                                <section key={group.dayKey}>
                                    <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-muted/60 px-3 py-2 backdrop-blur-sm sm:px-4">
                                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                            {group.label}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {group.rows.length} on this page
                                        </p>
                                    </div>
                                    <div className="divide-y">
                                        {group.rows.map((row) => (
                                            <ActivityRow key={row.id} row={row} />
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>

                        <PaginationFooter
                            page={safePage}
                            pageSize={pageSize}
                            total={filtered.length}
                            onPageChange={setPage}
                            pageSizeOptions={PAGE_SIZE_OPTIONS}
                            onPageSizeChange={setPageSize}
                            itemLabel="event"
                        />
                    </>
                )}
            </CardContent>
        </Card>
    );
}
