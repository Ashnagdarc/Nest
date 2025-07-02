/**
 * Inventory Filters Component
 * 
 * Controls for filtering and searching equipment inventory.
 * Provides status filtering, category filtering, and search functionality.
 * 
 * @component
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Filter, Tag, Search } from 'lucide-react';

interface InventoryFiltersProps {
    filter: string;
    onFilterChange: (value: string) => void;
    categoryFilter: string;
    onCategoryFilterChange: (value: string) => void;
    categories: string[];
    searchTerm: string;
    onSearchChange: (value: string) => void;
}

export function InventoryFilters({
    filter,
    onFilterChange,
    categoryFilter,
    onCategoryFilterChange,
    categories,
    searchTerm,
    onSearchChange
}: InventoryFiltersProps) {
    return (
        <div className="flex gap-2 items-center flex-wrap">
            {/* Status Filter */}
            <Select value={filter} onValueChange={onFilterChange}>
                <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="checked_out">Checked Out</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                    <SelectItem value="booked">Booked</SelectItem>
                </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
                <SelectTrigger className="w-[180px]">
                    <Tag className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by Category" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                        <SelectItem key={category} value={category}>
                            {category}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search equipment..."
                    className="pl-8 w-[250px]"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
        </div>
    );
} 