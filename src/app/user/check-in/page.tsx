/**
 * Equipment Check-In Page - Asset return workflow with QR scanning, condition reporting,
 * and multi-item selection for comprehensive equipment return management.
 * 
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 */

"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { createSystemNotification } from '@/lib/notifications';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Loader2, Package, QrCode } from 'lucide-react';
import { motion } from 'framer-motion';
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from '@/components/ui/label';
import { UploadCloud, PackageCheck } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import dynamic from 'next/dynamic';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';
import { User } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History } from 'lucide-react';
import { Calendar } from 'lucide-react';
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';

/**
 * Dynamic Lottie Import - prevents SSR issues and reduces bundle size
 */
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

/**
 * Success Animation Import - check-in success animation for visual feedback
 */
import checkinSuccessAnimation from "@/../public/animations/checkin-success.json";

// Initialize Supabase client
const supabase = createClient();

/**
 * Type Definitions for Equipment Check-In System
 * 
 * Comprehensive type definitions for equipment return workflow
 * with proper TypeScript support and data validation.
 */

/**
 * Gear Checkout Record Interface
 * 
 * Represents a checkout record with dates and status information
 * for tracking equipment usage periods and return deadlines.
 */
type GearCheckoutRecord = {
  /** Date when equipment was checked out */
  checkout_date: string;
  /** Date when equipment is due for return */
  due_date: string;
  /** Current checkout status */
  status: string;
};

/**
 * Gear with Checkout Information
 * 
 * Equipment object extended with checkout records for
 * comprehensive return workflow management.
 */
type GearWithCheckout = {
  /** Unique equipment identifier */
  id: string;
  /** Equipment name/title */
  name: string;
  /** Current equipment status */
  status: string;
  /** Equipment category */
  category: string;
  /** Equipment image URL */
  imageUrl: string;
  /** Associated checkout records */
  gear_checkouts: GearCheckoutRecord[];
};

/**
 * Gear Request Interface
 * 
 * Represents equipment request with checkout information
 * for linking returns to original requests.
 */
type GearRequest = {
  /** Unique request identifier */
  id: string;
  /** Array of equipment IDs in request */
  gear_ids: string[];
  /** Request status */
  status: string;
  /** Checkout date */
  checkout_date: string;
  /** Due date for return */
  due_date: string;
};

/**
 * Basic Gear Interface
 * 
 * Core equipment data structure for status and
 * ownership tracking during return process.
 */
type Gear = {
  /** Unique equipment identifier */
  id: string;
  /** Current equipment status */
  status: string;
  /** User ID of current checkout holder */
  checked_out_to: string;
  /** Optional due date for return */
  due_date?: string;
};

/**
 * Processed Gear Interface
 * 
 * Comprehensive equipment data structure used throughout
 * the check-in interface with all necessary fields.
 */
type ProcessedGear = {
  /** Unique equipment identifier */
  id: string;
  /** Equipment name/title */
  name: string;
  /** Equipment category */
  category: string;
  /** Current equipment status */
  status: string;
  /** User ID of current checkout holder */
  checked_out_to: string | null;
  /** Current active request ID */
  current_request_id: string | null;
  /** Last checkout timestamp */
  last_checkout_date: string | null;
  /** Due date for return */
  due_date: string | null;
  /** Equipment image URL */
  image_url: string | null;
};

/**
 * Gear Data Interface
 * 
 * Primary equipment data structure for check-in operations
 * with complete metadata and status information.
 */
type GearData = {
  /** Unique equipment identifier */
  id: string;
  /** Equipment name/title */
  name: string;
  /** Current equipment status */
  status: string;
  /** Equipment category */
  category: string;
  /** Equipment image URL */
  image_url: string | null;
  /** User ID of current checkout holder */
  checked_out_to: string;
  /** Due date for return */
  due_date: string | null;
  /** Current active request ID */
  current_request_id: string | null;
  /** Last checkout timestamp */
  last_checkout_date: string | null;
};

/**
 * Postgres Change Payload Interface
 * 
 * Type definition for Supabase real-time change events
 * to handle equipment status updates during check-in.
 */
type PostgresChangePayload = {
  /** Database schema name */
  schema: string;
  /** Table name */
  table: string;
  /** Change timestamp */
  commit_timestamp: string;
  /** Type of database event */
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  /** New record data */
  new: Record<string, any>;
  /** Old record data */
  old: Record<string, any>;
  /** Any errors that occurred */
  errors: null | any[];
};

