// Equipment request page for Nest by Eden Oasis. Handles multi-select requests, validation, and real-time updates.

"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
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
import type { Profile, Gear } from '@/types/supabase';

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
  "Offplan property Shoot", // Pre-construction marketing
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
  "year"        // Long-term usage
];

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
      reason: "",
      destination: "",
      duration: "",
      teamMembers: [],
      conditionConfirmed: false,
    },
  });

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
    const subscription = form.watch((values) => {
      try {
        localStorage.setItem(REQUEST_FORM_DRAFT_KEY, JSON.stringify(values));
      } catch (error) {
        console.warn('Failed to save form draft:', error);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  /**
   * Clear Request Draft
   * 
   * Removes saved draft from localStorage after successful
   * form submission to prevent interference with new requests.
   */
  const clearRequestDraft = () => {
    try {
      localStorage.removeItem(REQUEST_FORM_DRAFT_KEY);
    } catch (error) {
      console.warn('Failed to clear form draft:', error);
    }
  };

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
        const { data, error } = await apiGet<{ data: Gear[]; error: string | null }>(`/api/gears?status=Available&pageSize=1000`);
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
          .order('full_name');

        if (error) {
          console.error('Error fetching users:', error);
          toast({
            title: "Error loading users",
            description: "Failed to load user profiles for team selection.",
            variant: "destructive",
          });
        } else {
          setAvailableUsers((data || []).map((u: any) => ({
            id: u.id,
            full_name: u.full_name ?? null,
            email: u.email ?? null,
            role: u.role,
            department: u.department ?? null,
            avatar_url: u.avatar_url ?? null,
            status: u.status ?? 'Active',
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
    if (!userId) {
      toast({
        title: "Authentication Error",
        description: "User not authenticated. Please log in again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      // Insert request into database
      const { data: requestData, error } = await supabase
        .from('gear_requests')
        .insert({
          user_id: userId || '',
          gear_ids: data.selectedGears,
          reason: data.reason || '',
          destination: data.destination || '',
          expected_duration: data.duration || '',
          team_members: data.teamMembers.length ? data.teamMembers.join(',') : null,
          status: 'Pending'
        })
        .select();

      if (error) {
        throw error;
      }

      // Populate the gear_request_gears junction table
      if (requestData && requestData[0] && data.selectedGears.length > 0) {
        const gearRequestGearsData = data.selectedGears.map(gearId => ({
          gear_request_id: requestData[0].id,
          gear_id: gearId
        }));

        const { error: junctionError } = await supabase
          .from('gear_request_gears')
          .insert(gearRequestGearsData);

        if (junctionError) {
          console.error('Error creating gear_request_gears relationships:', junctionError);
          // Don't throw here as the main request was created successfully
        }
      }

      // Notify admins via API trigger
      if (requestData && requestData[0]) {
        await fetch('/api/notifications/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'INSERT',
            table: 'gear_requests',
            record: requestData[0],
          }),
        });
      }

      // Fetch user profile for notification context
      let userProfile = null;
      if (userId) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', userId)
          .single();

        if (!profileError) {
          userProfile = profileData;
        }
      }

      // Resolve equipment names for notification display
      const selectedGearNames = availableGears
        .filter(gear => data.selectedGears.includes((gear as { id: string }).id))
        .map(gear => (gear as { name?: string }).name);

      // Create system notification for administrators
      await createSystemNotification(
        `New Equipment Request: ${selectedGearNames.join(', ')}`,
        `${userProfile?.full_name || 'Unknown User'} has requested equipment for ${data.reason || ''}`,
        'gear_request',
        [] // Empty array means notify all admins
      );

      // Create notification for the user
      await createSystemNotification(
        userId,
        'Request Submitted Successfully',
        `Your request for ${selectedGearNames.join(', ')} has been submitted and is pending approval.`
      );

      // Send external notification to Google Chat
      await notifyGoogleChat(NotificationEventType.USER_REQUEST, {
        userName: userProfile?.full_name || 'Unknown User',
        userEmail: userProfile?.email || '',
        gearNames: selectedGearNames,
        reason: data.reason,
        destination: data.destination,
        duration: data.duration,
        requestId: requestData[0]?.id || 'unknown'
      });

      // Log activity for audit trail
      if (data.selectedGears.length > 0) {
        await supabase.from('gear_activity_log').insert(
          data.selectedGears.map(gearId => ({
            gear_id: gearId,
            user_id: userId,
            activity_type: 'request',
            status: 'Requested',
            notes: `Equipment requested for ${data.reason} at ${data.destination}`
          }))
        );
      }

      // Success feedback and cleanup
      toast({
        title: "Request Submitted Successfully!",
        description: `Your request for ${selectedGearNames.length} item(s) has been submitted and is pending approval.`,
        variant: "default",
      });
      form.reset();
      clearRequestDraft();
      setTimeout(() => {
        router.push('/user/my-requests');
      }, 1500);

    } catch (error) {
      console.error('Request submission error:', error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Filtered Equipment Computation
   * 
   * Filters available equipment based on search term across
   * multiple fields for enhanced discoverability.
   */
  const filteredGears = useMemo(() => {
    if (!searchTerm.trim()) return availableGears;

    const term = searchTerm.toLowerCase();
    return availableGears.filter(gear =>
      (gear as { name?: string; category?: string; description?: string; serial_number?: string }).name?.toLowerCase().includes(term) ||
      (gear as { category?: string }).category?.toLowerCase().includes(term) ||
      (gear as { description?: string }).description?.toLowerCase().includes(term) ||
      (gear as { serial_number?: string }).serial_number?.toLowerCase().includes(term)
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
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search gears by name, category, description, or serial number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full min-h-[44px] text-sm sm:text-base"
                  />
                </div>

                <FormField
                  control={form.control}
                  name="selectedGears"
                  render={({ field }) => (
                    <FormItem>
                      <ScrollArea className="h-[300px] sm:h-[400px] lg:h-[500px] w-full rounded-md border p-3 sm:p-4">
                        <div className="space-y-3 sm:space-y-4">
                          {filteredGears.length === 0 ? (
                            <div className="text-center py-8 sm:py-12 text-muted-foreground">
                              <div className="flex flex-col items-center gap-3">
                                <Search className="h-8 w-8 opacity-50" />
                                <p className="text-sm sm:text-base">
                                  {searchTerm ? `No equipment found matching "${searchTerm}"` : 'No available equipment found'}
                                </p>
                                {searchTerm && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSearchTerm('')}
                                    className="mt-2"
                                  >
                                    Clear Search
                                  </Button>
                                )}
                              </div>
                            </div>
                          ) : (
                            filteredGears.map((gear) => {
                              const isSelected = field.value?.includes((gear as { id: string }).id);
                              const g = gear as { id: string; name?: string; image_url?: string; category?: string; status?: string; condition?: string };
                              return (
                                <Card
                                  key={g.id}
                                  className={`relative transition-all duration-200 hover:shadow-md cursor-pointer ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                                    }`}
                                >
                                  <CardContent className="p-3 sm:p-4">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                      {/* Checkbox */}
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
                                            className="text-xs px-2 py-0.5"
                                          >
                                            {g.condition}
                                          </Badge>
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
                            })
                          )}
                        </div>
                      </ScrollArea>
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
                        const g = gear as { id: string; name?: string; image_url?: string; condition?: string };
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
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                Condition: {g.condition}
                              </p>
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
                    <Send className="mr-2 h-4 w-4" />
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

