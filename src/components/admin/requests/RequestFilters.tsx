"use client";

import { useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

export const REQUEST_STATUS_OPTIONS = [
    { value: "all", label: "All statuses" },
    { value: "Pending", label: "Pending" },
    { value: "Approved", label: "Approved" },
    { value: "Checked Out", label: "Checked out" },
    { value: "Partially Checked Out", label: "Partially checked out" },
    { value: "Checked In", label: "Checked in" },
    { value: "Completed", label: "Completed" },
    { value: "Rejected", label: "Rejected" },
    { value: "Overdue", label: "Overdue" },
] as const;

interface RequestFiltersProps {
    userFilter: string;
    setUserFilter: (v: string) => void;
    gearFilter: string;
    setGearFilter: (v: string) => void;
    keyword: string;
    setKeyword: (v: string) => void;
    filterStatus: string;
    setFilterStatus: (v: string) => void;
    dateRange: DateRange | undefined;
    setDateRange: (v: DateRange | undefined) => void;
    uniqueUserNames: string[];
    uniqueGearNames: string[];
    hasActiveFilters: boolean;
    filterChips: { label: string; onRemove: () => void }[];
    handleClearAllFilters: () => void;
}

export default function RequestFilters({
    userFilter,
    setUserFilter,
    gearFilter,
    setGearFilter,
    keyword,
    setKeyword,
    filterStatus,
    setFilterStatus,
    dateRange,
    setDateRange,
    uniqueUserNames,
    uniqueGearNames,
    hasActiveFilters,
    filterChips,
    handleClearAllFilters,
}: RequestFiltersProps) {
    const [showAdvanced, setShowAdvanced] = useState(false);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search user, gear, reason, or destination..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="bg-background pl-9"
                    />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-full bg-background sm:w-[180px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            {REQUEST_STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <DatePickerWithRange
                        dateRange={dateRange}
                        onDateRangeChange={setDateRange}
                        className="h-10 w-full bg-background sm:w-auto"
                    />
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => setShowAdvanced((open) => !open)}
                >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    More filters
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showAdvanced && "rotate-180")} />
                </Button>
                {hasActiveFilters && (
                    <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={handleClearAllFilters}>
                        Clear all
                    </Button>
                )}
            </div>

            {showAdvanced && (
                <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">User</label>
                        <Input
                            placeholder="Filter by requester..."
                            value={userFilter === "all" ? "" : userFilter}
                            onChange={(e) => setUserFilter(e.target.value || "all")}
                            className="bg-background"
                            list="request-user-names"
                        />
                        <datalist id="request-user-names">
                            {uniqueUserNames.map((name) => (
                                <option key={name} value={name} />
                            ))}
                        </datalist>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Equipment</label>
                        <Input
                            placeholder="Filter by gear name..."
                            value={gearFilter === "all" ? "" : gearFilter}
                            onChange={(e) => setGearFilter(e.target.value || "all")}
                            className="bg-background"
                            list="request-gear-names"
                        />
                        <datalist id="request-gear-names">
                            {uniqueGearNames.map((name) => (
                                <option key={name} value={name} />
                            ))}
                        </datalist>
                    </div>
                </div>
            )}

            {filterChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    {filterChips.map((chip, idx) => (
                        <Badge key={idx} variant="secondary" className="gap-1 pr-1 font-normal">
                            {chip.label}
                            <button
                                type="button"
                                className="rounded-full p-0.5 hover:bg-background/80"
                                onClick={chip.onRemove}
                                aria-label={`Remove ${chip.label}`}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}
