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
import { UploadCloud, PackageCheck } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import dynamic from 'next/dynamic';

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
  imageUrl: string;
  checked_out_to: string;
  due_date: string | null;
  gear_checkouts: {
    checkout_date: string;
    due_date: string;
    status: string;
  }[];
};

// Add this type at the top of the file with other types
type GearData = {
  id: string;
  name: string;
  status: string;
  category: string;
  imageUrl: string;
  checked_out_to: string;
  due_date: string | null;
  current_request_id: string | null;
};

export default function CheckInGearPage() {
  const { toast } = useToast();
  const [checkedOutGears, setCheckedOutGears] = useState<any[]>([]);
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
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
      if (user?.id) setUserId(user.id);
    });
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    const fetchCheckedOutGears = async () => {
      console.log('Fetching checked out gears for user:', userId);

      try {
        // Get all gears that are checked out to the user with a simpler query
        const { data: checkedOutGears, error: gearError } = await supabase
          .from('gears')
          .select(`
            id,
            name,
            status,
            category,
            imageUrl,
            checked_out_to,
            due_date,
            current_request_id
          `)
          .eq('checked_out_to', userId)
          .eq('status', 'Checked Out');

        if (gearError) {
          console.error('Error fetching checked out gears:', gearError);
          return;
        }

        console.log('Found checked out gears:', checkedOutGears?.length);
        console.log('Checked out gears details:', checkedOutGears);

        // Map the data to include due dates
        const processedGears = (checkedOutGears || []).map((gear: GearData) => ({
          ...gear,
          dueDate: gear.due_date ? new Date(gear.due_date) : null,
          checkoutDate: null // We'll get this from gear_checkouts if needed
        }));

        setCheckedOutGears(processedGears);
      } catch (error) {
        console.error('Exception in fetchCheckedOutGears:', error);
      }
    };

    fetchCheckedOutGears();

    // Set up real-time subscription for gears table
    const gearChannel = supabase
      .channel('gear_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'gears', filter: `checked_out_to=eq.${userId}` },
        fetchCheckedOutGears
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gearChannel);
    };
  }, [userId]);

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

  const isOverdue = (dueDate: Date) => new Date() > dueDate;

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
                    <ScrollArea className="h-72 w-full rounded-md border p-4">
                      {checkedOutGears.map((gear) => (
                        <div key={gear.id} className="flex flex-row items-start space-x-3 space-y-0 mb-4">
                          <Checkbox
                            id={`gear-${gear.id}`}
                            checked={selectedGears.includes(gear.id)}
                            onCheckedChange={(checked) => handleCheckboxChange(gear.id, checked)}
                          />
                          <Label htmlFor={`gear-${gear.id}`} className="font-normal flex items-center gap-2 cursor-pointer w-full">
                            <Image src={gear.imageUrl} alt={gear.name} width={24} height={24} className="rounded-sm" data-ai-hint={`${gear.category} item`} />
                            <div className="flex-grow">
                              {gear.name} <span className="text-xs text-muted-foreground">({gear.category})</span>
                              {isOverdue(gear.dueDate) && (
                                <Badge variant="destructive" className="ml-2 text-xs">Overdue</Badge>
                              )}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </ScrollArea>
                    {selectedGears.length === 0 && !isLoading && (
                      <p className="text-xs text-destructive mt-2">Please select at least one item.</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Check-in Details Column */}
              <Card>
                <CardHeader>
                  <CardTitle>Check-in Details</CardTitle>
                  <CardDescription>Report condition and add any notes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="isDamaged" checked={isDamaged} onCheckedChange={(checked) => setIsDamaged(checked === true)} />
                    <Label htmlFor="isDamaged" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Report Damage?
                    </Label>
                  </div>
                  {isDamaged && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                      className="pl-6 space-y-2 overflow-hidden"
                    >
                      <Label htmlFor="damageDescription">Describe the Damage <span className="text-destructive">*</span></Label>
                      <Textarea
                        id="damageDescription"
                        value={damageDescription}
                        onChange={(e) => setDamageDescription(e.target.value)}
                        placeholder="e.g., Scratched lens, tripod leg loose..."
                        required={isDamaged}
                      />
                      <p className="text-xs text-muted-foreground">Please provide details about any damage.</p>
                    </motion.div>
                  )}

                  <div>
                    <Label htmlFor="checkinNotes">Check-in Notes <span className="text-muted-foreground">(Optional)</span></Label>
                    <Textarea
                      id="checkinNotes"
                      value={checkinNotes}
                      onChange={(e) => setCheckinNotes(e.target.value)}
                      placeholder="e.g., Cleaned before return, used for project X..."
                    />
                  </div>

                  {/* Overdue Alert */}
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

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                whileTap={{ scale: 0.98 }} // Added tap animation
                className="flex justify-end" // Align button to the right
              >
                <Button type="submit" disabled={isLoading || selectedGears.length === 0}>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  {isLoading ? 'Processing Check-in...' : `Check-in Selected (${selectedGears.length})`}
                </Button>
              </motion.div>
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

