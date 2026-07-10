"use client";

import { motion } from "framer-motion";
import { Box, Edit, MoreHorizontal, Search, Trash2, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PaginationFooter } from "@/components/ui/PaginationFooter";
import { ListSkeleton } from "@/components/dashboard/ListSkeleton";
import {
    gearCategoryOptions,
    getCategoryBadgeClass as getSharedCategoryBadgeClass,
    getCategoryIcon,
} from "@/lib/utils/category";
import { getGearStatusClass } from "@/components/admin/manage-gears/gear-status";
import { GearQuantityDisplay } from "@/components/admin/manage-gears/gear-quantity-display";
import { PAGE_SIZE_OPTIONS, type ManageGearsPageState } from "@/hooks/admin/useManageGearsPage";
import { cn } from "@/lib/utils";
import type { Gear } from "@/types/supabase";

interface GearInventoryListCardProps {
    state: ManageGearsPageState;
}

const STATUS_FILTER_OPTIONS = [
    { value: "all", label: "All statuses" },
    { value: "Available", label: "Available" },
    { value: "Partially Available", label: "Partially available" },
    { value: "Checked Out", label: "Checked out" },
    { value: "Partially Checked Out", label: "Partially checked out" },
    { value: "Booked", label: "Booked" },
    { value: "Damaged", label: "Damaged" },
    { value: "Under Repair", label: "Under repair" },
    { value: "New", label: "New" },
] as const;

