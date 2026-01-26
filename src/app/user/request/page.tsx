// Equipment request page for Nest by Eden Oasis. Handles multi-select requests, validation, and real-time updates.

"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useSearchParams, useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Send, Search } from 'lucide-react';
import { createSystemNotification } from '@/lib/notifications';
import { createClient } from '@/lib/supabase/client';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';
import { apiGet } from '@/lib/apiClient';
import { Skeleton } from "@/components/ui/skeleton";

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

type RequestFormValues = z.infer<typeof requestSchema>;

const REQUEST_FORM_DRAFT_KEY = "user-request-gear-form-draft";

function RequestGearContent() {
  const searchParams = useSearchParams();
  const preselectedGearId = searchParams.get('gearId');
  const router = useRouter();
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(false);
  const [availableGears, setAvailableGears] = useState<Gear[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      selectedGears: preselectedGearId ? [preselectedGearId] : [],
      quantities: {},
      reason: "",
      otherReason: "",
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

  useEffect(() => {
    const fetchGears = async () => {
      try {
        const { data, error } = await apiGet<{ data: Gear[]; error: string | null }>(`/api/gears/available`);
        if (error) {
          toast({ title: "Error loading equipment", description: "Failed to load available equipment.", variant: "destructive" });
        } else {
          setAvailableGears(data || []);
        }
      } catch (error) {
        console.error('Exception fetching gears:', error);
      }
    };

    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, role')
          .eq('status', 'Active')
          .is('deleted_at', null)
          .order('full_name');
        if (!error) {
          setAvailableUsers((data || []).map((u: any) => ({ ...u, status: 'Active' })));
        }
      } catch (error) {
        console.error('Exception fetching users:', error);
      }
    };

    fetchGears();
    fetchUsers();

    const channel = supabase.channel('public:gears').on('postgres_changes', { event: '*', schema: 'public', table: 'gears' }, () => { fetchGears(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, toast]);

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
        status: 'Pending'
      };

      const { data: requestData, error } = await supabase.from('gear_requests').insert(requestPayload).select();
      if (error) throw error;

      if (requestData && requestData[0] && data.selectedGears.length > 0) {
        const requestId = requestData[0].id as string;
        const gearRequestGearsData = data.selectedGears.map(gearId => ({
          gear_request_id: requestId,
          gear_id: gearId,
          quantity: (data.quantities && typeof data.quantities[gearId] === 'number' ? data.quantities[gearId] : 1)
        }));

        const resp = await fetch('/api/requests/add-lines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, lines: gearRequestGearsData }),
        });
        const resJson = await resp.json();
        if (!resp.ok || !resJson?.success) throw new Error(resJson?.error || 'Failed to record quantities.');
      }

      const { data: userProfile } = await supabase.from('profiles').select('full_name, email').eq('id', userId).single();
      const gearNames = availableGears.filter(g => data.selectedGears.includes(g.id)).map(g => g.name).join(', ');

      await createSystemNotification('New Equipment Request', `${userProfile?.full_name || 'User'} requested: ${gearNames}`, 'system', [userId]);

      try {
        await notifyGoogleChat(NotificationEventType.USER_REQUEST, {
          requestId: requestData?.[0]?.id || '',
          userId: userId,
          userName: userProfile?.full_name || 'Unknown User',
          userEmail: userProfile?.email || '',
          gearNames: gearNames.split(',').map((s) => s.trim()),
          reason: finalReason || '',
          destination: data.destination,
          duration: data.duration,
          teamMembers: data.teamMembers
        });
      } catch (e) { console.error('Chat notification failed'); }

      form.reset();
      localStorage.removeItem(REQUEST_FORM_DRAFT_KEY);
      toast({ title: "Request Submitted Successfully", description: `Your request for ${gearNames} has been submitted.` });
      router.push('/user/my-requests');
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({ title: "Submission Failed", description: "Please try again.", variant: "destructive" });
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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Request Equipment</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">Select the tools you need and provide details for your project.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card className="border-none bg-accent/10">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-medium">Available Gear</CardTitle>
                <CardDescription>Select the equipment you want to request.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    placeholder="Search by name, category, or serial..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background/50 border-none h-11 focus-visible:ring-1 focus-visible:ring-primary/20"
                  />
                </div>

                <ScrollArea className="h-[400px] w-full rounded-2xl bg-background/20 overflow-hidden">
                  <div className="space-y-1 p-2">
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
                          className={`flex items-center gap-6 p-4 rounded-xl cursor-pointer transition-all duration-300 ${isSelected ? 'bg-background shadow-md' : 'hover:bg-background/40'}`}
                        >
                          {/* Selection indicator - smaller and cleaner */}
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>

                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-accent/20 shrink-0 shadow-sm border border-white/5">
                            <Image
                              src={g.image_url || '/images/placeholder-gear.svg'}
                              alt={g.name || 'Equipment'}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="flex-1 min-w-0 flex items-center justify-between">
                            <div className="space-y-0.5">
                              <h4 className={`text-sm font-medium transition-colors ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{g.name}</h4>
                              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">{g.category}</p>
                            </div>
                            <div className="text-[11px] font-medium text-muted-foreground opacity-60">
                              {g.available_quantity} avail.
                            </div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="py-20 text-center text-muted-foreground">No equipment found matching your search.</div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border-none bg-accent/5">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-medium">Request Details</CardTitle>
                <CardDescription>Provide purpose and timeline for your request.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Reason for Use</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-2">
                          {reasonOptions.map((reason) => (
                            <div key={reason} onClick={() => field.onChange(reason)} className={`px-4 py-2 rounded-full cursor-pointer text-xs sm:text-sm transition-all duration-200 border ${field.value === reason ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-105' : 'bg-background hover:bg-muted text-muted-foreground border-transparent'}`}>
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
                        <div className="pt-4 space-y-2">
                          <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Please specify</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Describe your use case..."
                              className="bg-background/40 border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </motion.div>
                    )}
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="destination"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Destination / Location</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Studio B, Client Office" className="bg-background/50 border-none h-11 focus-visible:ring-1 focus-visible:ring-primary/20" />
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
                        <FormLabel className="text-sm font-medium">Expected Duration</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background/50 border-none h-11"><SelectValue placeholder="Select duration" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {durationOptions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="teamMembers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Team Members (Optional)</FormLabel>
                      <Select onValueChange={(val) => field.onChange([...field.value, val])} value="">
                        <FormControl>
                          <SelectTrigger className="bg-background/50 border-none h-11"><SelectValue placeholder="Select team members" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                              <Badge key={id} variant="secondary" className="pl-3 pr-1 py-1 gap-1 rounded-full bg-background border-none shadow-sm">
                                {u?.full_name || u?.email}
                                <button type="button" onClick={() => field.onChange(field.value.filter(mid => mid !== id))} className="ml-1 p-0.5 rounded-full hover:bg-muted"><Search className="w-3 h-3 rotate-45" /></button>
                              </Badge>
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
              <Card className="border-none bg-accent/10">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-medium">Review & Quantity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableGears.filter(g => form.watch("selectedGears").includes(g.id)).map(g => {
                      const qty = form.watch(`quantities.${g.id}`) ?? 1;
                      const max = getAvailableUnitsByName(g.name);
                      return (
                        <div key={g.id} className="flex items-center gap-4 p-4 bg-background/50 rounded-2xl shadow-sm">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-accent/20 shrink-0">
                            <Image src={g.image_url || '/images/placeholder-gear.svg'} alt={g.name || ''} width={48} height={48} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{g.name}</h4>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <button type="button" onClick={() => form.setValue(`quantities.${g.id}`, Math.max(1, qty - 1))} className="w-8 h-8 flex items-center justify-center rounded-full bg-background hover:bg-accent transition-colors">—</button>
                                <span className="text-sm font-semibold w-4 text-center">{qty}</span>
                                <button type="button" onClick={() => form.setValue(`quantities.${g.id}`, Math.min(max, qty + 1))} className="w-8 h-8 flex items-center justify-center rounded-full bg-background hover:bg-accent transition-colors">+</button>
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
                      <FormItem className="flex flex-row items-center space-x-3 p-4 bg-primary/5 rounded-2xl mt-4">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1">
                          <FormLabel className="text-sm font-medium">I confirm that I have reviewed the gear condition</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading || !form.watch("selectedGears")?.length} className="h-12 px-10 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-all text-base">
                {isLoading ? "Processing..." : "Submit Request"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.push('/user/browse')} className="h-12 px-8 rounded-full hover:bg-accent">Cancel</Button>
            </div>
          </form>
        </Form>
      </div>
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