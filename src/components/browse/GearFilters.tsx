"use client";

import { Search, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { gearCategoryOptions, getCategoryIcon } from "@/lib/utils/category";

const browseCategoryOptions = gearCategoryOptions.filter(({ value }) => value !== "Cars");

export interface GearFilterState {
    search: string;
    category: string;
    /** When true, hide fully checked-out gear. Default shows everything together. */
    availableOnly: boolean;
}

export const DEFAULT_FILTERS: GearFilterState = {
    search: "",
    category: "all",
    availableOnly: false,
};

interface GearFiltersProps {
    filters: GearFilterState;
    onChange: (filters: GearFilterState) => void;
}

export function GearFilters({ filters, onChange }: GearFiltersProps) {
    const hasActiveFilters =
        filters.search !== "" ||
        filters.category !== "all" ||
        filters.availableOnly;

    return (
        <Card className="shadow-sm border-border/50">
            <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
                    {/* Search */}
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Search equipment..."
                            value={filters.search}
                            onChange={(e) => onChange({ ...filters, search: e.target.value })}
                            className="pl-9 pr-9 min-h-[44px]"
                            aria-label="Search equipment"
                        />
                        {filters.search && (
                            <button
                                type="button"
                                onClick={() => onChange({ ...filters, search: "" })}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                aria-label="Clear search"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <Select
                            value={filters.category}
                            onValueChange={(category) => onChange({ ...filters, category })}
                        >
                            <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]" aria-label="Filter by category">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {browseCategoryOptions.map(({ value, label }) => (
                                    <SelectItem key={value} value={value}>
                                        <span className="inline-flex items-center gap-1.5">
                                            {getCategoryIcon(value, 14)} {label}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2.5 rounded-lg border border-border px-3 min-h-[44px]">
                            <Switch
                                id="available-only"
                                checked={filters.availableOnly}
                                onCheckedChange={(availableOnly) => onChange({ ...filters, availableOnly })}
                            />
                            <Label htmlFor="available-only" className="text-sm font-medium cursor-pointer whitespace-nowrap">
                                Available only
                            </Label>
                        </div>

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                onClick={() => onChange(DEFAULT_FILTERS)}
                                className="min-h-[44px] text-sm text-muted-foreground"
                            >
                                <X className="h-4 w-4 mr-1.5" />
                                Reset
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
