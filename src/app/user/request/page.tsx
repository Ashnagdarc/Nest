// Equipment request page for Nest by Eden Oasis. Handles multi-select requests, validation, and real-time updates.

"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
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
// Types defined inline

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

/**
 * Predefined Reason Options
 * 
 * Standardized list of equipment request reasons to ensure
 * consistent categorization and tracking of equipment usage.
 * These options cover common use cases in content creation,
 * real estate, and business operations.
 */
const reasonOptions = [
  "Youtube Shoot",          // Video content creation
  "Event Shoot",           // Event photography/videography
  "Site Update Shoot",     // Property documentation
  "Off Plan Shoot", // Pre-construction marketing
  "Finished House Shoot",   // Completed property marketing
  "Allocation Shoot",       // Unit allocation documentation
  "Personal",              // Personal use
  "Home",                  // Home-based work
  "Site",                  // On-site work
  "Out of State",          // Travel within country
  "Out of country"         // International travel
];

/**
 * Duration Options
 * 
 * Predefined equipment rental/usage duration options
 * ranging from short-term to long-term usage scenarios.
 */
const durationOptions = [
  "24hours",    // 1 day
  "48hours",    // 2 days
  "72hours",    // 3 days
  "1 week",     // Weekly usage
  "2 weeks",    // Bi-weekly usage
  "Month",      // Monthly usage
  "1year"        // Long-term usage
];

/**
 * Calculate due date from expected duration
 * 
 * Converts the duration string to an actual due date
 * based on when the request is being created.
 */
const calculateDueDate = (duration: string): string => {
  const now = new Date();

  switch (duration) {
    case "24hours":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    case "48hours":
      return new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
    case "72hours":
      return new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();
    case "1 week":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case "2 weeks":
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    case "Month":
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    case "1year":
      return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
    default:
      // Default to 1 week if duration is not recognized
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }
};

/**
 * Request Form Schema
 * 
 * Zod validation schema for equipment request form data.
 * Ensures data integrity and provides user-friendly validation
 * messages for form submission errors.
 * 
 * @interface RequestSchema
 */
const requestSchema = z.object({
  /** Array of selected equipment IDs (minimum 1 required) */
  selectedGears: z.array(z.string()).min(1, {
    message: "Please select at least one gear item."
  }),
  /** Quantities keyed by selected gear id (represents gear type by name) */
  quantities: z.record(z.string(), z.number().int().min(1).max(50)).default({}),
  /** Reason for equipment request (required selection) */
  reason: z.string().min(1, {
    message: "Please select a reason for use."
  }),
  /** Destination where equipment will be used (minimum 3 characters) */
  destination: z.string().min(3, {
    message: "Destination is required (min. 3 characters)."
  }),
  /** Expected usage duration (required selection) */
  duration: z.string().min(1, {
    message: "Please select a duration."
  }),
  /** Optional team members for collaboration */
  teamMembers: z.array(z.string()).optional().default([]),
  /** Mandatory condition confirmation checkbox */
  conditionConfirmed: z.boolean().refine(val => val === true, {
    message: 'You must confirm the gear condition.'
  }),
});

/**
 * Request Form Values Type
 * 
 * TypeScript type definition derived from the Zod schema
 * for type-safe form handling and validation.
 */
type RequestFormValues = z.infer<typeof requestSchema>;

/**
 * Local Storage Key
 * 
 * Consistent key for storing form draft data in browser
 * local storage for persistence across sessions.
 */
const REQUEST_FORM_DRAFT_KEY = "user-request-gear-form-draft";

