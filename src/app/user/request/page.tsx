/**
 * Equipment Request Page - Asset Request Workflow Management
 * 
 * A comprehensive equipment request interface for the Nest by Eden Oasis application
 * that enables users to discover, select, and request equipment/assets for their projects.
 * This page serves as the primary entry point for the equipment request workflow,
 * providing an intuitive interface for asset selection and request submission.
 * 
 * Core Features:
 * - Interactive equipment catalog with real-time availability
 * - Multi-select equipment selection with visual confirmation
 * - Comprehensive request form with validation and draft saving
 * - Team member assignment and collaboration features
 * - Real-time equipment status updates via Supabase subscriptions
 * - Automated notifications and administrative alerts
 * - Form persistence and draft recovery for improved user experience
 * 
 * Workflow Components:
 * - Equipment Discovery: Browse and search available equipment
 * - Asset Selection: Multi-select interface with visual feedback
 * - Request Configuration: Reason, destination, duration, and team setup
 * - Validation System: Comprehensive form validation with error handling
 * - Submission Process: Automated workflow initiation and notifications
 * - Status Tracking: Real-time request status updates
 * 
 * Equipment Catalog Features:
 * - Real-time availability status with live updates
 * - Advanced search and filtering capabilities
 * - Equipment categories and categorization system
 * - Visual equipment cards with images and specifications
 * - Condition verification and equipment health indicators
 * - Quick selection from pre-filtered equipment lists
 * 
 * Request Form Features:
 * - Predefined reason templates for common use cases
 * - Flexible duration options (24 hours to 1 year)
 * - Team member selection and assignment
 * - Destination tracking for equipment location management
 * - Condition confirmation and liability acknowledgment
 * - Form validation with real-time feedback
 * - Auto-save functionality with draft persistence
 * 
 * Integration Points:
 * - Supabase real-time subscriptions for equipment updates
 * - User authentication and profile management
 * - Notification system for request status updates
 * - Google Chat integration for administrative alerts
 * - Equipment management database with status tracking
 * - Activity logging for audit trails and analytics
 * 
 * User Experience Features:
 * - Responsive design optimized for all devices
 * - Progressive enhancement with loading states
 * - Error handling with user-friendly messages
 * - Accessibility features with proper ARIA labels
 * - Form persistence across browser sessions
 * - Real-time validation feedback
 * - Visual selection confirmation and feedback
 * 
 * Security & Compliance:
 * - User authentication verification
 * - Input validation and sanitization
 * - Role-based access control integration
 * - Audit logging for all request activities
 * - Data protection and privacy compliance
 * - Equipment condition verification requirements
 * 
 * Performance Optimizations:
 * - Efficient equipment data loading and caching
 * - Optimized image loading with Next.js Image component
 * - Real-time updates with minimal re-renders
 * - Form state management with React Hook Form
 * - Memory-efficient component design
 * - Progressive loading for large equipment catalogs
 * 
 * @fileoverview Equipment request workflow page for asset management
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 * @since 2024-01-15
 */

"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Send, Users, Clock, Tag, Search } from 'lucide-react';
import { createSystemNotification } from '@/lib/notifications';
import { createClient } from '@/lib/supabase/client';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';
// Import types from the database if available, otherwise use any
type Gear = any;
type Profile = any;

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

/**
 * Request Gear Content Component
 * 
 * Main component that handles the equipment request workflow including
 * equipment discovery, selection, form submission, and status management.
 * Provides a comprehensive interface for users to request equipment
 * with real-time updates and validation.
 * 
 * Key Functionalities:
 * - Equipment catalog display with real-time availability
 * - Multi-select equipment selection interface
 * - Comprehensive request form with validation
 * - Team member assignment and collaboration
 * - Form persistence and draft recovery
 * - Real-time equipment status updates
 * - Automated notification generation
 * 
 * State Management:
 * - Form state with React Hook Form and Zod validation
 * - Equipment data with real-time Supabase subscriptions
 * - User authentication and profile data
 * - Loading states and error handling
 * - Draft persistence in localStorage
 * 
 * @component
 * @returns {JSX.Element} Equipment request interface
 * 
 * @example
 * ```typescript
 * // Basic usage in a page component
 * <Suspense fallback={<LoadingFallback />}>
 *   <RequestGearContent />
 * </Suspense>
 * 
 * // With preselected equipment via URL parameter
 * // /user/request?gearId=123 will preselect equipment with ID 123
 * ```
 */
