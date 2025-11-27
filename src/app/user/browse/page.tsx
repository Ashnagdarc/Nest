// Equipment browse page for Nest by Eden Oasis. Provides catalog, search, and real-time status for all equipment.

"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Image from 'next/image';
import Link from 'next/link';
import { PackagePlus, Box, ArrowLeft, Filter, ChevronLeft, ChevronRight } from 'lucide-react'; // Icons for view details and request
import { getCategoryIcon } from '@/lib/utils/category';
import { createClient } from '@/lib/supabase/client';
// import { createGearNotification } from '@/lib/notifications'; // No longer used
import { useToast } from "@/hooks/use-toast";
import { apiGet } from '@/lib/apiClient';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * Equipment Interface
 * 
 * TypeScript interface defining the structure of equipment/gear
 * objects throughout the application with comprehensive field definitions.
 * 
 * @interface Gear
 */
interface Gear {
  /** Unique equipment identifier */
  id: string;
  /** Equipment name/title */
  name: string;
  /** Optional detailed description */
  description?: string | null;
  /** Equipment category for organization */
  category?: string | null;
  /** Current availability status */
  status?: string | null;
  /** Equipment image URL for display */
  image_url?: string | null;
  /** User ID if currently checked out */
  checked_out_to?: string | null;
  /** Current active request ID */
  current_request_id?: string | null;
  /** Last checkout timestamp */
  last_checkout_date?: string | null;
  /** Due date for return */
  due_date?: string | null;
  /** Creation timestamp */
  created_at?: string | null;
  /** Last update timestamp */
  updated_at?: string | null;
}

/**
 * Category Icon Mapping
 * 
 * Now using centralized category icons from @/lib/utils/category
 * for consistent visual representation across the application.
 */

/**
 * Category Color Mapping
 * 
 * Maps equipment categories to their corresponding badge colors
 * for consistent visual design and improved user experience.
 * Uses Tailwind CSS classes for color consistency.
 * 
 * @constant {Record<string, string>} categoryColors
 */
const categoryColors: Record<string, string> = {
  camera: 'bg-blue-100 text-blue-800',
  lens: 'bg-purple-100 text-purple-800',
  drone: 'bg-cyan-100 text-cyan-800',
  audio: 'bg-green-100 text-green-800',
  laptop: 'bg-indigo-100 text-indigo-800',
  monitor: 'bg-teal-100 text-teal-800',
  mouse: 'bg-violet-100 text-violet-800',
  batteries: 'bg-amber-100 text-amber-800',
  storage: 'bg-stone-100 text-stone-800',
  cables: 'bg-yellow-100 text-yellow-800',
  lighting: 'bg-orange-100 text-orange-800',
  tripod: 'bg-pink-100 text-pink-800',
  accessory: 'bg-gray-100 text-gray-800',
  cars: 'bg-red-100 text-red-800',
  gimbal: 'bg-fuchsia-100 text-fuchsia-800',
  microphone: 'bg-emerald-100 text-emerald-800',
  computer: 'bg-slate-100 text-slate-800',
  other: 'bg-gray-200 text-gray-700',
};

/**
 * Get Category Icon Component
 * 
 * Returns the appropriate icon component for a given equipment category
 * with consistent sizing and styling. Provides fallback icon for
 * unknown or undefined categories.
 * 
 * @param {string} [category] - Equipment category identifier
 * @param {number} [size=18] - Icon size in pixels
 * @returns {JSX.Element} Rendered icon component
 * 
 * @example
 * ```typescript
 * // Basic usage with default size
 * const cameraIcon = getCategoryIcon('camera');
 * 
 * // Custom size
 * const largeIcon = getCategoryIcon('laptop', 24);
 * 
 * // Handles undefined categories gracefully
 * const unknownIcon = getCategoryIcon(undefined); // Returns Box icon
 * ```
 */
// Using centralized getCategoryIcon from @/lib/utils/category

/**
 * Get Category Badge Class
 * 
 * Returns the appropriate CSS classes for category badge styling
 * based on the equipment category. Provides consistent visual
 * design across all equipment cards.
 * 
 * @param {string} [category] - Equipment category identifier
 * @returns {string} Tailwind CSS classes for badge styling
 * 
 * @example
 * ```typescript
 * // Get styling for camera equipment
 * const cameraStyles = getCategoryBadgeClass('camera');
 * // Returns: 'bg-blue-100 text-blue-800'
 * 
 * // Handle unknown categories
 * const unknownStyles = getCategoryBadgeClass('unknown');
 * // Returns: 'bg-gray-200 text-gray-700'
 * ```
 */