export function GearInventoryListCard({ state }: GearInventoryListCardProps) {
    const {
        gears,
        loading,
        total,
        apiError,
        searchTerm,
        setSearchTerm,
        filterStatus,
        setFilterStatus,
        filterCategory,
        setFilterCategory,
        hasActiveFilters,
        filterChips,
        handleClearAllFilters,
        selectedGearIds,
        handleSelectAll,
        handleSelectOne,
        listContainerRef,
        containerVariants,
        page,
        setPage,
        pageSize,
        setPageSize,
        handleOpenGearDetails,
        handleOpenEditDialog,
        handleDeleteGear,
        handleOpenMaintenance,
    } = state;

    const clearFilters = () => {
        setFilterStatus("all");
        setFilterCategory("all");
        setSearchTerm("");
    };

    const allOnPageSelected = selectedGearIds.length === gears.length && gears.length > 0;
    const someSelected = selectedGearIds.length > 0;

    return (
        <TooltipProvider delayDuration={300}>
            <Card className="overflow-hidden border-border/50 shadow-sm">
                <CardHeader className="space-y-4 border-b bg-muted/20 pb-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                            <CardTitle className="text-lg sm:text-xl">Equipment list</CardTitle>
                            <CardDescription>
                                {total} records in inventory · click a row to view details
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {loading && (
                                <span className="inline-flex items-center gap-1 text-primary">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                                    Updating
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 lg:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search name or serial number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-background pl-9"
                            />
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-full bg-background sm:w-[190px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_FILTER_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={filterCategory} onValueChange={setFilterCategory}>
                                <SelectTrigger className="w-full bg-background sm:w-[190px]">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All categories</SelectItem>
                                    {gearCategoryOptions.map(({ value, label }) => (
                                        <SelectItem key={value} value={value}>
                                            <span className="inline-flex items-center gap-1.5">
                                                {getCategoryIcon(value, 14)}
                                                {label}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {hasActiveFilters && (
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
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleClearAllFilters}>
                                Clear all
                            </Button>
                        </div>
                    )}
                </CardHeader>

                <CardContent className="p-0">
                    {apiError && (
                        <div className="border-b bg-destructive/5 px-4 py-3 text-center text-sm font-medium text-destructive">
                            {apiError}
                        </div>
                    )}

                    {loading && gears.length === 0 ? (
                        <div className="p-6">
                            <ListSkeleton rows={6} />
                        </div>
                    ) : gears.length === 0 ? (
                        <div className="flex flex-col items-center px-4 py-16 text-center">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                <Box className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="font-medium text-foreground">No equipment found</p>
                            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                Try adjusting your search or filters to find what you need.
                            </p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                                Clear filters
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Mobile card list */}
                            <div className="divide-y md:hidden">
                                {gears.map((gear) => (
                                    <GearMobileCard
                                        key={gear.id}
                                        gear={gear}
                                        selected={selectedGearIds.includes(gear.id)}
                                        onSelect={(checked) => handleSelectOne(gear.id, checked)}
                                        onOpenDetails={() => handleOpenGearDetails(gear)}
                                        onEdit={() => handleOpenEditDialog(gear)}
                                        onDelete={() => handleDeleteGear(gear)}
                                        onMaintenance={() => handleOpenMaintenance(gear)}
                                    />
                                ))}
                            </div>

                            {/* Desktop table */}
                            <motion.div
                                ref={listContainerRef}
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="hidden md:block"
                            >
                                <div className="max-h-[min(70vh,720px)] overflow-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="w-12 pl-4">
                                                    <Checkbox
                                                        checked={allOnPageSelected}
                                                        onCheckedChange={(checked) => handleSelectAll(checked === true)}
                                                        aria-label="Select all on page"
                                                    />
                                                </TableHead>
                                                <TableHead className="w-[72px]">Photo</TableHead>
                                                <TableHead className="min-w-[220px]">Equipment</TableHead>
                                                <TableHead className="min-w-[140px]">Category</TableHead>
                                                <TableHead className="min-w-[130px]">Status</TableHead>
                                                <TableHead className="min-w-[120px]">Availability</TableHead>
                                                <TableHead className="w-[130px] pr-4 text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {gears.map((gear) => (
                                                <GearTableRow
                                                    key={gear.id}
                                                    gear={gear}
                                                    selected={selectedGearIds.includes(gear.id)}
                                                    onSelect={(checked) => handleSelectOne(gear.id, checked)}
                                                    onOpenDetails={() => handleOpenGearDetails(gear)}
                                                    onEdit={() => handleOpenEditDialog(gear)}
                                                    onDelete={() => handleDeleteGear(gear)}
                                                    onMaintenance={() => handleOpenMaintenance(gear)}
                                                />
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </motion.div>
                        </>
                    )}
                </CardContent>

                {gears.length > 0 && (
                    <CardFooter className="border-t bg-muted/10 px-4 py-4">
                        <PaginationFooter
                            page={page}
                            pageSize={pageSize}
                            total={total}
                            onPageChange={setPage}
                            pageSizeOptions={PAGE_SIZE_OPTIONS}
                            onPageSizeChange={setPageSize}
                            pageSizeLabel="Rows per page"
                            itemLabel="record"
                            summary={
                                someSelected
                                    ? `${selectedGearIds.length} selected · ${total} total`
                                    : undefined
                            }
                            className="w-full border-0 bg-transparent p-0"
                        />
                    </CardFooter>
                )}
            </Card>
        </TooltipProvider>
    );
}

interface GearRowProps {
    gear: Gear;
    selected: boolean;
    onSelect: (checked: boolean) => void;
    onOpenDetails: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onMaintenance: () => void;
}

function GearThumb({ gear, size = "md" }: { gear: Gear; size?: "sm" | "md" }) {
    const dim = size === "sm" ? "h-12 w-12" : "h-14 w-14";
    return (
        <div
            className={cn(
                "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted shadow-sm",
                dim
            )}
        >
            {gear.image_url ? (
                <img src={gear.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
                getCategoryIcon(gear.category, size === "sm" ? 22 : 26)
            )}
        </div>
    );
}

function GearTableRow({
    gear,
    selected,
    onSelect,
    onOpenDetails,
    onEdit,
    onDelete,
    onMaintenance,
}: GearRowProps) {
    return (
        <TableRow
            data-state={selected ? "selected" : undefined}
            className={cn(
                "cursor-pointer transition-colors",
                selected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/40"
            )}
            onClick={onOpenDetails}
        >
            <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                    checked={selected}
                    onCheckedChange={(checked) => onSelect(checked === true)}
                    aria-label={`Select ${gear.name}`}
                />
            </TableCell>
            <TableCell className="py-3">
                <GearThumb gear={gear} />
            </TableCell>
            <TableCell className="py-3">
                <div className="space-y-0.5">
                    <p className="font-medium leading-snug text-foreground">{gear.name}</p>
                    {gear.serial_number ? (
                        <p className="font-mono text-xs text-muted-foreground">{gear.serial_number}</p>
                    ) : (
                        <p className="text-xs text-muted-foreground/70">No serial number</p>
                    )}
                </div>
            </TableCell>
            <TableCell className="py-3">
                <span
                    className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                        getSharedCategoryBadgeClass(gear.category)
                    )}
                >
                    {getCategoryIcon(gear.category, 14)}
                    {gear.category}
                </span>
            </TableCell>
            <TableCell className="py-3">
                <Badge variant="secondary" className={cn("border-0 font-normal", getGearStatusClass(gear.status))}>
                    {gear.status}
                </Badge>
            </TableCell>
            <TableCell className="py-3">
                <GearQuantityDisplay gear={gear} />
            </TableCell>
            <TableCell className="py-3 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                <GearRowActions onEdit={onEdit} onDelete={onDelete} onMaintenance={onMaintenance} />
            </TableCell>
        </TableRow>
    );
}

function GearMobileCard({
    gear,
    selected,
    onSelect,
    onOpenDetails,
    onEdit,
    onDelete,
    onMaintenance,
}: GearRowProps) {
    return (
        <div
            className={cn(
                "flex gap-3 p-4 transition-colors active:bg-muted/50",
                selected && "bg-primary/5"
            )}
        >
            <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                    checked={selected}
                    onCheckedChange={(checked) => onSelect(checked === true)}
                    aria-label={`Select ${gear.name}`}
                />
            </div>
            <button type="button" className="flex min-w-0 flex-1 gap-3 text-left" onClick={onOpenDetails}>
                <GearThumb gear={gear} size="sm" />
                <div className="min-w-0 flex-1 space-y-2">
                    <div>
                        <p className="font-medium leading-snug">{gear.name}</p>
                        {gear.serial_number && (
                            <p className="mt-0.5 font-mono text-xs text-muted-foreground">{gear.serial_number}</p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary" className={cn("border-0 text-[11px]", getGearStatusClass(gear.status))}>
                            {gear.status}
                        </Badge>
                        <Badge variant="outline" className="text-[11px] font-normal">
                            {gear.category}
                        </Badge>
                    </div>
                    <GearQuantityDisplay gear={gear} compact />
                </div>
            </button>
            <div className="shrink-0 self-start" onClick={(e) => e.stopPropagation()}>
                <GearRowActions
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onMaintenance={onMaintenance}
                    mobile
                />
            </div>
        </div>
    );
}

function GearRowActions({
    onEdit,
    onDelete,
    onMaintenance,
    mobile = false,
}: {
    onEdit: () => void;
    onDelete: () => void;
    onMaintenance: () => void;
    mobile?: boolean;
}) {
    if (mobile) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEdit}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onMaintenance}>
                        <Wrench className="mr-2 h-4 w-4" />
                        Maintenance
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <div className="inline-flex justify-end gap-0.5">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={onEdit}
                    >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={onMaintenance}
                    >
                        <Wrench className="h-4 w-4 text-amber-600" />
                        <span className="sr-only">Maintenance</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Maintenance</TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-destructive hover:text-destructive"
                        onClick={onDelete}
                    >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
            </Tooltip>
        </div>
    );
}
