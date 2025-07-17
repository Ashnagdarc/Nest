// Equipment browse page for Nest by Eden Oasis. Provides catalog, search, and real-time status for all equipment.

"use client";

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Image from 'next/image';
import Link from 'next/link';
import { PackagePlus, Camera, Aperture, AirVent, Speaker, Laptop, Monitor, Cable, Lightbulb, Video, Puzzle, Car, RotateCcw, Mic, Box, LucideIcon } from 'lucide-react'; // Icons for view details and request
import { createClient } from '@/lib/supabase/client';
// import { createGearNotification } from '@/lib/notifications'; // No longer used
import { useToast } from "@/hooks/use-toast";
import { apiGet } from '@/lib/apiClient';

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
 * Maps equipment categories to their corresponding Lucide React icons
 * for consistent visual representation across the application.
 * Provides intuitive iconography for equipment categorization.
 * 
 * @constant {Record<string, any>} categoryIcons
 */
const categoryIcons: Record<string, LucideIcon> = {
  camera: Camera,
  lens: Aperture,
  drone: AirVent,
  audio: Speaker,
  laptop: Laptop,
  monitor: Monitor,
  cables: Cable,
  lighting: Lightbulb,
  tripod: Video,
  accessory: Puzzle,
  cars: Car,
  gimbal: RotateCcw,
  microphone: Mic,
  computer: Monitor,
  other: Box,
};

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
const getCategoryIcon = (category?: string, size = 18) => {
  const key = (category || '').toLowerCase();
  const Icon = categoryIcons[key] || Box;
  return <Icon size={size} className="inline-block mr-1 align-text-bottom text-muted-foreground" />;
};

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
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // --- UI State Preservation ---
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionRef = useRef<number>(0);

  useEffect(() => {
    fetchGears();
    // Set up real-time subscription (filtered events)
    const channel = supabase
      .channel('public:gears')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gears' }, fetchGears)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'gears' }, fetchGears)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'gears' }, fetchGears)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [page, pageSize, filterStatus, filterCategory, searchTerm]);

  async function fetchGears() {
    // Preserve scroll position before fetching
    if (listContainerRef.current) {
      scrollPositionRef.current = listContainerRef.current.scrollTop;
    }
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        status: filterStatus,
        category: filterCategory,
        page: String(page),
        pageSize: String(pageSize),
        search: searchTerm,
      });
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
      className="space-y-4 sm:space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Browse Gear</h1>
        <Link href="/user/request" aria-label="Request Gear">
          <Button aria-label="Request Gear">
            <PackagePlus className="mr-2 h-4 w-4" /> Request Gear
          </Button>
        </Link>
      </div>

      {/* Mobile Filters Toggle */}
      <div className="sm:hidden flex justify-end mb-2">
        <Button
          variant="outline"
          size="sm"
          aria-label={showMobileFilters ? 'Hide Filters' : 'Show Filters'}
          onClick={() => setShowMobileFilters((v) => !v)}
        >
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
            <Card>
              <CardContent className="pt-4 sm:pt-6 flex flex-col md:flex-row gap-2 sm:gap-4">
                <Input
                  placeholder="Search by gear name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-grow min-h-[44px]"
                  aria-label="Search by gear name"
                />
                <div className="flex gap-2 sm:gap-4 flex-wrap">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]" aria-label="Filter by Status">
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Booked">Booked</SelectItem>
                      <SelectItem value="Damaged">Damaged</SelectItem>
                      <SelectItem value="New">New</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]" aria-label="Filter by Category">
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
                      <SelectItem value="Accessory">Accessory</SelectItem>
                      <SelectItem value="Cars">Cars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center py-16 sm:py-20">
          <p className="text-muted-foreground">Loading gear items...</p>
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
            className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6"
          >
            {gears.length > 0 ? (
              gears.map((gear) => (
                <motion.div key={gear.id} variants={itemVariants}>
                  <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
                    <CardHeader className="p-0">
                      <div className="w-full h-32 sm:h-48 relative bg-muted">
                        {gear.image_url ? (
                          <Image
                            src={gear.image_url}
                            alt={gear.name}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            No image available
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 flex-grow">
                      <div className="flex justify-between items-start mb-1 sm:mb-2">
                        <CardTitle className="text-base sm:text-lg font-semibold">{gear.name}</CardTitle>
                        <Badge variant={
                          gear.status === 'Available' ? 'default' :
                            gear.status === 'Booked' ? 'secondary' :
                              gear.status === 'Damaged' ? 'destructive' :
                                gear.status === 'New' ? 'outline' :
                                  'secondary'
                        } className={`capitalize text-xs ${gear.status === 'Available' ? 'bg-accent text-accent-foreground' : ''}`}>
                          {gear.status}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs sm:text-sm mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-xs ${getCategoryBadgeClass(gear.category || '')}`}
                        >
                          {getCategoryIcon(gear.category || '', 14)}
                          {gear.category}
                        </span>
                      </CardDescription>
                      <p className="text-xs sm:text-sm line-clamp-2">{gear.description}</p>
                    </CardContent>
                    <CardFooter className="p-3 sm:p-4 bg-muted/30 flex justify-end gap-2">
                      <Link href={`/user/request?gearId=${gear.id}`} aria-label={`Request ${gear.name}`}>
                        <Button size="sm" disabled={gear.status !== 'Available'} aria-label={`Request ${gear.name}`}
                          className="min-h-[44px] min-w-[44px]">
                          <PackagePlus className="mr-1 h-4 w-4" /> Request
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-8 sm:py-12">
                <Box className="h-10 w-10 text-gray-400 mb-2" />
                <div className="text-base sm:text-lg font-semibold text-gray-600 mb-1">No gear found</div>
                <div className="text-xs sm:text-sm text-muted-foreground mb-2">Try adjusting your filters or search.</div>
              </div>
            )}
          </motion.div>

          {/* Sticky Pagination Controls for mobile */}
          <div className="fixed bottom-0 left-0 w-full z-20 bg-background border-t border-border py-2 px-2 flex sm:static sm:border-0 sm:bg-transparent sm:py-0 sm:px-0 justify-center items-center gap-2 sm:gap-4 mt-4 sm:mt-8 shadow-sm sm:shadow-none">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous Page"
              className="min-h-[44px] min-w-[44px]"
            >
              Previous
            </Button>
            <span className="text-xs sm:text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next Page"
              className="min-h-[44px] min-w-[44px]"
            >
              Next
            </Button>
            <span className="ml-2 sm:ml-4 text-[10px] sm:text-xs text-muted-foreground">
              Showing {gears.length} of {total} items
            </span>
            <select
              className="ml-2 sm:ml-4 border rounded px-2 py-1 text-[10px] sm:text-xs bg-background min-h-[36px]"
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              aria-label="Items per page"
            >
              {[8, 12, 16, 24, 32].map(size => (
                <option key={size} value={size}>{size} / page</option>
              ))}
            </select>
          </div>
        </>
      )}
    </motion.div>
  );
}