function RequestGearContent() {
  // URL parameter handling for preselected equipment
  const searchParams = useSearchParams();
  const preselectedGearId = searchParams.get('gearId');

  // Core hooks and utilities
  const router = useRouter();
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  // Component state management
  const [isLoading, setIsLoading] = useState(false);
  const [availableGears, setAvailableGears] = useState<Gear[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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
      destination: "",
      duration: "",
      teamMembers: [],
      conditionConfirmed: false,
    },
  });

  // Helper: compute available units by gear name
  const getAvailableUnitsByName = (targetName?: string) => {
    if (!targetName) return 0;
    const norm = targetName.toLowerCase().trim();
    return availableGears
      .filter(x => (x.name || '').toLowerCase().trim() === norm)
      .reduce((sum, x) => {
        return sum + (x.available_quantity || 0);
      }, 0);
  };

  /**
   * Draft Recovery Effect
   * 
   * Restores form data from localStorage on component mount
   * to provide seamless user experience across browser sessions.
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

  /**
   * Draft Persistence Effect
   * 
   * Automatically saves form state to localStorage whenever
   * form values change to prevent data loss.
   */
  useEffect(() => {
    const subscription = form.watch((value) => {
      localStorage.setItem(REQUEST_FORM_DRAFT_KEY, JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  /**
   * User Authentication Effect
   * 
   * Retrieves current user information for request attribution
   * and authorization verification.
   */
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          setUserId(user.id);
        }
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

        if (error) {
          console.error('Error fetching users:', error);
          toast({
            title: "Error loading users",
            description: "Failed to load user profiles for team selection.",
            variant: "destructive",
          });
        } else {
          setAvailableUsers((data || []).map((u: Partial<Profile>) => ({
            id: String(u.id || ''),
            full_name: u.full_name ?? null,
            email: u.email ?? null,
            role: (u.role as 'Admin' | 'User') ?? 'User',
            department: u.department ?? null,
            avatar_url: u.avatar_url ?? null,
            status: (u.status as 'Active' | 'Inactive' | 'Suspended') ?? 'Active',
            phone: u.phone ?? null,
            location: u.location ?? null,
            employee_id: u.employee_id ?? null,
            created_at: u.created_at ?? '',
            updated_at: u.updated_at ?? '',
            last_sign_in_at: u.last_sign_in_at ?? null,
            is_banned: u.is_banned ?? false,
          })));
        }
      } catch (error) {
        console.error('Exception fetching users:', error);
      }
    };

    // Initial data loading
    fetchGears();
    fetchUsers();

    // Real-time subscription for equipment updates
    const channel = supabase
      .channel('public:gears')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'gears'
      }, () => {
        fetchGears();
      })
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
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
    console.log("Equipment request submitted:", data);

    // Verify user authentication
    console.log('🔍 User ID:', userId);
    if (!userId) {
      console.error('🔍 No user ID found');
      toast({
        title: "Authentication Error",
        description: "User not authenticated. Please log in again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      // Validate requested quantities against availability by gear name
      const byIdQuantity = data.quantities || {};
      for (const gearId of data.selectedGears) {
        const qty = byIdQuantity[gearId] ?? 1;
        const anchor = availableGears.find(g => g.id === gearId);
        if (!anchor) continue;
        const availableForName = getAvailableUnitsByName(anchor.name);
        if (qty > Math.max(1, availableForName)) {
          setIsLoading(false);
          toast({
            title: 'Not enough available units',
            description: `Requested ${qty} × ${anchor.name}, but only ${availableForName} available.`,
            variant: 'destructive',
          });
          return;
        }
      }
      // Insert request into database
      const requestPayload = {
        user_id: userId || '',
        reason: data.reason || '',
        destination: data.destination || '',
        expected_duration: data.duration || '',
        due_date: calculateDueDate(data.duration || ''),
        team_members: data.teamMembers.length ? data.teamMembers.join(',') : null,
        status: 'Pending'
      };

      console.log('🔍 Submitting gear request with payload:', requestPayload);

      const { data: requestData, error } = await supabase
        .from('gear_requests')
        .insert(requestPayload)
        .select();

      if (error) {
        console.error('🔍 Gear request insert error:', error);
        throw error;
      }

      console.log('🔍 Gear request created successfully:', requestData);

      // Populate the gear_request_gears junction table
      if (requestData && requestData[0] && data.selectedGears.length > 0) {
        const requestId = requestData[0].id as string;
        const gearRequestGearsData = data.selectedGears.map(gearId => ({
          gear_request_id: requestId,
          gear_id: gearId,
          quantity: (data.quantities && typeof data.quantities[gearId] === 'number' ? data.quantities[gearId] : 1)
        }));

        // Insert lines through server API to bypass RLS and support both schemas
        console.log('🔍 Sending gear request lines:', { requestId, lines: gearRequestGearsData });
        const resp = await fetch('/api/requests/add-lines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, lines: gearRequestGearsData }),
        });
        const resJson = await resp.json();
        console.log('🔍 API response:', resJson);
        if (!resp.ok || !resJson?.success) {
          console.error('Error inserting gear request gears via API:', resJson);
          throw new Error(resJson?.error || 'Failed to record requested quantities. Please try again.');
        }

        // Verify via API response (avoid client-side RLS on direct select)
        const insertedRows = Array.isArray(resJson?.data) ? resJson.data : [];
        console.log('🔍 Inserted rows:', insertedRows);
        if (insertedRows.length === 0) {
          console.error('API reported success but returned no inserted rows:', resJson);
          throw new Error('Failed to verify requested quantities were saved.');
        }
      }

      // Send emails (user + admins) via API if configured
      try {
        await fetch('/api/requests/created', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: requestData?.[0]?.id }),
        });
      } catch (e) {
        console.warn('Request created email dispatch failed:', e);
      }

      // Get user profile for notifications
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      // Get gear names for display
      const gearNames = availableGears
        .filter(gear => data.selectedGears.includes(gear.id))
        .map(gear => gear.name)
        .join(', ');

      // Create system notification
      await createSystemNotification(
        'New Equipment Request',
        `${userProfile?.full_name || 'User'} requested: ${gearNames}`,
        'system',
        [userId]
      );

      // Send Google Chat notification
      try {
        await notifyGoogleChat(NotificationEventType.USER_REQUEST, {
          requestId: requestData?.[0]?.id || '',
          userId: userId,
          userName: userProfile?.full_name || 'Unknown User',
          userEmail: userProfile?.email || '',
          gearNames: gearNames.split(',').map((s) => s.trim()),
          reason: data.reason,
          destination: data.destination,
          duration: data.duration,
          teamMembers: data.teamMembers
        });
      } catch (notificationError) {
        console.error('Failed to send Google Chat notification:', notificationError);
      }

      // Activity log table not present; skipping optional logging

      // Clear form and draft
      form.reset();
      localStorage.removeItem(REQUEST_FORM_DRAFT_KEY);

      // Success feedback
      toast({
        title: "Request Submitted Successfully",
        description: `Your request for ${gearNames} has been submitted and is pending approval.`,
      });

      // Navigate to requests page
      router.push('/user/my-requests');

    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Filtered Equipment List
   * 
   * Computed list of available equipment filtered by search term
   * for improved user experience and equipment discovery.
   */
  const filteredGears = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return availableGears.filter(gear =>
      gear.name?.toLowerCase().includes(term) ||
      gear.category?.toLowerCase().includes(term) ||
      gear.description?.toLowerCase().includes(term) ||
      gear.serial_number?.toLowerCase().includes(term)
    );
  }, [availableGears, searchTerm]);

  return (
    <div className="w-full min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6 sm:space-y-8">
        {/* Page Header */}
        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Request Equipment</h1>
          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">
            Select equipment and provide details for your gear request.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">

            {/* Equipment Selection */}
            <Card className="w-full shadow-sm">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl lg:text-2xl">Select Equipment</CardTitle>
                <CardDescription className="text-sm sm:text-base">Choose the gear you need for your request</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">

                {/* Search */}
                <div className="relative">
                  <Search aria-hidden="true" className="absolute left-3 top-1/2 transform -translate-y-1/2 icon-16 text-muted-foreground" />
                  <Input
                    placeholder="Search gears by name, category, description, or serial number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Equipment List */}
                <FormField
                  control={form.control}
                  name="selectedGears"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ScrollArea className="h-[400px] w-full rounded-md border">
                          <div className="space-y-2 p-4">
                            {filteredGears.map((gear) => {
                              const g = gear as Gear;
                              const isSelected = field.value?.includes(g.id);

                              return (
                                <Card
                                  key={g.id}
                                  className={`relative cursor-pointer transition-colors ${isSelected
                                    ? 'border-primary bg-primary/5'
                                    : 'hover:bg-muted/50'
                                    }`}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-center space-x-3">
                                      <FormControl>
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={(checked) => {
                                            const currentValues = field.value || [];
                                            const newValues = checked
                                              ? [...currentValues, g.id]
                                              : currentValues.filter((value) => value !== g.id);
                                            field.onChange(newValues);
                                          }}
                                          className="h-4 w-4 sm:h-5 sm:w-5 shrink-0"
                                        />
                                      </FormControl>

                                      {/* Gear Image */}
                                      <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-lg border overflow-hidden bg-muted shrink-0">
                                        <Image
                                          src={g.image_url || '/images/placeholder-gear.svg'}
                                          alt={g.name || 'Equipment'}
                                          width={80}
                                          height={80}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>

                                      {/* Gear Details */}
                                      <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
                                        <h4 className="font-semibold text-sm sm:text-base lg:text-lg text-foreground truncate">
                                          {g.name}
                                        </h4>
                                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                          {g.category}
                                        </p>
                                        <div className="flex flex-wrap gap-1 sm:gap-2">
                                          <Badge
                                            variant="secondary"
                                            className="text-xs px-2 py-0.5"
                                          >
                                            {g.status}
                                          </Badge>
                                          <Badge
                                            variant="outline"
                                            className={`text-xs px-2 py-0.5 ${g.available_quantity === 0
                                              ? 'text-red-600 border-red-200'
                                              : g.available_quantity < g.quantity
                                                ? 'text-yellow-600 border-yellow-200'
                                                : 'text-green-600 border-green-200'
                                              }`}
                                          >
                                            {g.available_quantity} of {g.quantity} available
                                          </Badge>
                                          {g.due_date && g.checked_out_to && (g.status === 'Checked Out' || g.status === 'Partially Checked Out') && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs px-2 py-0.5 text-orange-600 border-orange-200"
                                            >
                                              Due: {format(new Date(g.due_date), 'MMM d, yyyy')}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>

                                      {/* Click overlay for better UX */}
                                      <div
                                        className="absolute inset-0 z-10 cursor-pointer"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const currentValues = field.value || [];
                                          const checked = !isSelected;
                                          const newValues = checked
                                            ? [...currentValues, g.id]
                                            : currentValues.filter((value) => value !== g.id);
                                          field.onChange(newValues);
                                        }}
                                      />
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Request Details */}
            <Card className="w-full shadow-sm">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl lg:text-2xl">Request Details</CardTitle>
                <CardDescription className="text-sm sm:text-base">Provide information about your request</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 sm:space-y-8">

                {/* Reason for Use */}
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-medium">Reason for Use</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3"
                        >
                          {reasonOptions.map((reason) => (
                            <div key={reason} className="relative">
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem
                                    value={reason}
                                    id={`reason-${reason}`}
                                    className="peer absolute opacity-0 pointer-events-none"
                                  />
                                </FormControl>
                                <FormLabel
                                  htmlFor={`reason-${reason}`}
                                  className={`flex-1 w-full p-3 sm:p-4 border rounded-lg cursor-pointer text-center text-xs sm:text-sm lg:text-base transition-all hover:bg-muted hover:border-primary/50 ${field.value === reason
                                    ? 'border-primary bg-primary/10 text-primary font-medium'
                                    : 'border-border'
                                    }`}
                                  onClick={() => field.onChange(reason)}
                                >
                                  {reason}
                                </FormLabel>
                              </FormItem>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Destination */}
                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-medium">Destination / Location</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Studio B, Client Office, Site Alpha"
                          {...field}
                          className="w-full min-h-[44px] text-sm sm:text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Expected Duration */}
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-medium">Expected Duration</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full min-h-[44px] text-sm sm:text-base">
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {durationOptions.map((duration) => (
                            <SelectItem key={duration} value={duration}>
                              {duration}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Team Members */}
                <FormField
                  control={form.control}
                  name="teamMembers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-medium">Team Members (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange([...field.value, value])}
                        value=""
                      >
                        <FormControl>
                          <SelectTrigger className="w-full min-h-[44px] text-sm sm:text-base">
                            <SelectValue placeholder="Select team members" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Team Members</SelectLabel>
                            {availableUsers
                              .filter(user => user.id !== userId)
                              .sort((a, b) => {
                                const nameA = a.full_name || a.email || '';
                                const nameB = b.full_name || b.email || '';
                                return nameA.localeCompare(nameB);
                              })
                              .map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-sm sm:text-base">{user.full_name || 'Unnamed User'}</span>
                                    <span className="text-xs sm:text-sm text-muted-foreground">
                                      {user.email} {user.role && `• ${user.role}`}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {field.value.length > 0 && (
                        <div className="mt-3 sm:mt-4 flex flex-wrap gap-2">
                          {field.value.map((memberId: string) => {
                            const member = availableUsers.find(u => u.id === memberId);
                            return (
                              <Badge
                                key={memberId}
                                variant="secondary"
                                className="flex items-center gap-1 text-xs sm:text-sm"
                              >
                                {member?.full_name || member?.email || 'Unknown user'}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-0 px-1 text-muted-foreground hover:text-foreground"
                                  aria-label={`Remove ${member?.full_name || member?.email || 'member'}`}
                                  onClick={() => {
                                    field.onChange(field.value.filter((id: string) => id !== memberId));
                                  }}
                                >
                                  ×
                                </Button>
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                      <FormDescription className="text-xs sm:text-sm">
                        Select team members who might use the gear during this request.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Condition Confirmation */}
            {form.watch("selectedGears")?.length > 0 && (
              <Card className="w-full shadow-sm">
                <CardHeader className="pb-4 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl">Confirm Equipment Condition</CardTitle>
                  <CardDescription className="text-sm sm:text-base">Review the condition of selected gear</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6">
                  <div className="space-y-3 sm:space-y-4">
                    {availableGears
                      .filter(gear => form.watch("selectedGears")?.includes((gear as { id: string }).id))
                      .map((gear) => {
                        const g = gear as Gear;
                        const maxAvailableForName = getAvailableUnitsByName(g.name);
                        const currentQty = (form.watch('quantities') as Record<string, number>)[g.id] ?? 1;
                        return (
                          <div key={g.id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg border overflow-hidden bg-muted shrink-0">
                              <Image
                                src={g.image_url || '/images/placeholder-gear.svg'}
                                alt={g.name || 'Equipment'}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm sm:text-base text-foreground truncate">
                                {g.name}
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {g.status}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${g.available_quantity === 0
                                    ? 'text-red-600 border-red-200'
                                    : g.available_quantity < g.quantity
                                      ? 'text-yellow-600 border-yellow-200'
                                      : 'text-green-600 border-green-200'
                                    }`}
                                >
                                  {g.available_quantity} of {g.quantity} available
                                </Badge>
                                {g.due_date && (
                                  <Badge variant="outline" className="text-xs">
                                    Due: {format(new Date(g.due_date), 'MMM d, yyyy')}
                                  </Badge>
                                )}
                              </div>
                              {/* Quantity selector per selected gear (by type) */}
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs sm:text-sm text-muted-foreground">Quantity</span>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    aria-label="Decrease quantity"
                                    onClick={() => {
                                      const current = (form.getValues().quantities as Record<string, number>)[g.id] ?? 1;
                                      const next = Math.max(1, Number(current) - 1);
                                      form.setValue(`quantities.${g.id}` as unknown as keyof RequestFormValues, next as unknown as RequestFormValues[keyof RequestFormValues], { shouldDirty: true, shouldValidate: true });
                                    }}
                                  >
                                    −
                                  </Button>
                                  <Input
                                    className="w-16 h-8"
                                    type="number"
                                    min={1}
                                    max={Math.max(1, maxAvailableForName) || undefined}
                                    step={1}
                                    value={currentQty}
                                    onChange={(e) => {
                                      const raw = Number(e.target.value || 1);
                                      const clamped = Math.max(1, Math.min(raw, Math.max(1, maxAvailableForName)));
                                      form.setValue(`quantities.${g.id}` as unknown as keyof RequestFormValues, clamped as unknown as RequestFormValues[keyof RequestFormValues], { shouldDirty: true, shouldValidate: true });
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    aria-label="Increase quantity"
                                    disabled={maxAvailableForName > 0 ? currentQty >= maxAvailableForName : false}
                                    onClick={() => {
                                      const current = (form.getValues().quantities as Record<string, number>)[g.id] ?? 1;
                                      const ceiling = Math.max(1, maxAvailableForName);
                                      const next = Math.min(ceiling, Number(current) + 1);
                                      form.setValue(`quantities.${g.id}` as unknown as keyof RequestFormValues, next as unknown as RequestFormValues[keyof RequestFormValues], { shouldDirty: true, shouldValidate: true });
                                    }}
                                  >
                                    +
                                  </Button>
                                  <span className="ml-1 text-xs text-muted-foreground">Max {Math.max(1, maxAvailableForName)}</span>
                                </div>
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
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mt-1"
                          />
                        </FormControl>
                        <div className="space-y-1">
                          <FormLabel className="text-sm sm:text-base font-medium">
                            I confirm that I have reviewed the condition of all selected equipment
                          </FormLabel>
                          <FormDescription className="text-xs sm:text-sm">
                            By checking this box, you acknowledge that you have reviewed the condition of all selected equipment and understand your responsibility for its care during use.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
              <Button
                type="submit"
                disabled={isLoading || !form.watch("selectedGears")?.length}
                className="w-full sm:w-auto min-h-[44px] text-sm sm:text-base"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                    Submitting Request...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 icon-16" />
                    Submit Request
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/user/browse')}
                className="w-full sm:w-auto min-h-[44px] text-sm sm:text-base"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle>Request Gear</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="mr-2 h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>Loading gear request form...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RequestGearPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RequestGearContent />
    </Suspense>
  );
}