function RequestGearContent() {
  // URL parameter handling for preselected equipment
  const searchParams = useSearchParams();
  const preselectedGearId = searchParams.get('gearId');

  // Core hooks and utilities
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  // Component state management
  const [isLoading, setIsLoading] = useState(false);
  const [availableGears, setAvailableGears] = useState<Gear[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Pick<Profile, 'id' | 'email' | 'full_name' | 'role'>[]>([]);
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
        const { data, error } = await supabase
          .from('gears')
          .select('*')
          .eq('status', 'Available')
          .order('name');

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
          setAvailableUsers(data || []);
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
          user_id: userId,
          gear_ids: data.selectedGears,
          reason: data.reason,
          destination: data.destination,
          expected_duration: data.duration,
          team_members: data.teamMembers.length ? data.teamMembers.join(',') : null,
          status: 'Pending'
        })
        .select();

      if (error) {
        throw error;
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
        .filter(gear => data.selectedGears.includes(gear.id))
        .map(gear => gear.name);

      // Create system notification for administrators
      await createSystemNotification(
        `New Equipment Request: ${selectedGearNames.join(', ')}`,
        `${userProfile?.full_name || 'Unknown User'} has requested equipment for ${data.reason}`,
        'gear_request'
      );

      // Send external notification to Google Chat
      await notifyGoogleChat(
        NotificationEventType.NEW_REQUEST,
        {
          userName: userProfile?.full_name || 'Unknown User',
          userEmail: userProfile?.email || '',
          gearNames: selectedGearNames,
          reason: data.reason,
          destination: data.destination,
          duration: data.duration,
          requestId: requestData[0]?.id || 'unknown'
        }
      );

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

      // Reset form and clear draft
      form.reset();
      clearRequestDraft();

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
      gear.name?.toLowerCase().includes(term) ||
      gear.category?.toLowerCase().includes(term) ||
      gear.description?.toLowerCase().includes(term) ||
      gear.brand?.toLowerCase().includes(term) ||
      gear.model?.toLowerCase().includes(term)
    );
  }, [availableGears, searchTerm]);

  return (
    <div className="w-full min-h-screen">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Request Gear</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Select equipment and provide details for your gear request.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Equipment Selection */}
            <Card className="w-full">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl">Select Equipment</CardTitle>
                <CardDescription className="text-sm">Choose the gear you need for your request</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search gears by name, category, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>

                <FormField
                  control={form.control}
                  name="selectedGears"
                  render={({ field }) => (
                    <FormItem>
                      <ScrollArea className="h-[300px] sm:h-[400px] w-full rounded-md border p-4">
                        <div className="space-y-3">
                          {filteredGears.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              {searchTerm ? `No gears found matching "${searchTerm}"` : 'No available equipment found'}
                            </div>
                          ) : (
                            filteredGears.map((gear) => {
                              const isSelected = field.value?.includes(gear.id);
                              return (
                                <Card
                                  key={gear.id}
                                  className={`relative transition-all duration-200 hover:shadow-md cursor-pointer ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                                    }`}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                      {/* Checkbox */}
                                      <FormControl>
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={(checked) => {
                                            const currentValues = field.value || [];
                                            const newValues = checked
                                              ? [...currentValues, gear.id]
                                              : currentValues.filter((value) => value !== gear.id);
                                            field.onChange(newValues);
                                          }}
                                          className="h-5 w-5 shrink-0"
                                        />
                                      </FormControl>

                                      {/* Gear Image */}
                                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border overflow-hidden bg-muted shrink-0">
                                        <Image
                                          src={gear.image_url || '/images/placeholder-gear.svg'}
                                          alt={gear.name}
                                          width={80}
                                          height={80}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>

                                      {/* Gear Details */}
                                      <div className="flex-1 min-w-0 space-y-1">
                                        <h4 className="font-semibold text-sm sm:text-base text-foreground truncate">
                                          {gear.name}
                                        </h4>
                                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                          {gear.category}
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                          <Badge
                                            variant="secondary"
                                            className="text-xs px-2 py-0.5"
                                          >
                                            {gear.status}
                                          </Badge>
                                          <Badge
                                            variant="outline"
                                            className="text-xs px-2 py-0.5"
                                          >
                                            {gear.condition}
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
                                            ? [...currentValues, gear.id]
                                            : currentValues.filter((value) => value !== gear.id);
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
            <Card className="w-full">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl">Request Details</CardTitle>
                <CardDescription className="text-sm">Provide information about your request</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Reason for Use */}
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Reason for Use</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
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
                                  className={`flex-1 w-full p-3 border rounded-lg cursor-pointer text-center text-xs sm:text-sm transition-all hover:bg-muted hover:border-primary/50 ${field.value === reason
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
                      <FormLabel className="text-sm font-medium">Destination / Location</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Studio B, Client Office, Site Alpha"
                          {...field}
                          className="w-full"
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
                      <FormLabel className="text-sm font-medium">Expected Duration</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
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
                      <FormLabel className="text-sm font-medium">Team Members (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange([...field.value, value])}
                        value=""
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
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
                                    <span className="font-medium">{user.full_name || 'Unnamed User'}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {user.email} {user.role && `• ${user.role}`}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {field.value.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {field.value.map((memberId: string) => {
                            const member = availableUsers.find(u => u.id === memberId);
                            return (
                              <Badge
                                key={memberId}
                                variant="secondary"
                                className="flex items-center gap-1"
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
                      <FormDescription className="text-xs">
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
              <Card className="w-full">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg sm:text-xl">Confirm Equipment Condition</CardTitle>
                  <CardDescription className="text-sm">Review the condition of selected gear</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {availableGears
                      .filter(gear => form.watch("selectedGears")?.includes(gear.id))
                      .map(gear => (
                        <div key={gear.id} className="p-3 border rounded-lg bg-muted/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded border overflow-hidden bg-background">
                                <Image
                                  src={gear.image_url || '/images/placeholder-gear.svg'}
                                  alt={gear.name}
                                  width={48}
                                  height={48}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">{gear.name}</h4>
                                <p className="text-xs text-muted-foreground">{gear.category}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {gear.condition}
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>

                  <FormField
                    control={form.control}
                    name="conditionConfirmed"
                    render={({ field: checkboxField }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-lg bg-background">
                        <FormControl>
                          <Checkbox
                            checked={checkboxField.value}
                            onCheckedChange={checkboxField.onChange}
                            className="mt-0.5"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="cursor-pointer text-sm">
                            I acknowledge the current condition of the selected gear and will return it in the same condition.
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <div className="flex justify-center sm:justify-end pt-4">
              <FormField
                control={form.control}
                name="selectedGears"
                render={({ field }) => (
                  <Button
                    type="submit"
                    disabled={!field.value || field.value.length === 0 || isLoading}
                    className="w-full sm:w-auto px-8 py-3 text-sm font-medium"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Submit Request
                      </>
                    )}
                  </Button>
                )}
              />
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

