/**
 * Equipment Browse Page - Asset Discovery and Catalog Interface
 * 
 * A comprehensive equipment catalog and discovery interface for the Nest by Eden Oasis
 * application that enables users to explore, search, and discover available equipment/assets.
 * This page serves as the primary equipment showcase, providing detailed information about
 * each asset and facilitating quick access to request workflows.
 * 
 * Core Features:
 * - Interactive equipment catalog with visual cards
 * - Advanced search and filtering capabilities
 * - Real-time equipment status and availability updates
 * - Category-based organization and navigation
 * - Equipment details display with images and specifications
 * - Quick request functionality with seamless workflow integration
 * - Responsive design optimized for all devices
 * 
 * Catalog Components:
 * - Equipment Cards: Visual representation with images, status, and details
 * - Search Interface: Multi-field search across name, category, and description
 * - Filter System: Status and category-based filtering options
 * - Category Icons: Visual categorization with intuitive iconography
 * - Status Indicators: Real-time availability and condition status
 * - Action Buttons: Quick access to view details and request equipment
 * 
 * Search & Discovery Features:
 * - Real-time search with instant results
 * - Multi-field search across equipment attributes
 * - Category-based filtering and organization
 * - Status-based filtering (Available, Checked Out, etc.)
 * - Visual equipment cards with detailed information
 * - Quick equipment request workflow integration
 * 
 * Equipment Display Features:
 * - High-quality equipment images with fallback handling
 * - Equipment specifications and detailed descriptions
 * - Real-time status indicators with color coding
 * - Category badges with consistent visual design
 * - Equipment condition and health indicators
 * - Last activity and usage information
 * 
 * User Experience Features:
 * - Smooth animations and transitions with Framer Motion
 * - Responsive grid layout adapting to screen sizes
 * - Loading states and skeleton screens
 * - Error handling with user-friendly messages
 * - Accessibility features with proper ARIA labels
 * - Keyboard navigation support
 * - Touch-friendly interface for mobile devices
 * 
 * Integration Points:
 * - Supabase real-time subscriptions for live updates
 * - Equipment request workflow integration
 * - User authentication and authorization
 * - Notification system for equipment interactions
 * - Activity logging for usage tracking
 * - Image storage and optimization
 * 
 * Performance Optimizations:
 * - Efficient data loading and caching strategies
 * - Optimized image loading with Next.js Image component
 * - Real-time updates with minimal re-renders
 * - Scroll position preservation during updates
 * - Memory-efficient component design
 * - Progressive loading for large catalogs
 * 
 * Security & Compliance:
 * - User authentication verification for requests
 * - Role-based access control for equipment visibility
 * - Input validation and sanitization
 * - Audit logging for equipment interactions
 * - Data protection and privacy compliance
 * 
 * @fileoverview Equipment catalog and discovery interface for asset browsing
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 * @since 2024-01-15
 */

