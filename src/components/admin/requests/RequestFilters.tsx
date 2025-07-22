/**
 * Request Filters Component
 * 
 * Controls for filtering and searching gear requests.
 * Provides status filtering and search functionality.
 * 
 * @component
 */

import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { X } from "lucide-react";
import { DateRange } from "react-day-picker";

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

const RequestFilters: React.FC<RequestFiltersProps> = ({
    userFilter, setUserFilter,
    gearFilter, setGearFilter,
    keyword, setKeyword,
    filterStatus, setFilterStatus,
    dateRange, setDateRange,
    uniqueUserNames, uniqueGearNames,
    hasActiveFilters, filterChips, handleClearAllFilters
}) => (
    <div className="w-full">
        {/* Filter chips */}
        {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mb-2">
                {filterChips.map((chip, idx) => (
                    <span key={idx} className="inline-flex items-center bg-muted px-2 py-1 rounded-full text-xs text-foreground border">
                        {chip.label}
                        <button
                            className="ml-1 text-muted-foreground hover:text-red-500 focus:outline-none"
                            onClick={chip.onRemove}
                            aria-label={`Remove ${chip.label}`}
                            type="button"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </span>
                ))}
                <button
                    className="ml-1 px-2 py-1 rounded-full bg-orange-600 text-white text-xs hover:bg-orange-700 focus:outline-none"
                    onClick={handleClearAllFilters}
                    type="button"
                >
                    Clear All
                </button>
            </div>
        )}
        {/* Filters: horizontal scroll on mobile, row on desktop */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 sm:flex-wrap sm:overflow-visible">
            <Input
                placeholder="User name..."
                value={userFilter}
                onChange={e => setUserFilter(e.target.value)}
                className="max-w-[120px] sm:max-w-xs flex-shrink-0"
                list="user-names"
            />
            <datalist id="user-names">
                {uniqueUserNames.map(name => <option key={name} value={name} />)}
            </datalist>
            <Input
                placeholder="Gear..."
                value={gearFilter}
                onChange={e => setGearFilter(e.target.value)}
                className="max-w-[100px] sm:max-w-xs flex-shrink-0"
                list="gear-names"
            />
            <datalist id="gear-names">
                {uniqueGearNames.map(name => <option key={name} value={name} />)}
            </datalist>
            <DatePickerWithRange dateRange={dateRange} onDateRangeChange={setDateRange} className="flex-shrink-0" />
            <Input
                placeholder="Reason/destination..."
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                className="max-w-[120px] sm:max-w-xs flex-shrink-0"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[100px] sm:w-[140px] flex-shrink-0">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processed">Processed</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Checked Out">Checked Out</SelectItem>
                    <SelectItem value="Checked In">Checked In</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
            </Select>
        </div>
    </div>
);

export default RequestFilters; 