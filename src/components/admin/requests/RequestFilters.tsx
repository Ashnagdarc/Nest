import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Search, Filter } from "lucide-react";
import { DateRange } from "react-day-picker";
import { motion, AnimatePresence } from "framer-motion";

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
    hasActiveFilters, handleClearAllFilters
}) => (
    <div className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Main Search Input */}
            <div className="flex-1 w-full relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                    placeholder="Search by user, gear, or reason..."
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    className="pl-11 h-12 bg-background/50 border-none rounded-2xl focus-visible:ring-1 focus-visible:ring-primary/20 transition-all shadow-sm text-sm"
                />
            </div>

            {/* Quick Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[200px] h-12 bg-background/50 border-none rounded-2xl shadow-sm focus:ring-1 focus:ring-primary/20 text-sm">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <SelectValue placeholder="All Statuses" />
                    </div>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-xl">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Checked Out">Checked Out</SelectItem>
                    <SelectItem value="Checked In">Checked In</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
            </Select>

            {/* Date Range Buttonized */}
            <div className="w-full sm:w-auto">
                <DatePickerWithRange
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    className="h-12 bg-background/50 border-none rounded-2xl shadow-sm hover:bg-background/80 transition-all overflow-hidden"
                />
            </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 px-1">Advanced Filters:</div>
            <div className="flex flex-wrap gap-3">
                <div className="space-y-1">
                    <Input
                        placeholder="User name..."
                        value={userFilter === 'all' ? '' : userFilter}
                        onChange={e => setUserFilter(e.target.value)}
                        className="w-44 h-10 bg-accent/5 border-none rounded-2xl text-sm px-4 focus-visible:ring-primary/10"
                        list="user-names"
                    />
                </div>
                <datalist id="user-names">
                    {uniqueUserNames.map(name => <option key={name} value={name} />)}
                </datalist>

                <div className="space-y-1">
                    <Input
                        placeholder="Gear name..."
                        value={gearFilter === 'all' ? '' : gearFilter}
                        onChange={e => setGearFilter(e.target.value)}
                        className="w-44 h-10 bg-accent/5 border-none rounded-2xl text-sm px-4 focus-visible:ring-primary/10"
                        list="gear-names"
                    />
                </div>
                <datalist id="gear-names">
                    {uniqueGearNames.map(name => <option key={name} value={name} />)}
                </datalist>
            </div>

            {/* Active Chips */}
            <AnimatePresence>
                {hasActiveFilters && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={handleClearAllFilters}
                        className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-widest px-2"
                    >
                        Clear All
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    </div>
);

export default RequestFilters;