/**
 * Check-In History Interface
 * 
 * Represents historical check-in records for audit
 * trails and user activity tracking.
 */
type CheckInHistory = {
  /** Unique check-in record identifier */
  id: string;
  /** Name of returned equipment */
  gearName: string;
  /** Date when equipment was checked in */
  checkinDate: Date;
  /** Return status */
  status: string;
  /** Equipment condition upon return */
  condition: string;
  /** Additional notes about the return */
  notes: string;
};

/**
 * Image URL Validation Helper
 * 
 * Type guard function to validate equipment image URLs
 * and ensure proper image display with fallback handling.
 * 
 * @param {string | null | undefined} url - Image URL to validate
 * @returns {url is string} True if URL is valid string
 */
const isValidImageUrl = (url: string | null | undefined): url is string => {
  return typeof url === 'string' && url.trim().length > 0;
};

/**
 * Date Parsing Helper
 * 
 * Safely parses date strings with error handling to prevent
 * invalid date objects and provide proper date validation.
 * 
 * @param {string | null} dateStr - Date string to parse
 * @returns {Date | null} Parsed date object or null if invalid
 */
const parseDate = (dateStr: string | null): Date | null => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Check-In Gear Page Component
 * 
 * Main page component that renders the equipment check-in interface
 * with QR scanning, condition reporting, and return workflow management.
 * Provides comprehensive equipment return capabilities with real-time
 * updates and visual feedback.
 * 
 * Key Features:
 * - Real-time checked-out equipment display
 * - QR code scanning for equipment identification
 * - Multi-select equipment return processing
 * - Condition reporting and damage documentation
 * - Check-in history tracking and display
 * - Automated notifications and status updates
 * - Visual success feedback with animations
 * 
 * State Management:
 * - Equipment data with real-time subscriptions
 * - QR scanner state and error handling
 * - Form state for condition reporting
 * - Modal and dialog state management
 * - Loading and success state tracking
 * 
 * @component
 * @returns {JSX.Element} Equipment check-in page interface
 * 
 * @example
 * ```typescript
 * // Basic usage in app routing
 * import CheckInGearPage from '@/app/user/check-in/page';
 * 
 * // Rendered at /user/check-in route
 * <CheckInGearPage />
 * ```
 */
