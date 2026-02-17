// Equipment check-in page for Nest by Eden Oasis. Handles asset return, QR scanning, and condition reporting.

"use client";

import { useState, useEffect, useMemo } from 'react';
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
import { PackageCheck } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History } from 'lucide-react';
import { Calendar } from 'lucide-react';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { useCheckedOutGears } from '@/hooks/check-in/useCheckedOutGears';

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
  const { showSuccessFeedback } = useSuccessFeedback();

  // Equipment and user state
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

  // Use the new custom hook for checked out gears
  const { checkedOutGears, pendingCheckInCount, fetchCheckedOutGear, listContainerRef, scrollPositionRef, isLoading } = useCheckedOutGears(userId, toast);

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
   * Equipment Data Effect
   * 
   * The useCheckedOutGears hook now handles data fetching and real-time updates.
   * This effect is kept for any additional user-specific logic if needed.
   */
  useEffect(() => {
    if (!userId) return;

    // Any additional user-specific logic can go here
    console.log('User ID set, gear data will be fetched by hook:', userId);
  }, [userId]);

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
            action: 'Check In',
            status: 'Pending Admin Approval',
            condition: isDamaged ? 'Damaged' : 'Good',
            damage_notes: isDamaged ? damageDescription : null,
            notes: checkinNotes
          });

        if (checkinError) {
          console.error("Error creating check-in record:", checkinError);
          throw new Error(`Failed to create check-in record: ${checkinError.message}`);
        }

        // Note: Activity logging removed - the checkins table serves as the audit trail

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

        // Send email notifications for check-in submission
        try {
          await fetch('/api/checkins/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              gearId,
              gearName: gear.name,
              condition: isDamaged ? 'Damaged' : 'Good',
              notes: checkinNotes || undefined,
              damageNotes: isDamaged ? damageDescription : undefined
            })
          });
        } catch (emailError) {
          console.error('Failed to send check-in email notifications:', emailError);
          // Don't fail the check-in if email fails
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

      showSuccessFeedback({
        toast: {
          title: "Check-in Submitted",
          description: "Your check-in has been submitted and is pending admin approval.",
          variant: "default",
        },
        redirectPath: '/user/history',
        delay: 1500,
        onSuccess: () => {
          setSelectedGears([]);
          setIsDamaged(false);
          setDamageDescription('');
          setCheckinNotes('');
        },
        showAnimation: () => {
          setShowSuccessAnimation(true);
          setTimeout(() => setShowSuccessAnimation(false), 1500);
        },
      });

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
    const dueDate = gear.due_date ? format(new Date(gear.due_date), 'MMM d, yyyy') : 'No due date';
    const isSelected = selectedGears.includes(gear.id);

    return (
      <motion.div
        key={gear.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "group relative rounded-xl border-2 p-6 transition-all duration-200",
          isSelected
            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
            : "border-border hover:border-primary/50 hover:shadow-md bg-card"
        )}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <Checkbox
              id={`gear-${gear.id}`}
              checked={isSelected}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedGears(prev => [...prev, gear.id]);
                } else {
                  setSelectedGears(prev => prev.filter(id => id !== gear.id));
                }
              }}
              className="h-5 w-5"
            />
          </div>

          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 bg-muted/50">
            {gear.image_url ? (
              <Image
                src={gear.image_url}
                alt={gear.name}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div
              className="flex-1 cursor-pointer"
              onClick={() => {
                if (isSelected) {
                  setSelectedGears(prev => prev.filter(id => id !== gear.id));
                } else {
                  setSelectedGears(prev => [...prev, gear.id]);
                }
              }}
            >
              <Label
                htmlFor={`gear-${gear.id}`}
                className="text-lg font-semibold cursor-pointer block leading-tight"
              >
                {gear.name}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {gear.category}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant={isOverdueDate ? "destructive" : "secondary"}
                className={cn(
                  "text-xs font-medium px-3 py-1",
                  isOverdueDate && "bg-destructive/10 text-destructive border-destructive/20"
                )}
              >
                Due: {dueDate}
              </Badge>
              {isOverdueDate && (
                <Badge variant="destructive" className="text-xs font-medium px-3 py-1">
                  Overdue
                </Badge>
              )}
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

      // Use a direct query approach that's more reliable
      let historyData, historyError;
      try {
        const result = await supabase
          .from('checkins')
          .select(`
            id,
            checkin_date,
            status,
            condition,
            notes,
            gear_id,
            gears!inner (
              name
            )
          `)
          .eq('user_id', user.id)
          .order('checkin_date', { ascending: false });

        historyData = result.data;
        historyError = result.error;
      } catch (queryError) {
        console.error("Exception during check-in history query:", queryError);
        historyError = { message: "Query exception", details: queryError };
      }

      if (historyError) {
        console.error("Error fetching check-in history:", historyError);
        console.error("Error details:", {
          message: historyError.message,
          details: historyError.details,
          hint: historyError.hint
        });

        // Fallback: try to fetch check-ins without gear names first, then fetch gear names separately
        const { data: basicHistoryData, error: basicError } = await supabase
          .from('checkins')
          .select('id, checkin_date, status, condition, notes, gear_id')
          .eq('user_id', user.id)
          .order('checkin_date', { ascending: false });

        if (basicError) {
          console.error("Fallback query also failed:", basicError);
          toast({
            title: "Error",
            description: "Failed to load check-in history. Please try refreshing the page.",
            variant: "destructive"
          });
          return;
        }

        // Fetch gear names for all gear IDs
        const gearIds = basicHistoryData?.map(item => item.gear_id).filter(Boolean) || [];
        const { data: gearsData } = await supabase
          .from('gears')
          .select('id, name')
          .in('id', gearIds);

        const gearNameMap = new Map(gearsData?.map(g => [g.id, g.name]) || []);

        const processedHistory: CheckInHistory[] = (basicHistoryData || []).map((item) => ({
          id: item.id,
          gearName: gearNameMap.get(item.gear_id) || 'Unknown Gear',
          checkinDate: new Date(item.checkin_date),
          status: item.status || 'Unknown',
          condition: item.condition || 'Not specified',
          notes: item.notes || ''
        }));

        setCheckInHistory(processedHistory);
        return;
      }

      // Process the data from the direct query
      type CheckInHistoryRow = {
        id: string;
        checkin_date: string;
        status: string;
        condition: string;
        notes: string;
        gear_id: string;
        gears: { name: string };
      };

      const processedHistory: CheckInHistory[] = (historyData || []).map((item) => {
        const row = item as CheckInHistoryRow;
        return {
          id: row.id,
          gearName: row.gears?.name || 'Unknown Gear',
          checkinDate: new Date(row.checkin_date),
          status: row.status || 'Unknown',
          condition: row.condition || 'Not specified',
          notes: row.notes || ''
        };
      });

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

  // Debug function to test the query


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
          <p className="text-muted-foreground mt-1">You haven&apos;t checked in any gear yet.</p>
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
      {/* Header Section - Apple HIG inspired */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
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

      {/* Main Content - Apple HIG inspired layout */}
      <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Pending Check-ins Banner */}
        {pendingCheckInCount > 0 && (
          <Alert className="mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900 dark:text-amber-600">Pending Admin Approval</AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-700">
              You have {pendingCheckInCount} item{pendingCheckInCount > 1 ? 's' : ''} awaiting admin approval. These items won't appear below until approved or rejected.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="check-in" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="check-in" className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4" />
              Check-in Gear
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="check-in" className="space-y-8">
            {/* Success Animation Screen */}
            {SuccessAnimationComponent}

            {/* Main Content: Form or No Gear Message */}
            {!showSuccessAnimation && (
              <>
                {checkedOutGears.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                    <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                      <PackageCheck className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-3">No Gear to Check-in</h2>
                    <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
                      You currently have no gear checked out. Browse our available equipment and request some gear to get started.
                    </p>
                    <Button size="lg" asChild className="px-8">
                      <a href="/user/browse">Browse Available Gear</a>
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleCheckinSubmit} className="space-y-8">
                    {/* Gear Selection Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-semibold">Select Items to Return</h2>
                          <p className="text-muted-foreground mt-1">Choose the equipment you're returning</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="px-3 py-1">
                            {selectedGears.length} of {checkedOutGears.length} selected
                          </Badge>
                          {checkedOutGears.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedGears(checkedOutGears.map(g => g.id))}
                              className="text-sm"
                            >
                              Select All
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4">
                        {isLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <div className="flex items-center space-x-3">
                              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                              <span className="text-muted-foreground">Loading your gear...</span>
                            </div>
                          </div>
                        ) : (
                          checkedOutGears.map((gear) => renderGearCard(gear))
                        )}
                      </div>
                    </div>

                    {/* Check-in Details Section */}
                    {selectedGears.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                      >
                        <div>
                          <h2 className="text-xl font-semibold mb-2">Return Details</h2>
                          <p className="text-muted-foreground">Report the condition and add any notes</p>
                        </div>

                        <div className="space-y-6">
                          {/* Damage Report Section */}
                          <Card className="border-2">
                            <CardContent className="p-6">
                              <div className="flex items-start space-x-4">
                                <Checkbox
                                  id="isDamaged"
                                  checked={isDamaged}
                                  onCheckedChange={(checked) => setIsDamaged(checked === true)}
                                  className="mt-1"
                                />
                                <div className="flex-1 space-y-2">
                                  <Label htmlFor="isDamaged" className="text-base font-medium cursor-pointer">
                                    Report Damage or Issues
                                  </Label>
                                  <p className="text-sm text-muted-foreground">
                                    Check this if any selected items are damaged, malfunctioning, or need maintenance
                                  </p>
                                </div>
                              </div>

                              {isDamaged && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="mt-6"
                                >
                                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                                    <Label htmlFor="damageDescription" className="text-base font-medium flex items-center gap-2 mb-2">
                                      <AlertCircle className="h-4 w-4 text-destructive" />
                                      Damage Report <span className="text-destructive">*</span>
                                    </Label>
                                    <p className="text-sm text-muted-foreground mb-4">
                                      Please provide specific details about any damage or maintenance needs
                                    </p>
                                    <Textarea
                                      id="damageDescription"
                                      value={damageDescription}
                                      onChange={(e) => setDamageDescription(e.target.value)}
                                      placeholder="Describe the damage or maintenance needs in detail..."
                                      className="min-h-[120px] bg-background border-destructive/20 focus:border-destructive"
                                      required={isDamaged}
                                    />
                                  </div>
                                </motion.div>
                              )}
                            </CardContent>
                          </Card>

                          {/* Notes Section */}
                          <Card>
                            <CardContent className="p-6">
                              <div className="space-y-3">
                                <Label htmlFor="checkinNotes" className="text-base font-medium">
                                  Additional Notes
                                  <span className="text-muted-foreground text-sm font-normal ml-1">(Optional)</span>
                                </Label>
                                <p className="text-sm text-muted-foreground">
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
                            </CardContent>
                          </Card>

                          {/* Overdue Warning */}
                          {checkedOutGears.some(gear => selectedGears.includes(gear.id) && isOverdue(gear.due_date)) && (
                            <Alert variant="destructive" className="border-destructive/50">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Overdue Items</AlertTitle>
                              <AlertDescription>
                                One or more selected items are past their due date. Please check for any wear and tear.
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Submit Button */}
                          <div className="flex justify-end pt-4">
                            <Button
                              type="submit"
                              disabled={selectedGears.length === 0 || isSubmitting || (isDamaged && !damageDescription.trim())}
                              size="lg"
                              className="px-8"
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
                        </div>
                      </motion.div>
                    )}
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

