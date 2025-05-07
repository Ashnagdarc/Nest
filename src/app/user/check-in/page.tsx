"use client";

import { useState, useMemo, useCallback, useEffect } from 'react'; // Import useMemo and useCallback
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UploadCloud, PackageCheck, AlertCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge'; // Import Badge component
import dynamic from 'next/dynamic';
import { QrReader } from '@blackbox-vision/react-qr-reader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';

// --- Dynamically import Lottie ---
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

// --- Import actual Lottie animation JSON ---
import checkinSuccessAnimation from "@/../public/animations/checkin-success.json";

const supabase = createClient();

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) setUserId(user.id);
    });
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    const fetchCheckedOutGears = async () => {
      const { data, error } = await supabase
        .from('gears')
        .select('*')
        .eq('checked_out_by', userId)
        .eq('status', 'Checked Out');
      if (!error) setCheckedOutGears(data || []);
    };
    fetchCheckedOutGears();
    // Optionally, subscribe to real-time updates
    const channel = supabase
      .channel('public:gears')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gears' }, fetchCheckedOutGears)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, userId]);

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

    // TODO: Implement actual API call to process the check-in
    // Update gear status, log damage if reported, add notes

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: "Check-in Processed",
      description: `Successfully checked in ${selectedGears.length} item(s). ${isDamaged ? 'Damage report submitted.' : ''}`,
      variant: "success", // Use success variant
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
    setIsLoading(false);

    // Hide animation after a delay
    await new Promise(resolve => setTimeout(resolve, 2000)); // Adjust delay as needed
    setShowSuccessAnimation(false);
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <h1 className="text-3xl font-bold text-foreground">Check-in Gear</h1>

      {/* Success Animation Screen */}
      {SuccessAnimationComponent}


      {/* Main Content: Form or No Gear Message */}
      {!showSuccessAnimation && (
        <>
          {checkedOutGears.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <Card className="text-center py-10">
                <CardContent>
                  <PackageCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">You currently have no gear checked out.</p>
                  <Button variant="link" className="mt-2" asChild>
                    <a href="/user/browse">Browse Gear</a>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
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
                    {selectedGears.length === 0 && !isLoading && ( // Don't show error while loading
                      <p className="text-xs text-destructive mt-2">Please select at least one item.</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Check-in Details Column */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="md:col-span-2 space-y-4"
              >
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
              </motion.div>
            </form>
          )}
        </>
      )}

      <Button variant="outline" className="mb-4" onClick={() => setIsScannerOpen(true)}>
        Scan QR Code
      </Button>
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Gear QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <QrReader
              constraints={{ facingMode: 'environment' }}
              onResult={handleScan}
              containerStyle={{ width: '100%' }}
            />
            {qrError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{qrError}</AlertDescription></Alert>}
            <DialogClose asChild>
              <Button variant="secondary">Close</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