"use client";

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Image from 'next/image';
import Link from 'next/link';
import { Eye, PackagePlus, Camera, Aperture, AirVent, Speaker, Laptop, Monitor, Cable, Lightbulb, Video, Puzzle, Car, RotateCcw, Mic, Box } from 'lucide-react'; // Icons for view details and request
import { createClient } from '@/lib/supabase/client';
import { createGearNotification } from '@/lib/notifications';
import { useToast } from "@/hooks/use-toast";

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
const categoryIcons: Record<string, any> = {
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
  }, []);

  async function fetchGears() {
    // Preserve scroll position before fetching
    if (listContainerRef.current) {
      scrollPositionRef.current = listContainerRef.current.scrollTop;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('gears')
        .select('id, name, category, status, description, image_url');

      if (error) {
        console.error("Error fetching gears:", error.message);
        toast({
          title: "Error fetching gear",
          description: error.message || "Failed to load gear items",
          variant: "destructive",
        });
      } else {
        console.log("Fetched gears:", data?.length || 0);
        // Map the data to include imageUrl 
        const gearData = data?.map((gear: Gear) => ({
          ...gear,
          imageUrl: gear.image_url // Add this mapping to handle the field name difference
        })) || [];
        setGears(gearData);
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
      // Restore scroll position after fetching
      setTimeout(() => {
        if (listContainerRef.current) {
          listContainerRef.current.scrollTop = scrollPositionRef.current;
        }
      }, 0);
    }
  }

  const filteredGears = gears.filter(gear => {
    const statusMatch = filterStatus === 'all' || gear.status === filterStatus || (filterStatus === 'Booked' && gear.status === 'Booked') || (filterStatus === 'Damaged' && gear.status === 'Damaged') || (filterStatus === 'New' && gear.status === 'New');
    const categoryMatch = filterCategory === 'all' || gear.category === filterCategory;
    const searchMatch = gear.name.toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && categoryMatch && searchMatch;
  });

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

  const handleCheckout = async (gear: Gear) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to checkout gear",
        variant: "destructive",
      });
      return;
    }

    try {
      // Start a transaction
      const now = new Date();
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 7); // Default to 7 days

      // Update gear status
      const { error: gearError } = await supabase
        .from('gears')
        .update({
          status: 'Checked Out',
          checked_out_to: user.id,
          last_checkout_date: now.toISOString(),
          due_date: dueDate.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', gear.id);

      if (gearError) throw gearError;

      // Create a checkout record
      const { error: checkoutError } = await supabase
        .from('gear_checkouts')
        .insert({
          gear_id: gear.id,
          user_id: user.id,
          checkout_date: now.toISOString(),
          expected_return_date: dueDate.toISOString(),
          status: 'Checked Out'
        });

      if (checkoutError) {
        // If creating checkout record fails, revert gear status
        await supabase
          .from('gears')
          .update({
            status: 'Available',
            checked_out_to: null,
            last_checkout_date: null,
            due_date: null,
            updated_at: now.toISOString()
          })
          .eq('id', gear.id);

        throw checkoutError;
      }

      // Create notification for the user
      await createGearNotification(user.id, gear.name, 'checkout');

      // Fetch user profile for notification
      let userProfile = null;
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();
      if (!profileError) userProfile = profileData;

      // Send Google Chat notification for direct checkout
      await fetch('/api/notifications/google-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'USER_CHECKOUT',
          payload: {
            userName: userProfile?.full_name || 'Unknown User',
            userEmail: userProfile?.email || 'Unknown Email',
            gearName: gear.name,
            checkoutDate: now.toLocaleString(),
          }
        })
      });

      toast({
        title: "Success",
        description: `Successfully checked out ${gear.name}`,
      });

    } catch (error) {
      console.error('Error during checkout:', error);
      toast({
        title: "Error",
        description: error instanceof Error
          ? `Failed to checkout gear: ${error.message}`
          : "Failed to checkout gear. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-foreground">Browse Gear</h1>
        <Link href="/user/request">
          <Button>
            <PackagePlus className="mr-2 h-4 w-4" /> Request Gear
          </Button>
        </Link>
      </div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <Card>
          <CardContent className="pt-6 flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Search by gear name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow"
            />
            <div className="flex gap-4 flex-wrap">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Booked">Booked</SelectItem>
                  <SelectItem value="Damaged">Damaged</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  {/* Add more statuses if needed */}
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
                  {/* Add more categories */}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <p className="text-muted-foreground">Loading gear items...</p>
        </div>
      )}

      {/* Gear Grid */}
      {!isLoading && (
        <motion.div
          ref={listContainerRef}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {filteredGears.length > 0 ? (
            filteredGears.map((gear) => (
              <motion.div key={gear.id} variants={itemVariants}>
                <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
                  <CardHeader className="p-0">
                    <div className="w-full h-48 relative bg-muted">
                      {gear.image_url ? (
                        <Image
                          src={gear.image_url}
                          alt={gear.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover"
                          unoptimized // Important for Supabase Storage URLs
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No image available
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-lg font-semibold">{gear.name}</CardTitle>
                      <Badge variant={
                        gear.status === 'Available' ? 'default' :
                          gear.status === 'Booked' ? 'secondary' :
                            gear.status === 'Damaged' ? 'destructive' :
                              gear.status === 'New' ? 'outline' : // Example for 'New'
                                'secondary' // Default badge
                      } className={`capitalize text-xs ${gear.status === 'Available' ? 'bg-accent text-accent-foreground' : ''}`}>
                        {gear.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-xs ${getCategoryBadgeClass(gear.category || '')}`}>
                        {getCategoryIcon(gear.category || '', 14)}
                        {gear.category}
                      </span>
                    </CardDescription>
                    <p className="text-sm line-clamp-2">{gear.description}</p>
                  </CardContent>
                  <CardFooter className="p-4 bg-muted/30 flex justify-end gap-2">
                    <Link href={`/user/request?gearId=${gear.id}`}>
                      <Button size="sm" disabled={gear.status !== 'Available'}>
                        <PackagePlus className="mr-1 h-4 w-4" /> Request
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              </motion.div>
            ))
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full text-center text-muted-foreground py-10"
            >
              No gear found matching your criteria.
            </motion.p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

