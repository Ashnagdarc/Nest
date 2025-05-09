"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { createSystemNotification } from '@/lib/notifications';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from '@/components/ui/label';
import { UploadCloud, PackageCheck, Package } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import dynamic from 'next/dynamic';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';
import { User } from '@supabase/supabase-js';

// --- Dynamically import Lottie ---
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

// --- Import actual Lottie animation JSON ---
import checkinSuccessAnimation from "@/../public/animations/checkin-success.json";

const supabase = createClient();

// Add these types at the top of the file
type GearCheckoutRecord = {
  checkout_date: string;
  due_date: string;
  status: string;
};

type GearWithCheckout = {
  id: string;
  name: string;
  status: string;
  category: string;
  imageUrl: string;
  gear_checkouts: GearCheckoutRecord[];
};

// Add these types at the top of the file after existing types
type GearRequest = {
  id: string;
  gear_ids: string[];
  status: string;
  checkout_date: string;
  due_date: string;
};

type Gear = {
  id: string;
  status: string;
  checked_out_to: string;
  due_date?: string;
};

// Add this type at the top of the file with other types
type ProcessedGear = {
  id: string;
  name: string;
  status: string;
  category: string;
  imageUrl: string | null;
  dueDate: Date | null;
  checkoutDate: Date | null;
};

// Add this type at the top of the file with other types
type GearData = {
  id: string;
  name: string;
  status: string;
  category: string;
  image_url: string | null;
  checked_out_to: string;
  due_date: string | null;
  current_request_id: string | null;
};

type PostgresChangePayload = {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, any>;
  old: Record<string, any>;
  errors: null | any[];
};

// Add this helper function near the top of the file
const isValidImageUrl = (url: string | null | undefined): url is string => {
  return typeof url === 'string' && url.trim().length > 0;
};