export default function CheckInGearPage() {
  // Core services and utilities
  const { toast } = useToast();
  const supabase = createClient();

  // Equipment and user state
  const [checkedOutGears, setCheckedOutGears] = useState<ProcessedGear[]>([]);
  const [selectedGears, setSelectedGears] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [checkInHistory, setCheckInHistory] = useState<CheckInHistory[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  // Condition reporting state
  const [isDamaged, setIsDamaged] = useState(false);
  const [damageDescription, setDamageDescription] = useState('');
  const [checkinNotes, setCheckinNotes] = useState('');

  // UI state management
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // QR scanner state
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  // UI state preservation
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionRef = useRef<number>(0);

  /**
   * User Authentication Effect
   * 
   * Retrieves current user information for equipment ownership
   * validation and check-in authorization.
   */
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          setUserId(user.id);
        }
      } catch (error) {
        console.error('Failed to get user:', error);
      }
    };
    fetchUser();
  }, [supabase]);

  /**
   * Equipment Data and Real-time Updates Effect
   * 
   * Fetches checked-out equipment data and sets up real-time subscriptions
   * for live updates when equipment status changes. Preserves scroll position
   * during updates for optimal user experience.
   */
  useEffect(() => {
    if (!userId) return;

    /**
     * Fetch Checked-Out Equipment with Scroll Preservation
     * 
     * Retrieves equipment data while maintaining UI state to prevent
     * disruptive scroll position changes during real-time updates.
     */
    const fetchCheckedOutGearsWithScroll = async () => {
      // Preserve scroll position before data refresh
      if (listContainerRef.current) {
        scrollPositionRef.current = listContainerRef.current.scrollTop;
      }

      await fetchCheckedOutGear();

      // Restore scroll position after data refresh
      setTimeout(() => {
        if (listContainerRef.current) {
          listContainerRef.current.scrollTop = scrollPositionRef.current;
        }
      }, 0);
    };

    // Initial data fetch
    fetchCheckedOutGearsWithScroll();

    // Set up real-time subscription for equipment changes
    const gearChannel = supabase
      .channel('gear_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'gears',
        filter: `checked_out_to=eq.${userId}`
      }, fetchCheckedOutGearsWithScroll)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'gears',
        filter: `checked_out_to=eq.${userId}`
      }, fetchCheckedOutGearsWithScroll)
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'gears',
        filter: `checked_out_to=eq.${userId}`
      }, fetchCheckedOutGearsWithScroll)
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(gearChannel);
    };
  }, [userId, toast]);

  /**
   * QR Scanner Initialization Effect
   * 
   * Initializes the HTML5 QR code scanner when the scanner modal
   * is opened and cleans up resources when closed.
   */
  useEffect(() => {
    if (!scannerInitialized && !scannedCode && isScannerOpen) {
      // Delay to ensure DOM element is ready
      const timeoutId = setTimeout(() => {
        const element = document.getElementById("qr-reader");
        if (!element) {
          console.warn("QR reader element not found, will retry");
          return;
        }

        try {
          const scanner = new Html5QrcodeScanner("qr-reader", {
            qrbox: {
              width: 250,
              height: 250,
            },
            fps: 5,
          }, false);

          scanner.render(
            (decodedText) => {
              setScannedCode(decodedText);
              scanner.clear();
            },
            (error) => {
              console.warn(error);
              setQrError("Failed to read QR code. Please try again.");
            }
          );

          setScannerInitialized(true);

          return () => {
            scanner.clear();
          };
        } catch (error) {
          console.error("Error initializing QR scanner:", error);
          setQrError("Failed to initialize scanner. Please try again.");
        }
      }, 300);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [scannerInitialized, scannedCode, isScannerOpen]);

  const handleCheckboxChange = (gearId: string, checked: boolean | string) => {
    if (checked === true) { // Ensure it's strictly boolean true
      setSelectedGears((prev) => [...prev, gearId]);
    } else {
      setSelectedGears((prev) => prev.filter((id) => id !== gearId));
    }
  };

  // Function to fetch checked out gear
  const fetchCheckedOutGear = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: gears, error } = await supabase
        .from('gears')
        .select(`
          id,
          name,
          category,
          status,
          checked_out_to,
          current_request_id,
          last_checkout_date,
          due_date,
          image_url
        `)
        .eq('checked_out_to', user.id)
        .eq('status', 'Checked Out');

      if (error) {
        console.error("Error fetching checked out gear:", error);
        return;
      }

      setCheckedOutGears(gears || []);
    } catch (error) {
      console.error("Error in fetchCheckedOutGear:", error);
    }
  };

  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("No authenticated user found");
      }
      const userId = user.id;

      // Step 1: Create check-in records for each gear
      const checkedInGearNames: string[] = [];
      for (const gearId of selectedGears) {
        const gear = checkedOutGears.find(g => g.id === gearId);
        if (!gear) continue;
        checkedInGearNames.push(gear.name);

        // Create a pending check-in record
        const { error: checkinError } = await supabase
          .from('checkins')
          .insert({
            user_id: userId,
            gear_id: gearId,
            request_id: gear.current_request_id,
            checkin_date: new Date().toISOString(),
            status: 'Pending Admin Approval',
            condition: isDamaged ? 'Damaged' : 'Good',
            damage_notes: isDamaged ? damageDescription : null,
            notes: checkinNotes
          });

        if (checkinError) {
          console.error("Error creating check-in record:", checkinError);
          throw new Error(`Failed to create check-in record: ${checkinError.message}`);
        }

        // Log the check-in activity
        const { error: activityError } = await supabase.rpc(
          'log_gear_activity',
          {
            p_user_id: userId,
            p_gear_id: gearId,
            p_request_id: gear.current_request_id,
            p_activity_type: 'Check-in',
            p_status: 'Pending Admin Approval',
            p_notes: isDamaged ? damageDescription : checkinNotes,
            p_details: JSON.stringify({
              condition: isDamaged ? 'Damaged' : 'Good',
              damage_notes: isDamaged ? damageDescription : null,
              checkin_notes: checkinNotes
            })
          }
        );

        if (activityError) {
          console.error("Error logging check-in activity:", activityError);
          throw new Error(`Failed to log check-in activity: ${activityError.message}`);
        }

        // Update gear status to "Pending Check-in"
        const { error: gearUpdateError } = await supabase
          .from('gears')
          .update({
            status: 'Pending Check-in',
            updated_at: new Date().toISOString()
          })
          .eq('id', gearId);

        if (gearUpdateError) {
          console.error("Error updating gear status:", gearUpdateError);
          throw new Error(`Failed to update gear status: ${gearUpdateError.message}`);
        }

        // Notify admins of pending check-in
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'Admin');

        if (admins) {
          for (const admin of admins) {
            await createSystemNotification(
              admin.id,
              'Pending Check-in',
              `New gear check-in pending approval for ${gear.name}.`
            );
          }
        }
      }

      // Fetch user profile for notification
      let userProfile = null;
      if (userId) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', userId)
          .single();
        if (!profileError) userProfile = profileData;
      }

      // Send Google Chat notification
      await fetch('/api/notifications/google-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'USER_CHECKIN',
          payload: {
            userName: userProfile?.full_name || 'Unknown User',
            userEmail: userProfile?.email || 'Unknown Email',
            gearNames: checkedInGearNames,
            checkinDate: new Date().toLocaleString(),
            condition: isDamaged ? 'Damaged' : 'Good',
            notes: isDamaged ? damageDescription : checkinNotes,
          }
        })
      });

      // Show success message
      toast({
        title: "Check-in Submitted",
        description: "Your check-in has been submitted and is pending admin approval.",
        variant: "default",
      });

      // Show success animation
      setShowSuccessAnimation(true);
      setTimeout(() => {
        setShowSuccessAnimation(false);
      }, 3000);

      // Reset form
      setSelectedGears([]);
      setIsDamaged(false);
      setDamageDescription('');
      setCheckinNotes('');

      // Refresh the list of checked out gear
      await fetchCheckedOutGear();

    } catch (error) {
      console.error('Error during check-in:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit check-in. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOverdue = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const formatDueDate = (date: string | null) => {
    if (!date) return 'No due date';
    return format(new Date(date), 'PP');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  // Memoize Lottie component
  const SuccessAnimationComponent = useMemo(() => {
    return showSuccessAnimation ? (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center p-10 border rounded-lg bg-card"
        style={{ minHeight: '400px' }} // Adjust height as needed
      >
        {/* --- Lottie Component --- */}
        <Lottie
          animationData={checkinSuccessAnimation} // Use imported data
          loop={false}
          style={{ width: 180, height: 180 }}
          aria-label="Check-in successful animation"
        />
        <p className="mt-4 text-lg font-semibold text-primary">Check-in Successful!</p>
        <p className="text-muted-foreground text-sm">Your returned items have been recorded.</p>
      </motion.div>
    ) : null;
  }, [showSuccessAnimation]);

  const handleScan = useCallback((result: any) => {
    if (result?.text) {
      const scannedId = result.text;
      const found = checkedOutGears.find(gear => gear.id === scannedId);
      if (found) {
        setSelectedGears(prev => prev.includes(scannedId) ? prev : [...prev, scannedId]);
        setQrError(null);
        setIsScannerOpen(false);
        toast({ title: 'Gear Selected', description: `${found.name} selected for check-in.`, variant: 'success' });
      } else {
        setQrError('Scanned gear is not checked out by you.');
      }
    }
  }, [checkedOutGears, setSelectedGears, toast]);

  const handleCheckIn = async () => {
    if (!scannedCode) return;

    try {
      // Here you would handle the check-in logic with the scanned code
      console.log("Checking in with code:", scannedCode);
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Error during check-in:", error);
      setQrError("Failed to process check-in. Please try again.");
    }
  };

  // Update the gear card rendering
  const renderGearCard = (gear: ProcessedGear) => {
    const isOverdueDate = gear.due_date && new Date(gear.due_date) < new Date();
    const dueDate = gear.due_date ? format(new Date(gear.due_date), 'PP') : 'No due date';

    return (
      <motion.div
        key={gear.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "group relative flex flex-col rounded-lg border p-4 transition-all hover:bg-accent/5",
          selectedGears.includes(gear.id) && "border-primary bg-primary/5 shadow-sm"
        )}
      >
        <div className="flex items-start gap-4">
          <Checkbox
            id={`gear-${gear.id}`}
            checked={selectedGears.includes(gear.id)}
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectedGears(prev => [...prev, gear.id]);
              } else {
                setSelectedGears(prev => prev.filter(id => id !== gear.id));
              }
            }}
            className={cn(
              "mt-1",
              selectedGears.includes(gear.id) && "border-primary"
            )}
          />
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border">
            {gear.image_url ? (
              <Image
                src={gear.image_url}
                alt={gear.name}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <Label
              htmlFor={`gear-${gear.id}`}
              className="text-base font-medium cursor-pointer truncate block"
            >
              {gear.name}
            </Label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground truncate">
                {gear.category}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant={isOverdueDate ? "destructive" : "secondary"} className="text-xs">
                  Due: {dueDate}
                </Badge>
                {isOverdueDate && (
                  <Badge variant="destructive" className="text-xs">
                    Overdue
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Add function to fetch check-in history
  const fetchCheckInHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: historyData, error: historyError } = await supabase
        .from('checkins')
        .select(`
          id,
          checkin_date,
          status,
          condition,
          notes,
          gears:gear_id (
            name
          )
        `)
        .eq('user_id', user.id)
        .order('checkin_date', { ascending: false });

      if (historyError) {
        console.error("Error fetching check-in history:", historyError);
        toast({
          title: "Error",
          description: "Failed to load check-in history",
          variant: "destructive"
        });
        return;
      }

      const processedHistory: CheckInHistory[] = (historyData || []).map((item: any) => ({
        id: item.id,
        gearName: item.gears?.name || 'Unknown Gear',
        checkinDate: new Date(item.checkin_date),
        status: item.status || 'Unknown',
        condition: item.condition || 'Not specified',
        notes: item.notes || ''
      }));

      setCheckInHistory(processedHistory);
    } catch (error) {
      console.error("Error in fetchCheckInHistory:", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Add useEffect to fetch history
  useEffect(() => {
    fetchCheckInHistory();
  }, []);

  // Add history section render function
  const renderCheckInHistory = () => {
    if (isHistoryLoading) {
      return (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-10 w-10 animate-spin mr-2 text-primary" />
          <p className="text-muted-foreground">Loading check-in history...</p>
        </div>
      );
    }

    if (checkInHistory.length === 0) {
      return (
        <div className="text-center py-10">
          <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Check-in History</h3>
          <p className="text-muted-foreground mb-4">You haven't checked in any gear yet.</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[400px] w-full rounded-md border">
        <div className="p-4 space-y-4">
          {checkInHistory.map((item) => (
            <div
              key={item.id}
              className="flex flex-col space-y-2 p-4 rounded-lg border bg-card transition-colors hover:bg-accent/5"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{item.gearName}</h4>
                <Badge variant={item.condition.toLowerCase() === 'damaged' ? 'destructive' : 'secondary'}>
                  {item.condition}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(item.checkinDate, 'PPp')}</span>
              </div>
              {item.notes && (
                <p className="text-sm text-muted-foreground">
                  Notes: {item.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background"
    >
      {/* Header Section */}
      <div className="border-b">
        <div className="container max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Check-in Gear</h1>
              <p className="text-muted-foreground mt-1">Return equipment you've checked out</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                onClick={() => setIsScannerOpen(true)}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                <QrCode className="mr-2 h-4 w-4" />
                Scan QR Code
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="check-in" className="space-y-6">
          <TabsList>
            <TabsTrigger value="check-in">Check-in Gear</TabsTrigger>
            <TabsTrigger value="history">Check-in History</TabsTrigger>
          </TabsList>

          <TabsContent value="check-in">
            {/* Success Animation Screen */}
            {SuccessAnimationComponent}

            {/* Main Content: Form or No Gear Message */}
            {!showSuccessAnimation && (
              <>
                {checkedOutGears.length === 0 ? (
                  <Card className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <PackageCheck className="h-16 w-16 text-muted-foreground mb-4" />
                    <CardTitle className="text-xl mb-3">No Gear to Check-in</CardTitle>
                    <CardDescription className="max-w-md mb-8">
                      You currently have no gear checked out. Browse our available equipment and request some gear to get started.
                    </CardDescription>
                    <Button size="lg" asChild><a href="/user/browse">Browse Available Gear</a></Button>
                  </Card>
                ) : (
                  <form onSubmit={handleCheckinSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left Column - Gear Selection */}
                      <div className="lg:col-span-5 space-y-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle>Select Items</CardTitle>
                              <Badge variant="outline" className="ml-2">
                                {selectedGears.length} of {checkedOutGears.length}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <CardDescription>Choose items to return</CardDescription>
                              {checkedOutGears.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedGears(checkedOutGears.map(g => g.id))}
                                  className="text-xs"
                                >
                                  Select All
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-[calc(100vh-400px)] min-h-[300px] w-full rounded-md border">
                              <div ref={listContainerRef} className="p-4 space-y-3">
                                {checkedOutGears.map((gear) => renderGearCard(gear))}
                              </div>
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Right Column - Check-in Details */}
                      <div className="lg:col-span-7 space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>Check-in Details</CardTitle>
                            <CardDescription>Report condition and add any notes</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            {/* Damage Report Section */}
                            <div className="rounded-lg border p-4 bg-card">
                              <div className="flex items-start space-x-4">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                                  <Checkbox
                                    id="isDamaged"
                                    checked={isDamaged}
                                    onCheckedChange={(checked) => setIsDamaged(checked === true)}
                                  />
                                </div>
                                <div className="flex-1">
                                  <Label
                                    htmlFor="isDamaged"
                                    className="text-base font-medium cursor-pointer"
                                  >
                                    Report Damage
                                  </Label>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Check this if any selected items are damaged or need maintenance
                                  </p>
                                </div>
                              </div>

                              {isDamaged && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="mt-4"
                                >
                                  <div className="rounded-lg border p-4 bg-destructive/5">
                                    <Label htmlFor="damageDescription" className="text-base font-medium flex items-center gap-2">
                                      <AlertCircle className="h-4 w-4 text-destructive" />
                                      Damage Report <span className="text-destructive">*</span>
                                    </Label>
                                    <p className="text-sm text-muted-foreground mt-1 mb-3">
                                      Please provide specific details about any damage or maintenance needs
                                    </p>
                                    <Textarea
                                      id="damageDescription"
                                      value={damageDescription}
                                      onChange={(e) => setDamageDescription(e.target.value)}
                                      placeholder="Describe the damage or maintenance needs in detail..."
                                      className="min-h-[120px] bg-background"
                                      required={isDamaged}
                                    />
                                  </div>
                                </motion.div>
                              )}
                            </div>

                            {/* Notes Section */}
                            <div className="rounded-lg border p-4 bg-card">
                              <Label htmlFor="checkinNotes" className="text-base font-medium">
                                Check-in Notes <span className="text-muted-foreground text-sm">(Optional)</span>
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1 mb-3">
                                Add any additional notes about the return condition or usage
                              </p>
                              <Textarea
                                id="checkinNotes"
                                value={checkinNotes}
                                onChange={(e) => setCheckinNotes(e.target.value)}
                                placeholder="Add any additional notes about the return..."
                                className="min-h-[100px]"
                              />
                            </div>

                            {/* Overdue Warning */}
                            {checkedOutGears.some(gear => selectedGears.includes(gear.id) && isOverdue(gear.due_date)) && (
                              <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Overdue Items</AlertTitle>
                                <AlertDescription>
                                  One or more selected items are past their due date. Please check for any wear and tear.
                                </AlertDescription>
                              </Alert>
                            )}

                            {/* Submit Button */}
                            <div className="flex justify-end gap-4 mt-6">
                              <Button
                                type="submit"
                                disabled={selectedGears.length === 0 || isSubmitting || (isDamaged && !damageDescription.trim())}
                                className="w-full sm:w-auto"
                              >
                                {isSubmitting ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Checking in...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Check In Selected Gear
                                  </>
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </form>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Check-in History</CardTitle>
                <CardDescription>View your past gear check-ins</CardDescription>
              </CardHeader>
              <CardContent>
                {renderCheckInHistory()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* QR Scanner Dialog */}
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div id="qr-reader" className="w-full max-w-md mx-auto"></div>
            {scannedCode && (
              <div className="w-full space-y-4">
                <Badge variant="secondary" className="w-full py-2 text-center">
                  Code: {scannedCode}
                </Badge>
                <Button
                  className="w-full"
                  onClick={handleCheckIn}
                >
                  Complete Check-In
                </Button>
              </div>
            )}
            {qrError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{qrError}</AlertDescription>
              </Alert>
            )}
            <DialogClose asChild>
              <Button variant="secondary" className="w-full">Close Scanner</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check-In Successful</DialogTitle>
          </DialogHeader>
          <p>Equipment has been successfully checked in.</p>
          <DialogClose asChild>
            <Button className="w-full mt-4" onClick={() => {
              setScannedCode(null);
              setIsDialogOpen(false);
            }}>
              Close
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

