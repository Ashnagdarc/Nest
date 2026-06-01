// Equipment request page for Nest by Eden Oasis. Handles multi-select requests, validation, and real-time updates.

"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Search } from 'lucide-react';
import { createSystemNotification } from '@/lib/notifications';
import { createClient } from '@/lib/supabase/client';
import { RadioGroup } from "@/components/ui/radio-group";
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';
import { apiGet } from '@/lib/apiClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: 'Admin' | 'User';
  department: string | null;
  avatar_url: string | null;
  status: 'Active' | 'Inactive' | 'Suspended';
  phone: string | null;
  location: string | null;
  employee_id: string | null;
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
  is_banned: boolean;
};

type SelectableUser = Pick<Profile, 'id' | 'full_name' | 'email' | 'role'>;

type Gear = {
  id: string;
  name?: string;
  category?: string;
  description?: string | null;
  serial_number?: string | null;
  purchase_date?: string | null;
  image_url?: string | null;
  quantity: number;
  available_quantity: number;
  status: string;
  checked_out_to?: string | null;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
};

const reasonOptions = [
  "Youtube Shoot",
  "Event Shoot",
  "Site Update Shoot",
  "Off Plan Shoot",
  "Finished House Shoot",
  "Allocation Shoot",
  "Personal",
  "Home",
  "Site",
  "Out of State",
  "Out of country",
  "Other"
];

const durationOptions = [
  "24hours",
  "48hours",
  "72hours",
  "1 week",
  "2 weeks",
  "Month",
  "1year"
];

const calculateDueDate = (duration: string): string => {
  const now = new Date();
  switch (duration) {
    case "24hours": return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    case "48hours": return new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
    case "72hours": return new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();
    case "1 week": return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case "2 weeks": return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    case "Month": return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    case "1year": return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
    default: return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }
};

const requestSchema = z.object({
  selectedGears: z.array(z.string()).min(1, { message: "Please select at least one gear item." }),
  quantities: z.record(z.string(), z.number().int().min(1).max(50)).default({}),
  reason: z.string().min(1, { message: "Please select a reason for use." }),
  otherReason: z.string().optional(),
  bookForUserId: z.string().optional(),
  destination: z.string().min(3, { message: "Destination is required (min. 3 characters)." }),
  duration: z.string().min(1, { message: "Please select a duration." }),
  teamMembers: z.array(z.string()).optional().default([]),
  conditionConfirmed: z.boolean().refine(val => val === true, { message: 'You must confirm the gear condition.' }),
}).refine((data) => {
  if (data.reason === "Other" && (!data.otherReason || data.otherReason.trim().length === 0)) {
    return false;
  }
  return true;
}, {
  message: "Please specify your reason",
  path: ["otherReason"],
});

/**
 * Request Form Values Type
 * 
 * TypeScript type definition derived from the Zod schema
 * for type-safe form handling and validation.
 */
type RequestFormValues = z.infer<typeof requestSchema>;

const REQUEST_FORM_DRAFT_KEY = "user-request-gear-form-draft";