export default function CheckInGearPage() {
  const { toast } = useToast();
  const [checkedOutGears, setCheckedOutGears] = useState<ProcessedGear[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedGears, setSelectedGears] = useState<string[]>([]);
  const [isDamaged, setIsDamaged] = useState(false);
  const [damageDescription, setDamageDescription] = useState('');
  const [checkinNotes, setCheckinNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false); // State for animation
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scannerInitialized, setScannerInitialized] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) setUserId(user.id);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchCheckedOutGears = async () => {
      console.log('Fetching checked out gears for user:', userId);

      try {
        const { data: checkedOutGears, error: gearError } = await supabase
          .from('gears')
          .select(`
            id,
            name,
            status,
            category,
            image_url,
            checked_out_to,
            due_date,
            current_request_id
          `)
          .eq('checked_out_to', userId)
          .eq('status', 'Checked Out');

        if (gearError) {
          console.error('Error fetching checked out gears:', {
            message: gearError.message,
            details: gearError.details,
            hint: gearError.hint,
            code: gearError.code
          });

          toast({
            title: "Error",
            description: `Failed to fetch checked out gear: ${gearError.message}`,
            variant: "destructive"
          });
          return;
        }

        if (!checkedOutGears) {
          console.log('No checked out gears found');
          setCheckedOutGears([]);
          return;
        }

        // Add debug logging for image URLs
        console.log('Raw gear data image URLs:', checkedOutGears.map((g: GearData) => ({
          id: g.id,
          name: g.name,
          image_url: g.image_url
        })));

        const processedGears = checkedOutGears.map((gear: GearData): ProcessedGear => {
          // Debug log for each gear's image processing
          console.log(`Processing gear ${gear.id} (${gear.name}) image:`, {
            raw_url: gear.image_url,
            is_string: typeof gear.image_url === 'string',
            length: gear.image_url?.length,
            trimmed_length: gear.image_url?.trim().length
          });

          return {
            id: gear.id,
            name: gear.name,
            status: gear.status,
            category: gear.category,
            imageUrl: isValidImageUrl(gear.image_url) ? gear.image_url : null,
            dueDate: gear.due_date ? new Date(gear.due_date) : null,
            checkoutDate: null
          };
        });

        // Debug log processed gears
        console.log('Processed gear image URLs:', processedGears.map((g: ProcessedGear) => ({
          id: g.id,
          name: g.name,
          imageUrl: g.imageUrl
        })));

        setCheckedOutGears(processedGears);

      } catch (error) {
        console.error('Exception in fetchCheckedOutGears:', {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });

        toast({
          title: "Error",
          description: error instanceof Error
            ? `Error: ${error.message}`
            : "An unexpected error occurred. Please try refreshing the page.",
          variant: "destructive"
        });
      }
    };

    fetchCheckedOutGears();

    // Set up real-time subscription
    const gearChannel = supabase
      .channel('gear_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'gears', filter: `checked_out_to=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => {
          console.log('Received gear change:', payload);
          fetchCheckedOutGears();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gearChannel);
    };
  }, [userId, toast]);

  useEffect(() => {
    if (!scannerInitialized && !scannedCode && isScannerOpen) {
      // Small delay to ensure DOM is ready
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

  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuccessAnimation(false); // Reset animation
    if (selectedGears.length === 0) {
      toast({ title: "Error", description: "Please select at least one gear item to check in.", variant: "destructive" });
      return;
    }
    if (isDamaged && !damageDescription.trim()) {
      toast({ title: "Error", description: "Please describe the damage if 'Damaged' is checked.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    console.log("Checking in gears:", {
      gearIds: selectedGears,
      isDamaged,
      damageDescription,
      checkinNotes,
    });

    try {
      const checkinDate = new Date();
      const condition = isDamaged ? 'Damaged' : 'Good';

      // Step 1: Get the details of selected gears
      const { data: selectedGearDetails, error: gearError } = await supabase
        .from('gears')
        .select('id, name, current_request_id')
        .in('id', selectedGears);

      if (gearError) throw gearError;

      // Step 2: Create checkin records for each gear
      const checkinRecords = selectedGears.map(gearId => ({
        user_id: userId,
        gear_id: gearId,
        checkin_date: checkinDate.toISOString(),
        status: 'Pending Admin Approval', // Changed from 'Completed'
        notes: checkinNotes,
        condition: condition
      }));

      const { error: checkinError } = await supabase
        .from('checkins')
        .insert(checkinRecords);

      if (checkinError) throw checkinError;

      // Step 3: Update gear status to 'Pending Check-in'
      const { error: gearUpdateError } = await supabase
        .from('gears')
        .update({
          status: 'Pending Check-in', // Changed from directly setting to Available
          last_checkin_date: checkinDate.toISOString(),
          condition: condition,
          damage_notes: isDamaged ? damageDescription : null
        })
        .in('id', selectedGears);

      if (gearUpdateError) throw gearUpdateError;

      // Step 4: Update gear_requests statuses
      const requestIds = selectedGearDetails
        .map((gear: any) => gear.current_request_id)
        .filter(Boolean);

      if (requestIds.length > 0) {
        const uniqueRequestIds = [...new Set(requestIds)];

        for (const requestId of uniqueRequestIds) {
          // Get all gears in this request
          const { data: requestData } = await supabase
            .from('gear_requests')
            .select('gear_ids')
            .eq('id', requestId)
            .single();

          if (requestData && requestData.gear_ids) {
            // Check if all gears in the request are being returned
            const allGearsReturned = requestData.gear_ids.every((gearId: string) =>
              selectedGears.includes(gearId));

            // Update request status accordingly
            await supabase
              .from('gear_requests')
              .update({
                status: allGearsReturned ? 'Pending Return Approval' : 'Partially Returned',
                checkin_date: checkinDate.toISOString(),
                checkin_notes: checkinNotes
              })
              .eq('id', requestId);

            // Create history entry
            await supabase.from('request_status_history').insert({
              request_id: requestId,
              status: allGearsReturned ? 'Pending Return Approval' : 'Partially Returned',
              changed_by: userId,
              note: checkinNotes
            });
          }
        }
      }

      // Step 5: Create check-in notifications
      // User notification
      const gearNames = selectedGearDetails.map((gear: any) => gear.name).join(', ');

      await createSystemNotification(
        userId as string,
        'Gear Check-in Submitted',
        `Your check-in for ${gearNames} has been submitted and is pending admin approval.`
      );

      // Admin notifications
      const { data: adminUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'Admin');

      if (adminUsers && adminUsers.length > 0) {
        // Create check-in notification for each admin
        for (const admin of adminUsers) {
          await createSystemNotification(
            admin.id,
            'Gear Check-in Pending',
            `${gearNames} has been submitted for check-in${isDamaged ? ' with reported damage' : ''}. Please review and approve.`
          );

          // If gear is damaged, create a damage report notification for each admin
          if (isDamaged) {
            await createSystemNotification(
              admin.id,
              'Damage Report',
              `Damage reported on ${gearNames}: ${damageDescription}`
            );
          }
        }
      }

      // Step 6: Success message and animation
      toast({
        title: "Check-in Submitted",
        description: `Successfully submitted check-in for ${selectedGears.length} item(s). Pending admin approval.`,
        variant: "success",
      });

      // Update local state to remove checked-in items
      setCheckedOutGears(checkedOutGears.filter(gear => !selectedGears.includes(gear.id)));

      // Show success animation
      setShowSuccessAnimation(true);

      // Reset form state AFTER showing animation
      setSelectedGears([]);
      setIsDamaged(false);
      setDamageDescription('');
      setCheckinNotes('');

      // Hide animation after a delay
      setTimeout(() => {
        setShowSuccessAnimation(false);
      }, 2000);

    } catch (error) {
      console.error('Error checking in gear:', error);
      toast({
        title: "Error",
        description: "Failed to process check-in. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isOverdue = (dueDate: Date | null) => {
    if (!dueDate) return false;
    const now = new Date();
    // Set the time to end of day for the due date to give full day
    const dueDateEndOfDay = new Date(dueDate);
    dueDateEndOfDay.setHours(23, 59, 59, 999);
    return now > dueDateEndOfDay;
  };

  const formatDueDate = (date: Date | null) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container max-w-4xl mx-auto py-6 px-4 md:px-6 space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Check-in Gear</h1>
          <p className="text-muted-foreground">Return equipment you've checked out.</p>
        </div>
        <Button onClick={() => setIsScannerOpen(true)} variant="outline">
          Scan QR Code
        </Button>
      </div>

      {/* Success Animation Screen */}
      {SuccessAnimationComponent}

      {/* Main Content: Form or No Gear Message */}
      {!showSuccessAnimation && (
        <>
          {checkedOutGears.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <PackageCheck className="h-16 w-16 text-muted-foreground mb-4" />
              <CardTitle className="mb-3">You currently have no gear checked out</CardTitle>
              <CardDescription className="max-w-md">
                When you have checked out gear, it will appear here ready for check-in.
                Browse the equipment and request some gear to get started.
              </CardDescription>
              <Button className="mt-6" asChild>
                <a href="/user/browse">Browse Available Gear</a>
              </Button>
            </Card>
          ) : (
            <form onSubmit={handleCheckinSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Gear Selection Column */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="md:col-span-1"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Select Gear to Check-in</CardTitle>
                    <CardDescription>Choose items you are returning.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                      <div className="space-y-4">
                        {checkedOutGears.map((gear) => (
                          <div
                            key={gear.id}
                            className={cn(
                              "flex flex-col space-y-2 rounded-lg border p-3 transition-colors",
                              selectedGears.includes(gear.id) && "border-primary bg-primary/5"
                            )}
                          >
                            <div className="flex items-start space-x-3">
                              <Checkbox
                                id={`gear-${gear.id}`}
                                checked={selectedGears.includes(gear.id)}
                                onCheckedChange={(checked) => handleCheckboxChange(gear.id, checked)}
                                className="mt-1"
                              />
                              <div className="flex-grow space-y-1">
                                <div className="flex items-center gap-2">
                                  {isValidImageUrl(gear.imageUrl) ? (
                                    <Image
                                      src={gear.imageUrl}
                                      alt={gear.name}
                                      width={32}
                                      height={32}
                                      className="rounded-md object-cover"
                                      data-ai-hint={`${gear.category} item`}
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                                      <Package className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-grow">
                                    <Label
                                      htmlFor={`gear-${gear.id}`}
                                      className="text-base font-medium cursor-pointer"
                                    >
                                      {gear.name}
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                      {gear.category}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">Due: {formatDueDate(gear.dueDate)}</span>
                                  {isOverdue(gear.dueDate) && (
                                    <Badge variant="destructive" className="text-xs">
                                      Overdue
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {checkedOutGears.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <PackageCheck className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No gear currently checked out</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Check-in Details Column */}
              <Card>
                <CardHeader>
                  <CardTitle>Check-in Details</CardTitle>
                  <CardDescription>Report condition and add any notes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="isDamaged"
                      checked={isDamaged}
                      onCheckedChange={(checked) => setIsDamaged(checked === true)}
                      className="mt-1"
                    />
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="isDamaged"
                        className="text-base font-medium"
                      >
                        Report Damage?
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Check this if any selected items are damaged
                      </p>
                    </div>
                  </div>

                  {isDamaged && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      <Label htmlFor="damageDescription" className="text-base font-medium">
                        Describe the Damage <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="damageDescription"
                        value={damageDescription}
                        onChange={(e) => setDamageDescription(e.target.value)}
                        placeholder="Please provide specific details about any damage..."
                        className="min-h-[100px]"
                        required={isDamaged}
                      />
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="checkinNotes" className="text-base font-medium">
                      Check-in Notes <span className="text-muted-foreground text-sm">(Optional)</span>
                    </Label>
                    <Textarea
                      id="checkinNotes"
                      value={checkinNotes}
                      onChange={(e) => setCheckinNotes(e.target.value)}
                      placeholder="Add any additional notes about the return..."
                      className="min-h-[100px]"
                    />
                  </div>

                  {checkedOutGears.some(gear => selectedGears.includes(gear.id) && isOverdue(gear.dueDate)) && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Overdue Item(s)</AlertTitle>
                      <AlertDescription>
                        One or more selected items are past their due date. Please return them promptly.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end mt-6">
                <Button
                  type="submit"
                  disabled={isLoading || selectedGears.length === 0}
                  className="min-w-[200px]"
                >
                  <UploadCloud className="mr-2 h-4 w-4" />
                  {isLoading ? 'Processing Check-in...' : `Check-in Selected (${selectedGears.length})`}
                </Button>
              </div>
            </form>
          )}
        </>
      )}

      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Gear QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div id="qr-reader" className="w-full max-w-md mx-auto"></div>
            {scannedCode && (
              <div className="mt-4">
                <Badge variant="secondary" className="text-lg">
                  Code: {scannedCode}
                </Badge>
                <Button
                  className="mt-4 w-full"
                  onClick={handleCheckIn}
                >
                  Complete Check-In
                </Button>
              </div>
            )}
            {qrError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{qrError}</AlertDescription></Alert>}
            <DialogClose asChild>
              <Button variant="secondary">Close</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check-In Successful</DialogTitle>
          </DialogHeader>
          <p>Equipment has been successfully checked in.</p>
          <DialogClose asChild>
            <Button className="mt-4" onClick={() => setScannedCode(null)}>
              Close
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

