"use client";

import { useState, useEffect } from 'react';
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
import { Send, Users, Clock, Tag } from 'lucide-react';
import { createSystemNotification } from '@/lib/notifications';
import { createClient } from '@/lib/supabase/client';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';

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
  const [availableGears, setAvailableGears] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const supabase = createClient();
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
  }, [form]);

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
  const filteredGears = availableGears.filter(gear =>
    gear.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gear.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (gear.brand && gear.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (gear.model && gear.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (gear.description && gear.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedGearDetails = availableGears.filter(gear =>
    form.watch("selectedGears").includes(gear.id)
  );

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Request Gear</h1>
        <p className="text-muted-foreground">
          Select equipment and provide details for your gear request.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

          {/* Equipment Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Equipment</CardTitle>
              <CardDescription>Choose the gear you need for your request</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Input
                    placeholder="Search gears by name, category, brand, or model..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              <FormField
                control={form.control}
                name="selectedGears"
                render={({ field }) => (
                  <FormItem>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {filteredGears.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            {searchTerm ? `No gears found matching "${searchTerm}"` : 'No available equipment found'}
                          </div>
                        ) : (
                          filteredGears.map((gear) => (
                            <FormField
                              key={gear.id}
                              control={form.control}
                              name="selectedGears"
                              render={({ field: checkboxField }) => {
                                const isSelected = checkboxField.value?.includes(gear.id);
                                return (
                                  <Card className={`cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                                    <CardContent className="p-4">
                                      <div
                                        onClick={() => {
                                          const checked = !isSelected;
                                          return checked
                                            ? checkboxField.onChange([...checkboxField.value, gear.id])
                                            : checkboxField.onChange(
                                              checkboxField.value?.filter((value) => value !== gear.id)
                                            );
                                        }}
                                        className="flex items-center gap-4"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={isSelected}
                                            className="h-5 w-5"
                                          />
                                        </FormControl>

                                        <div className="w-16 h-16 rounded border overflow-hidden bg-muted">
                                          <Image
                                            src={gear.image_url || '/images/placeholder-gear.svg'}
                                            alt={gear.name}
                                            width={64}
                                            height={64}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>

                                        <div className="flex-1">
                                          <h4 className="font-medium">{gear.name}</h4>
                                          <p className="text-sm text-muted-foreground">{gear.category}</p>
                                          <div className="flex gap-2 mt-1">
                                            <Badge variant="secondary" className="text-xs">
                                              {gear.status}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                              {gear.condition}
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              }}
                            />
                          ))
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
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
              <CardDescription>Provide information about your request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Reason for Use */}
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Use</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-2 md:grid-cols-3 gap-3"
                      >
                        {reasonOptions.map((reason) => (
                          <FormItem key={reason} className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem
                                value={reason}
                                id={`reason-${reason}`}
                                className="peer sr-only"
                              />
                            </FormControl>
                            <FormLabel
                              htmlFor={`reason-${reason}`}
                              className="flex-1 p-3 border rounded-lg cursor-pointer text-center text-sm peer-checked:border-primary peer-checked:bg-primary/10"
                            >
                              {reason}
                            </FormLabel>
                          </FormItem>
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
                    <FormLabel>Destination / Location</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Studio B, Client Office, Site Alpha"
                        {...field}
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
                    <FormLabel>Expected Duration</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
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
                    <FormLabel>Team Members (Optional)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange([...field.value, value])}
                      value=""
                    >
                      <FormControl>
                        <SelectTrigger>
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
                    <FormDescription>Select team members who might use the gear during this request.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Condition Confirmation */}
          {selectedGearDetails.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Confirm Equipment Condition</CardTitle>
                <CardDescription>Review the condition of selected gear</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedGearDetails.map(gear => (
                  <div key={gear.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded border overflow-hidden bg-muted">
                          <Image
                            src={gear.image_url || '/images/placeholder-gear.svg'}
                            alt={gear.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{gear.name}</h4>
                          <p className="text-xs text-muted-foreground">{gear.category}</p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {gear.condition}
                      </Badge>
                    </div>
                  </div>
                ))}

                <FormField
                  control={form.control}
                  name="conditionConfirmed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer">
                          I acknowledge the current condition of the selected gear.
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
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={form.watch("selectedGears").length === 0 || isLoading}
              className="px-8"
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
          </div>
        </form>
      </Form>
    </div>
  );
}