function RequestGearContent() {
  const searchParams = useSearchParams();
  const preselectedGearId = searchParams.get('gearId');
  const router = useRouter();
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(false);
  const [bookingType, setBookingType] = useState<'self' | 'other' | null>(null);
  const [availableGears, setAvailableGears] = useState<Gear[]>([]);
  const [availableUsers, setAvailableUsers] = useState<SelectableUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  /**
   * Form Configuration
   * 
   * React Hook Form setup with Zod validation and default values.
   * Handles form state, validation, and submission processing.
   */
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      selectedGears: preselectedGearId ? [preselectedGearId] : [],
      quantities: {},
      reason: "",
      otherReason: "",
      bookForUserId: "",
      destination: "",
      duration: "",
      teamMembers: [],
      conditionConfirmed: false,
    },
  });

  const getAvailableUnitsByName = (targetName?: string) => {
    if (!targetName) return 0;
    const norm = targetName.toLowerCase().trim();
    return availableGears
      .filter(x => (x.name || '').toLowerCase().trim() === norm)
      .reduce((sum, x) => sum + (x.available_quantity || 0), 0);
  };

  /**
   * Draft Persistence Effect
   * 
   * Automatically saves form state to localStorage whenever
   * form values change to prevent data loss.
   */
  useEffect(() => {
    const draft = localStorage.getItem(REQUEST_FORM_DRAFT_KEY);
    if (draft) {
      try {
        const values = JSON.parse(draft);
        form.reset({ ...form.getValues(), ...values });
      } catch (error) {
        console.warn('Failed to restore form draft:', error);
      }
    }
  }, [form]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      localStorage.setItem(REQUEST_FORM_DRAFT_KEY, JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) setUserId(user.id);
      } catch (error) {
        console.error('Failed to get current user:', error);
      }
    };
    getCurrentUser();
  }, [supabase]);

  /**
   * Data Fetching and Real-time Updates Effect
   * 
   * Fetches equipment and user data with real-time subscriptions
   * for live updates when equipment status changes.
   */
  useEffect(() => {
    /**
     * Fetch Available Equipment
     * 
     * Retrieves all equipment with "Available" status for
     * display in the equipment selection interface.
     */
    const fetchGears = async () => {
      try {
        const { data, error } = await apiGet<{ data: Gear[]; error: string | null }>(`/api/gears/available`);
        if (error) {
          console.error('Error fetching gears:', error);
          toast({
            title: "Error loading equipment",
            description: "Failed to load available equipment. Please refresh the page.",
            variant: "destructive",
          });
        } else {
          setAvailableGears(data || []);
        }
      } catch (error) {
        console.error('Exception fetching gears:', error);
        toast({
          title: "Error",
          description: "An unexpected error occurred while loading equipment.",
          variant: "destructive",
        });
      }
    };

    /**
     * Fetch Available Users
     * 
     * Retrieves user profiles for team member selection
     * and collaboration features.
     */
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, role')
          .eq('status', 'Active')
          .is('deleted_at', null)
          .order('full_name');
        if (!error) {
          setAvailableUsers((data || []) as SelectableUser[]);
        }
      } catch (error) {
        console.error('Exception fetching users:', error);
      }
    };

    // Initial data loading
    fetchGears();
    fetchUsers();

    const channel = supabase.channel('public:gears').on('postgres_changes', { event: '*', schema: 'public', table: 'gears' }, () => { fetchGears(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, toast]);

  /**
   * Form Submission Handler
   * 
   * Processes equipment request form submission including validation,
   * database insertion, notification generation, and user feedback.
   * Handles the complete request workflow from submission to confirmation.
   * 
   * @param {RequestFormValues} data - Validated form data
   * 
   * Workflow Steps:
   * 1. User authentication verification
   * 2. Request data insertion into database
   * 3. User profile retrieval for notifications
   * 4. Equipment name resolution for display
   * 5. System notification creation
   * 6. External notification dispatch (Google Chat)
   * 7. Activity logging for audit trail
   * 8. Form reset and draft cleanup
   * 9. User feedback and success confirmation
   * 
   * @example
   * ```typescript
   * // Form submission with validation
   * const requestData = {
   *   selectedGears: ['gear-123', 'gear-456'],
   *   reason: 'Youtube Shoot',
   *   destination: 'Downtown Studio',
   *   duration: '24hours',
   *   teamMembers: ['user-789'],
   *   conditionConfirmed: true
   * };
   * 
   * await onSubmit(requestData);
   * ```
   */
  const onSubmit = async (data: RequestFormValues) => {
    setIsLoading(true);
    if (!userId) {
      toast({ title: "Authentication Error", description: "User not authenticated.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    try {
      const byIdQuantity = data.quantities || {};
      for (const gearId of data.selectedGears) {
        const qty = byIdQuantity[gearId] ?? 1;
        const anchor = availableGears.find(g => g.id === gearId);
        if (!anchor) continue;
        const availableForName = getAvailableUnitsByName(anchor.name);
        if (qty > Math.max(1, availableForName)) {
          setIsLoading(false);
          toast({ title: 'Not enough available units', description: `Requested ${qty} × ${anchor.name}, but only ${availableForName} available.`, variant: 'destructive' });
          return;
        }
      }

      const finalReason = data.reason === "Other" ? data.otherReason : data.reason;

      const requestPayload = {
        user_id: userId || '',
        reason: finalReason || '',
        destination: data.destination || '',
        expected_duration: data.duration || '',
        due_date: calculateDueDate(data.duration || ''),
        team_members: data.teamMembers.length ? data.teamMembers.join(',') : null,
        status: 'Pending',
        gear_request_gears: data.selectedGears.map((gearId) => ({
          gear_id: gearId,
          quantity: (data.quantities && typeof data.quantities[gearId] === 'number' ? data.quantities[gearId] : 1)
        }))
      };

      const requestResp = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });
      const requestJson = await requestResp.json().catch(() => null);
      if (!requestResp.ok || requestJson?.error) {
        if (requestJson?.correlation_id) {
          console.error('[Gear Request Submit] correlation_id:', requestJson.correlation_id);
        }
        throw new Error(
          requestJson?.user_message ||
          requestJson?.error ||
          'We could not complete your request right now. Please try again.'
        );
      }

      const requestId = (requestJson?.booking?.id || requestJson?.data?.id) as string | undefined;

      const { data: userProfile } = await supabase.from('profiles').select('full_name, email').eq('id', userId).single();
      const gearNames = availableGears.filter(g => data.selectedGears.includes(g.id)).map(g => g.name).join(', ');

      await createSystemNotification('New Equipment Request', `${userProfile?.full_name || 'User'} requested: ${gearNames}`, 'system', [userId]);

      try {
        await notifyGoogleChat(NotificationEventType.USER_REQUEST, {
          requestId: requestId || '',
          userId: userId,
          userName: userProfile?.full_name || 'Unknown User',
          userEmail: userProfile?.email || '',
          gearNames: gearNames.split(',').map((s) => s.trim()),
          reason: finalReason || '',
          destination: data.destination,
          duration: data.duration,
          teamMembers: data.teamMembers
        });
      } catch { console.error('Chat notification failed'); }

      // Send emails based on booking type
      try {
        const gearList = availableGears
          .filter(g => data.selectedGears.includes(g.id))
          .map((g, idx) => `${idx + 1}. ${g.name} (Qty: ${data.quantities?.[g.id] || 1})`)
          .join('\n');

        // Resolve booked-for user profile (when booking for someone else)
        const bookedForUser = bookingType === 'other' && data.bookForUserId
          ? availableUsers.find(u => u.id === data.bookForUserId) ?? null
          : null;
        const bookedForDisplay = bookedForUser?.full_name || bookedForUser?.email || 'Unknown';

        // Email + push notification to person being booked for
        if (bookingType === 'other' && bookedForUser) {
          if (bookedForUser.email) {
            await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: bookedForUser.email,
                subject: `Equipment Booking Notification - ${userProfile?.full_name || 'Eden Oasis'}`,
                template: 'equipment-booking-for-person',
                data: {
                  recipientName: bookedForUser.full_name || bookedForUser.email?.split('@')[0],
                  bookerName: userProfile?.full_name || 'Team Member',
                  gearList,
                  reason: finalReason,
                  destination: data.destination,
                  duration: data.duration,
                  requestId: requestId || '',
                  bookingUrl: `${window.location.origin}/user/my-requests`
                }
              })
            }).catch(err => console.error('Email to booked-for person failed:', err));
          }
          await createSystemNotification(
            'Equipment Booked For You',
            `${userProfile?.full_name || 'A colleague'} has booked equipment for you: ${gearNames}`,
            'system',
            [bookedForUser.id]
          ).catch(err => console.error('Push to booked-for person failed:', err));
        }

        // Email to submitter (confirmation)
        if (userProfile?.email) {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: userProfile.email,
              subject: `Equipment Request Confirmation - ${requestId || 'New Request'}`,
              template: 'equipment-request-confirmation',
              data: {
                userName: userProfile?.full_name || 'User',
                gearList,
                reason: finalReason,
                destination: data.destination,
                duration: data.duration,
                requestId: requestId || '',
                bookingType: bookingType,
                bookingFor: bookingType === 'other' ? bookedForDisplay : 'Yourself',
                trackingUrl: `${window.location.origin}/user/my-requests/${requestId}`
              }
            })
          }).catch(err => console.error('Confirmation email failed:', err));
        }

        // Email + push notification to each team member
        if (data.teamMembers.length > 0) {
          const teamMemberProfiles = availableUsers.filter(u => data.teamMembers.includes(u.id));
          for (const member of teamMemberProfiles) {
            if (member.email) {
              await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: member.email,
                  subject: `You've been added to an equipment request`,
                  template: 'equipment-request-team-member',
                  data: {
                    recipientName: member.full_name || member.email?.split('@')[0],
                    requesterName: userProfile?.full_name || 'A colleague',
                    gearList,
                    reason: finalReason,
                    destination: data.destination,
                    duration: data.duration,
                    requestId: requestId || '',
                    trackingUrl: `${window.location.origin}/user/my-requests`
                  }
                })
              }).catch(err => console.error(`Email to team member ${member.email} failed:`, err));
            }
          }
          await createSystemNotification(
            'Added to Equipment Request',
            `${userProfile?.full_name || 'A colleague'} added you to an equipment request: ${gearNames}`,
            'system',
            data.teamMembers
          ).catch(err => console.error('Push to team members failed:', err));
        }

        // Email to admins
        const { data: admins } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('role', 'Admin')
          .eq('status', 'Active');

        if (admins && admins.length > 0) {
          for (const admin of admins) {
            await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: admin.email,
                subject: `New Equipment Request - Action Required`,
                template: 'equipment-request-admin',
                data: {
                  adminName: admin.full_name || 'Admin',
                  requestId: requestId || '',
                  requesterName: userProfile?.full_name || 'Unknown',
                  requesterEmail: userProfile?.email || '',
                  bookingType: bookingType,
                  bookingFor: bookingType === 'other' ? bookedForDisplay : userProfile?.full_name || 'Unknown',
                  gearList,
                  reason: finalReason,
                  destination: data.destination,
                  duration: data.duration,
                  teamMembers: data.teamMembers.length
                    ? availableUsers.filter(u => data.teamMembers.includes(u.id)).map(u => u.full_name || u.email).join(', ')
                    : 'None',
                  reviewUrl: `${window.location.origin}/admin/requests/${requestId}`
                }
              })
            }).catch(err => console.error('Admin email failed:', err));
          }
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Don't fail the whole request if emails fail
      }

      form.reset();
      localStorage.removeItem(REQUEST_FORM_DRAFT_KEY);
      toast({ title: "Request Submitted Successfully", description: `Your request for ${gearNames} has been submitted.` });
      router.push('/user/my-requests');
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "We could not complete your request right now. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGears = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return availableGears.filter(gear =>
      gear.name?.toLowerCase().includes(term) ||
      gear.category?.toLowerCase().includes(term) ||
      gear.serial_number?.toLowerCase().includes(term)
    );
  }, [availableGears, searchTerm]);

  return (
    <div className="w-full min-h-screen">
      {/* Booking Type Selection Modal */}
      <Dialog open={bookingType === null} onOpenChange={() => {}}>
        <DialogContent className="max-w-md border border-neutral-800 bg-neutral-950 p-0 gap-0 overflow-hidden">
          <div className="border-b border-neutral-800 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-foreground">Request Equipment</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Who will be using this equipment?
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-3">
            <motion.button
              whileHover={{ backgroundColor: 'rgba(249,115,22,0.05)' }}
              onClick={() => setBookingType('self')}
              className="w-full p-5 text-left border border-neutral-800 hover:border-orange-500/50 transition-all bg-neutral-900 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">Book for Myself</p>
                  <p className="text-xs text-muted-foreground mt-1">I will be using this equipment personally</p>
                </div>
                <div className="w-8 h-8 border border-neutral-700 group-hover:border-orange-500/50 flex items-center justify-center text-muted-foreground group-hover:text-orange-400 transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>
            </motion.button>
            <motion.button
              whileHover={{ backgroundColor: 'rgba(249,115,22,0.05)' }}
              onClick={() => setBookingType('other')}
              className="w-full p-5 text-left border border-neutral-800 hover:border-orange-500/50 transition-all bg-neutral-900 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">Book for Someone Else</p>
                  <p className="text-xs text-muted-foreground mt-1">Booking on behalf of a colleague or team</p>
                </div>
                <div className="w-8 h-8 border border-neutral-700 group-hover:border-orange-500/50 flex items-center justify-center text-muted-foreground group-hover:text-orange-400 transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>

      {bookingType && (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-semibold tracking-tight">Request Equipment</h1>
            <span className={`px-3 py-1 text-xs font-medium border ${bookingType === 'self' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
              {bookingType === 'self' ? 'For Myself' : 'For Someone Else'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-muted-foreground text-lg max-w-2xl">
              {bookingType === 'self' ? 'Select the tools you need and provide details for your project.' : 'Fill in the details for the person or team you are booking equipment for.'}
            </p>
            <button
              type="button"
              onClick={() => setBookingType(null)}
              className="text-xs text-muted-foreground hover:text-orange-400 border border-neutral-800 hover:border-orange-500/50 px-3 py-1.5 transition-all whitespace-nowrap"
            >
              Change
            </button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-4 border-b border-neutral-800">
                <CardTitle className="text-base font-medium">Available Gear</CardTitle>
                <CardDescription>Select the equipment you want to request.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, category, or serial..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 bg-neutral-800 border-neutral-700 focus:border-orange-500 transition-colors"
                  />
                </div>

                <ScrollArea className="h-[400px] w-full bg-neutral-950 overflow-hidden border border-neutral-800">
                  <div className="space-y-0 divide-y divide-neutral-800">
                    {filteredGears.length > 0 ? filteredGears.map((g) => {
                      const isSelected = form.watch("selectedGears")?.includes(g.id);
                      return (
                        <div
                          key={g.id}
                          onClick={() => {
                            const current = form.getValues().selectedGears || [];
                            const updated = isSelected ? current.filter(id => id !== g.id) : [...current, g.id];
                            form.setValue("selectedGears", updated, { shouldValidate: true });
                          }}
                          className={`flex items-center gap-4 p-4 cursor-pointer transition-all duration-200 ${isSelected ? 'bg-orange-500/10 border-l-2 border-l-orange-500' : 'hover:bg-neutral-800/60 border-l-2 border-l-transparent'}`}
                        >
                          <div className={`w-4 h-4 border flex items-center justify-center transition-all shrink-0 ${isSelected ? 'border-orange-500 bg-orange-500' : 'border-neutral-600'}`}>
                            {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>}
                          </div>

                          <div className="w-14 h-14 overflow-hidden bg-neutral-800 shrink-0 border border-neutral-700">
                            <Image
                              src={g.image_url || '/images/placeholder-gear.svg'}
                              alt={g.name || 'Equipment'}
                              width={56}
                              height={56}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="flex-1 min-w-0 flex items-center justify-between">
                            <div className="space-y-0.5">
                              <h4 className={`text-sm font-medium transition-colors ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{g.name}</h4>
                              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">{g.category}</p>
                              {Math.max((g.quantity || 0) - (g.available_quantity || 0), 0) > 0 && (
                                <p className="text-[10px] text-amber-500">
                                  {Math.max((g.quantity || 0) - (g.available_quantity || 0), 0)} currently booked
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-[11px] font-medium text-muted-foreground">
                                {g.available_quantity} avail.
                              </div>
                              {g.status === 'Partially Available' && (
                                <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  Partial
                                </span>
                              )}
                              {g.status === 'Pending Check-in' && (
                                <span className="text-[10px] px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                  Pending Return
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="py-20 text-center text-muted-foreground text-sm">No equipment found matching your search.</div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-4 border-b border-neutral-800">
                <CardTitle className="text-base font-medium">Request Details</CardTitle>
                <CardDescription>Provide purpose and timeline for your request.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Book For Field - Show when booking for someone else */}
                {bookingType === 'other' && (
                  <div className="border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                    <p className="text-xs font-medium text-blue-400 uppercase tracking-wider">Booking on behalf of</p>
                    <FormField
                      control={form.control}
                      name="bookForUserId"
                      render={({ field }) => {
                        const selectedUser = availableUsers.find(u => u.id === field.value);
                        const filteredForUsers = availableUsers
                          .filter(u => u.id !== userId)
                          .filter(u =>
                            !userSearchTerm ||
                            u.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                            u.email?.toLowerCase().includes(userSearchTerm.toLowerCase())
                          );
                        return (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-foreground">
                              Select Person <span className="text-orange-500">*</span>
                            </FormLabel>
                            {/* Selected user chip */}
                            {selectedUser && (
                              <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30">
                                <div className="w-8 h-8 bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-semibold text-blue-400">
                                    {(selectedUser.full_name || selectedUser.email || '?').charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{selectedUser.full_name || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground truncate">{selectedUser.email}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => { field.onChange(''); setUserSearchTerm(''); }}
                                  className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                                  title="Remove selection"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                </button>
                              </div>
                            )}
                            {/* Search + list */}
                            {!selectedUser && (
                              <div className="border border-neutral-700 bg-neutral-900">
                                <div className="relative border-b border-neutral-700">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                  <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={userSearchTerm}
                                    onChange={e => setUserSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                                  />
                                </div>
                                <div className="max-h-48 overflow-y-auto divide-y divide-neutral-800">
                                  {filteredForUsers.length > 0 ? filteredForUsers.map(u => (
                                    <button
                                      key={u.id}
                                      type="button"
                                      onClick={() => { field.onChange(u.id); setUserSearchTerm(''); }}
                                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-800 transition-colors text-left"
                                    >
                                      <div className="w-7 h-7 bg-neutral-700 flex items-center justify-center shrink-0">
                                        <span className="text-xs font-semibold text-muted-foreground">
                                          {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-foreground truncate">{u.full_name || 'Unknown'}</p>
                                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                      </div>
                                      <span className="text-[10px] text-muted-foreground/60 uppercase">{u.role}</span>
                                    </button>
                                  )) : (
                                    <p className="px-3 py-4 text-sm text-muted-foreground text-center">No users found</p>
                                  )}
                                </div>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              This person will receive an email and push notification about this booking
                            </p>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Reason for Use <span className="text-orange-500">*</span></FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-2 mt-2">
                          {reasonOptions.map((reason) => (
                            <div key={reason} onClick={() => field.onChange(reason)} className={`px-3 py-1.5 cursor-pointer text-xs font-medium transition-all border ${field.value === reason ? 'bg-orange-500 text-white border-orange-500' : 'bg-neutral-800 text-muted-foreground border-neutral-700 hover:border-orange-500/50 hover:text-foreground'}`}>
                              {reason}
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("reason") === "Other" && (
                  <FormField
                    control={form.control}
                    name="otherReason"
                    render={({ field }) => (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground">Please specify <span className="text-orange-500">*</span></label>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Describe your use case..."
                              className="h-11 bg-neutral-800 border-neutral-700 focus:border-orange-500 transition-colors"
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </motion.div>
                    )}
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="destination"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">Destination / Location <span className="text-orange-500">*</span></FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Studio B, Client Office" className="h-11 bg-neutral-800 border-neutral-700 focus:border-orange-500 transition-colors" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">Expected Duration <span className="text-orange-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 bg-neutral-800 border-neutral-700 focus:border-orange-500 transition-colors">
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-neutral-900 border-neutral-800">
                            {durationOptions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Team Members */}
                <FormField
                  control={form.control}
                  name="teamMembers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Team Members <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                      <Select onValueChange={(val) => field.onChange([...field.value, val])} value="">
                        <FormControl>
                          <SelectTrigger className="h-11 bg-neutral-800 border-neutral-700 focus:border-orange-500 transition-colors">
                            <SelectValue placeholder="Add team members..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-neutral-900 border-neutral-800">
                          {availableUsers.filter(u => u.id !== userId).map(u => (
                            <SelectItem key={u.id} value={u.id}>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{u.full_name || 'User'}</span>
                                <span className="text-xs text-muted-foreground">{u.email}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {field.value.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {field.value.map(id => {
                            const u = availableUsers.find(user => user.id === id);
                            return (
                              <div key={id} className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 border border-neutral-700 text-sm">
                                <span className="text-foreground text-xs">{u?.full_name || u?.email}</span>
                                <button type="button" onClick={() => field.onChange(field.value.filter(mid => mid !== id))} className="text-muted-foreground hover:text-red-400 transition-colors">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {form.watch("selectedGears")?.length > 0 && (
              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader className="pb-4 border-b border-neutral-800">
                  <CardTitle className="text-base font-medium">Review & Quantity</CardTitle>
                  <CardDescription>{form.watch("selectedGears").length} item{form.watch("selectedGears").length !== 1 ? 's' : ''} selected</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availableGears.filter(g => form.watch("selectedGears").includes(g.id)).map(g => {
                      const qty = form.watch(`quantities.${g.id}`) ?? 1;
                      const max = getAvailableUnitsByName(g.name);
                      return (
                        <div key={g.id} className="flex items-center gap-4 p-4 bg-neutral-950 border border-neutral-800">
                          <div className="w-12 h-12 overflow-hidden bg-neutral-800 border border-neutral-700 shrink-0">
                            <Image src={g.image_url || '/images/placeholder-gear.svg'} alt={g.name || ''} width={48} height={48} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate text-foreground">{g.name}</h4>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button type="button" title="Decrease quantity" onClick={() => form.setValue(`quantities.${g.id}`, Math.max(1, qty - 1))} className="w-7 h-7 flex items-center justify-center border border-neutral-700 bg-neutral-800 hover:border-orange-500/50 transition-colors text-muted-foreground hover:text-foreground">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/></svg>
                                </button>
                                <span className="text-sm font-semibold w-6 text-center text-foreground">{qty}</span>
                                <button type="button" title="Increase quantity" onClick={() => form.setValue(`quantities.${g.id}`, Math.min(max, qty + 1))} className="w-7 h-7 flex items-center justify-center border border-neutral-700 bg-neutral-800 hover:border-orange-500/50 transition-colors text-muted-foreground hover:text-foreground">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                                </button>
                              </div>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Max {max}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <FormField
                    control={form.control}
                    name="conditionConfirmed"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 p-4 border border-neutral-800 bg-neutral-950 mt-2">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="border-neutral-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500" /></FormControl>
                        <div className="space-y-1">
                          <FormLabel className="text-sm font-medium text-foreground cursor-pointer">I confirm that I have reviewed the gear condition</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isLoading || !form.watch("selectedGears")?.length} className="h-11 px-8 bg-orange-500 hover:bg-orange-600 text-white border-0 font-medium transition-colors">
                {isLoading ? "Processing..." : "Submit Request"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/user/browse')} className="h-11 px-6 bg-neutral-800 border-neutral-700 hover:bg-neutral-700 hover:border-neutral-600 text-foreground">
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </div>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-transparent py-20 flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent animate-spin rounded-full" />
      <span className="text-muted-foreground font-medium">Loading equipment request...</span>
    </div>
  );
}

export default function RequestGearPage() {
  return <Suspense fallback={<LoadingFallback />}><RequestGearContent /></Suspense>;
}
