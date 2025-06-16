"use client";

import { useState, useEffect, useMemo } from 'react';
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

// List of predefined reasons for use
const reasonOptions = [
  "Youtube Shoot",
  "Event Shoot",
  "Site Update Shoot",
  "Offplan property Shoot",
  "Finished House Shoot",
  "Allocation Shoot",
  "Personal",
  "Home",
  "Site",
  "Out of State",
  "Out of country"
];

// Duration options for the dropdown
const durationOptions = [
  "24hours",
  "48hours",
  "72hours",
  "1 week",
  "2 weeks",
  "Month",
  "year"
];

const requestSchema = z.object({
  selectedGears: z.array(z.string()).min(1, { message: "Please select at least one gear item." }),
  reason: z.string().min(1, { message: "Please select a reason for use." }),
  destination: z.string().min(3, { message: "Destination is required (min. 3 characters)." }),
  duration: z.string().min(1, { message: "Please select a duration." }),
  teamMembers: z.array(z.string()).optional().default([]),
  conditionConfirmed: z.boolean().refine(val => val === true, { message: 'You must confirm the gear condition.' }),
});

type RequestFormValues = z.infer<typeof requestSchema>;

const REQUEST_FORM_DRAFT_KEY = "user-request-gear-form-draft";

export default function RequestGearPage() {
  const searchParams = useSearchParams();
  const preselectedGearId = searchParams.get('gearId');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [availableGears, setAvailableGears] = useState<Gear[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Pick<Profile, 'id' | 'email' | 'full_name' | 'role'>[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);

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

  // Restore draft from localStorage on mount
  useEffect(() => {
    const draft = localStorage.getItem(REQUEST_FORM_DRAFT_KEY);
    if (draft) {
      try {
        const values = JSON.parse(draft);
        form.reset({ ...form.getValues(), ...values });
      } catch { }
    }
  }, [form]);

  // Save form state to localStorage on change
  useEffect(() => {
    const subscription = form.watch((values) => {
      localStorage.setItem(REQUEST_FORM_DRAFT_KEY, JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, []);

  // Clear draft on submit
  const clearRequestDraft = () => localStorage.removeItem(REQUEST_FORM_DRAFT_KEY);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
      if (user?.id) setUserId(user.id);
    });
  }, [supabase]);

  useEffect(() => {
    const fetchGears = async () => {
      const { data, error } = await supabase.from('gears').select('*').eq('status', 'Available');
      if (!error) {
        setAvailableGears(data || []);
      }
    };

    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, role')
          .order('full_name');

        if (error) {
          throw error;
        }

        setAvailableUsers(data || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchGears();
    fetchUsers();

    const channel = supabase
      .channel('public:gears')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gears' }, fetchGears)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const onSubmit = async (data: RequestFormValues) => {
    setIsLoading(true);
    console.log("Gear request submitted:", data);

    if (!userId) {
      toast({
        title: "Error",
        description: "User not authenticated. Please log in again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
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

      // Get gear names for notification
      const selectedGearNames = availableGears
        .filter(gear => data.selectedGears.includes(gear.id))
        .map(gear => gear.name);

      // Send Google Chat notification
      await fetch('/api/notifications/google-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'USER_REQUEST',
          payload: {
            userName: userProfile?.full_name || 'Unknown User',
            userEmail: userProfile?.email || 'Unknown Email',
            gearNames: selectedGearNames,
            reason: data.reason,
            destination: data.destination,
            duration: data.duration,
          }
        })
      });

      toast({
        title: "Request Submitted",
        description: "Your gear request has been sent for approval.",
      });

      form.reset({
        selectedGears: preselectedGearId ? [preselectedGearId] : [],
        reason: "",
        destination: "",
        duration: "",
        teamMembers: [],
        conditionConfirmed: false,
      });

      if (userId) {
        await createSystemNotification(
          userId,
          'Request Submitted',
          'Your gear request has been sent for approval.'
        );
      }

      clearRequestDraft();
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter gears based on search term
  const filteredGears = useMemo(() => availableGears.filter(gear =>
    gear.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gear.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (gear.description && gear.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [availableGears, searchTerm]);

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

