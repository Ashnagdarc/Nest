"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X } from 'lucide-react';

interface FilterControlsProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterCategory: string;
  setFilterCategory: (category: string) => void;
  handleClearAllFilters: () => void;
  hasActiveFilters: boolean;
  filterChips: { label: string; onRemove: () => void; }[];
}

export function FilterControls({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  filterCategory,
  setFilterCategory,
  handleClearAllFilters,
  hasActiveFilters,
  filterChips
}: FilterControlsProps) {
  return (
    <div className="mt-4 flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1 max-w-full sm:max-w-sm">
        <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, serial, brand, or model..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-background"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="Booked">Booked</SelectItem>
            <SelectItem value="Damaged">Damaged</SelectItem>
            <SelectItem value="Under Repair">Under Repair</SelectItem>
            <SelectItem value="New">New</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <SelectValue placeholder="Filter by Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Camera">Camera</SelectItem>
            <SelectItem value="Lens">Lens</SelectItem>
            <SelectItem value="Drone">Drone</SelectItem>
            <SelectItem value="Audio">Audio</SelectItem>
            <SelectItem value="Laptop">Laptop</SelectItem>
            <SelectItem value="Monitor">Monitor</SelectItem>
            <SelectItem value="Cables">Cables</SelectItem>
            <SelectItem value="Lighting">Lighting</SelectItem>
            <SelectItem value="Tripod">Tripod</SelectItem>
            <SelectItem value="Cars">Cars</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {filterChips.map((chip, idx) => (
            <span key={idx} className="inline-flex items-center bg-muted px-3 py-1 rounded-full text-sm text-foreground border">
              {chip.label}
              <button
                className="ml-2 text-muted-foreground hover:text-red-500 focus:outline-none"
                onClick={chip.onRemove}
                aria-label={`Remove ${chip.label}`}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          ))}
          <button
            className="ml-2 px-3 py-1 rounded-full bg-orange-600 text-white text-sm hover:bg-orange-700 focus:outline-none"
            onClick={handleClearAllFilters}
            type="button"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}
