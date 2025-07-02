/**
 * Request Filters Component
 * 
 * Controls for filtering and searching gear requests.
 * Provides status filtering and search functionality.
 * 
 * @component
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Filter, Search } from 'lucide-react';

interface RequestFiltersProps {
    filter: string;
    onFilterChange: (value: string) => void;
    searchTerm: string;
    onSearchChange: (value: string) => void;
}

export function RequestFilters({
    filter,
    onFilterChange,
    searchTerm,
    onSearchChange
}: RequestFiltersProps) {
    return (
        <div className="flex gap-2 items-center">
            {/* Status Filter */}
            <Select value={filter} onValueChange={onFilterChange}>
                <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Requests</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="checked_out">Checked Out</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="partially_returned">Partially Returned</SelectItem>
                </SelectContent>
            </Select>

            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search requests..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
        </div>
    );
} 