const getCategoryBadgeClass = (category?: string) => {
  const key = (category || '').toLowerCase();
  return categoryColors[key] || 'bg-gray-200 text-gray-700';
};

/**
 * Browse Gears Page Component
 * 
 * Main page component that renders the equipment catalog interface
 * with search, filtering, and browsing capabilities. Provides a
 * comprehensive view of all available equipment with real-time
 * status updates and interactive features.
 * 
 * Key Features:
 * - Real-time equipment data with Supabase subscriptions
 * - Advanced search and filtering capabilities
 * - Responsive grid layout with animated cards
 * - Equipment status indicators and category badges
 * - Quick equipment request workflow integration
 * - Scroll position preservation during updates
 * - Error handling with user feedback
 * 
 * State Management:
 * - Equipment data loading and caching
 * - Search and filter state management
 * - Loading states and error handling
 * - UI state preservation during updates
 * 
 * @component
 * @returns {JSX.Element} Equipment browse page interface
 * 
 * @example
 * ```typescript
 * // Basic usage in app routing
 * import BrowseGearsPage from '@/app/user/browse/page';
 * 
 * // Rendered at /user/browse route
 * <BrowseGearsPage />
 * ```
 */
export default function BrowseGearsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [gears, setGears] = useState<Gear[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('Available');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // --- UI State Preservation ---
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionRef = useRef<number>(0);

  const stableFetchGears = useCallback(fetchGears, [page, pageSize, filterStatus, filterCategory, debouncedSearch]);

  useEffect(() => {
    stableFetchGears();
  }, [stableFetchGears]);

  useEffect(() => {
    // fetch distinct categories once
    (async () => {
      const { data } = await supabase.from('gears').select('category').not('category', 'is', null).neq('category', '').neq('category', 'Cars').order('category');
      const distinct = Array.from(new Set((data || []).map((d: any) => d.category)));
      setCategories(distinct);
    })();

    // stable realtime subscription
    const channel = supabase
      .channel('public:gears')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gears' }, () => stableFetchGears())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [stableFetchGears]);

  async function fetchGears() {
    // Preserve scroll position before fetching
    if (listContainerRef.current) {
      scrollPositionRef.current = listContainerRef.current.scrollTop;
    }
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        status: filterStatus,
        category: filterCategory === 'Cars' ? 'all' : filterCategory,
        page: String(page),
        pageSize: String(pageSize),
        search: debouncedSearch,
      });
      // Always exclude Cars from browse list
      params.set('excludeCategories', 'Cars');
      const { data, total: apiTotal, error } = await apiGet<{ data: Gear[]; total: number; error: string | null }>(`/api/gears?${params.toString()}`);
      if (error) {
        console.error("Error fetching gears:", error);
        toast({
          title: "Error fetching gear",
          description: error || "Failed to load gear items",
          variant: "destructive",
        });
      } else {
        const gearData = data?.map((gear: Gear) => ({
          ...gear,
          imageUrl: gear.image_url
        })) || [];
        setGears(gearData);
        setTotal(apiTotal || 0);
      }
    } catch (err) {
      console.error("Exception when fetching gears:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        if (listContainerRef.current) {
          listContainerRef.current.scrollTop = scrollPositionRef.current;
        }
      }, 0);
    }
  }

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterCategory, searchTerm, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08 // Slightly faster stagger for cards
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0, scale: 0.95 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  // handleCheckout removed (not used in UI)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground truncate">
            Browse Equipment
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base lg:text-lg">
            Discover and request available equipment for your projects
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/user/dashboard">
            <Button variant="outline" size="sm" className="text-sm sm:text-base">
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Back to Dashboard</span>
              <span className="xs:hidden">Back</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile Filter Toggle */}
      <div className="sm:hidden flex justify-end">
        <Button
          variant="outline"
          size="sm"
          aria-label={showMobileFilters ? 'Hide Filters' : 'Show Filters'}
          onClick={() => setShowMobileFilters((v) => !v)}
          className="text-sm"
        >
          <Filter className="h-4 w-4 mr-2" />
          {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>

      {/* Filters and Search */}
      <AnimatePresence>
        {(showMobileFilters || typeof window === 'undefined' || window.innerWidth >= 640) && (
          <motion.div
            key="filters"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className={
              'sm:block ' +
              (showMobileFilters ? 'block' : 'hidden sm:block')
            }
          >
            <Card className="shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
                  <Input
                    placeholder="Search by gear name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow min-h-[44px] text-sm sm:text-base"
                    aria-label="Search by gear name"
                  />
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-full sm:w-[160px] lg:w-[180px] min-h-[44px] text-sm" aria-label="Filter by Status">
                        <SelectValue placeholder="Filter by Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="Partially Available">Partially Available</SelectItem>
                        <SelectItem value="Checked Out">Checked Out</SelectItem>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Under Repair">Under Repair</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Damaged">Damaged</SelectItem>
                        <SelectItem value="Retired">Retired</SelectItem>
                        <SelectItem value="New">New</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-full sm:w-[160px] lg:w-[180px] min-h-[44px] text-sm" aria-label="Filter by Category">
                        <SelectValue placeholder="Filter by Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center py-16 sm:py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            <p className="text-muted-foreground text-sm sm:text-base">Loading equipment...</p>
          </div>
        </div>
      )}

      {/* Gear Grid */}
      {!isLoading && (
        <>
          <motion.div
            ref={listContainerRef}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
          >
            {gears.length > 0 ? (
              gears.map((gear) => (
                <motion.div key={gear.id} variants={itemVariants}>
                  <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full group">
                    <CardHeader className="p-0">
                      <div className="w-full h-40 sm:h-48 lg:h-52 relative bg-card border overflow-hidden">
                        {gear.image_url ? (
                          <Image
                            src={gear.image_url}
                            alt={gear.name}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Box className="h-12 w-12 opacity-50" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <Badge variant={
                            gear.status === 'Available' ? 'default' :
                              gear.status === 'Partially Available' ? 'secondary' :
                                gear.status === 'Booked' ? 'secondary' :
                                  gear.status === 'Damaged' ? 'destructive' :
                                    gear.status === 'New' ? 'outline' :
                                      'secondary'
                          } className={`capitalize text-xs font-medium ${gear.status === 'Available' ? 'bg-green-500 text-white' :
                            gear.status === 'Partially Available' ? 'bg-yellow-500 text-white' : ''
                            }`}>
                            {gear.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-5 flex-grow">
                      <div className="space-y-2 sm:space-y-3">
                        <div>
                          <CardTitle className="text-base sm:text-lg font-semibold line-clamp-2 mb-2">{gear.name}</CardTitle>
                          <CardDescription className="text-xs sm:text-sm mb-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-medium text-xs ${getCategoryBadgeClass(gear.category || '')}`}>
                              {getCategoryIcon((gear.category as 'Camera' | 'Lens' | 'Drone' | 'Audio' | 'Laptop' | 'Monitor' | 'Mouse' | 'Batteries' | 'Storage' | 'Cables' | 'Lighting' | 'Tripod' | 'Cars') || '', 14)}
                              {gear.category}
                            </span>
                          </CardDescription>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed">{gear.description}</p>
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 sm:p-5 bg-muted/30 flex justify-end">
                      <Link href={`/user/request?gearId=${gear.id}`} aria-label={`Request ${gear.name}`} className="w-full">
                        <Button
                          size="sm"
                          disabled={gear.status !== 'Available' && gear.status !== 'Partially Available'}
                          aria-label={`Request ${gear.name}`}
                          className="w-full min-h-[44px] text-sm sm:text-base"
                        >
                          <PackagePlus className="mr-2 h-4 w-4" />
                          <span className="hidden xs:inline">Request Equipment</span>
                          <span className="xs:hidden">Request</span>
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-12 sm:py-16">
                <Box className="h-16 w-16 text-muted-foreground mb-4" />
                <div className="text-lg sm:text-xl font-semibold text-foreground mb-2">No equipment found</div>
                <div className="text-sm sm:text-base text-muted-foreground text-center max-w-md">
                  Try adjusting your filters or search terms to find what you&apos;re looking for.
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                    setFilterCategory('all');
                  }}
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </motion.div>

          {/* Responsive Pagination Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6 mt-6 sm:mt-8 p-4 sm:p-6 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 sm:gap-4 order-2 sm:order-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous Page"
                className="min-h-[44px] text-sm"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm sm:text-base font-medium">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Next Page"
                className="min-h-[44px] text-sm"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 order-1 sm:order-2">
              <span className="text-xs sm:text-sm text-muted-foreground">
                Showing {gears.length} of {total} items
              </span>
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-full sm:w-[120px] min-h-[44px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[8, 12, 16, 24, 32].map(size => (
                    <SelectItem key={size} value={size.toString()}>
                      {size} per page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

