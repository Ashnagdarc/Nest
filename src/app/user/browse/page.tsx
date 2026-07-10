// Equipment browse page for Nest by Eden Oasis. Catalog with search, filters, and real-time availability.

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaginationFooter } from "@/components/ui/PaginationFooter";
import { GearCard } from "@/components/browse/GearCard";
import { GearFilters, DEFAULT_FILTERS, type GearFilterState } from "@/components/browse/GearFilters";
import { GearGridSkeleton } from "@/components/browse/GearGridSkeleton";
import type { BrowseGear } from "@/components/browse/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { apiGet } from "@/lib/apiClient";
import { useDebounce } from "@/hooks/useDebounce";

const PAGE_SIZE_OPTIONS = [8, 12, 16, 24, 32];

const gridVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

export default function BrowseGearsPage() {
    const { toast } = useToast();

    const [gears, setGears] = useState<BrowseGear[]>([]);
    const [filters, setFilters] = useState<GearFilterState>(DEFAULT_FILTERS);
    const debouncedSearch = useDebounce(filters.search, 300);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);
    const [total, setTotal] = useState(0);

    const fetchGears = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                status: filters.availableOnly ? "Available" : "all",
                category: filters.category,
                page: String(page),
                pageSize: String(pageSize),
                search: debouncedSearch,
                excludeCategories: "Cars",
            });
            const { data, total: apiTotal, error } = await apiGet<{
                data: BrowseGear[];
                total: number;
                error: string | null;
            }>(`/api/gears?${params.toString()}`);

            if (error) {
                toast({ title: "Error fetching gear", description: error, variant: "destructive" });
            } else {
                setGears(data ?? []);
                setTotal(apiTotal ?? 0);
            }
        } catch (err) {
            console.error("Exception when fetching gears:", err);
            toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [filters.availableOnly, filters.category, page, pageSize, debouncedSearch, toast]);

    useEffect(() => {
        fetchGears();
    }, [fetchGears]);

    // Refresh the catalog when equipment changes (e.g. someone checks gear out).
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel("public:gears")
            .on("postgres_changes", { event: "*", schema: "public", table: "gears" }, () => fetchGears())
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchGears]);

    // Back to page 1 whenever filters or page size change.
    useEffect(() => {
        setPage(1);
    }, [filters.availableOnly, filters.category, debouncedSearch, pageSize]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6"
        >
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-6">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Browse Equipment</h1>
                    <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                        Discover and request available equipment for your projects
                    </p>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                    <Link href="/user/dashboard">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Link>
                </Button>
            </header>

            {/* Search & Filters */}
            <GearFilters filters={filters} onChange={setFilters} />

            {/* Results */}
            {isLoading ? (
                <GearGridSkeleton count={Math.min(pageSize, 8)} />
            ) : gears.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
                    <Box className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-lg sm:text-xl font-semibold text-foreground mb-2">No equipment found</p>
                    <p className="text-sm sm:text-base text-muted-foreground max-w-md">
                        Try adjusting your filters or search terms to find what you&apos;re looking for.
                    </p>
                    <Button variant="outline" onClick={() => setFilters(DEFAULT_FILTERS)} className="mt-4">
                        Reset Filters
                    </Button>
                </div>
            ) : (
                <>
                    <motion.div
                        variants={gridVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
                    >
                        {gears.map((gear) => (
                            <GearCard key={gear.id} gear={gear} />
                        ))}
                    </motion.div>

                    <PaginationFooter
                        page={page}
                        pageSize={pageSize}
                        total={total}
                        onPageChange={setPage}
                        pageSizeOptions={PAGE_SIZE_OPTIONS}
                        onPageSizeChange={setPageSize}
                        pageSizeLabel="Per page"
                        itemLabel="item"
                        className="mt-4"
                    />
                </>
            )}
        </motion.div>
    );
}
