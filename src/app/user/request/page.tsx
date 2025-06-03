"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { motion } from 'framer-motion';
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
        // Add imageUrl mapping to handle both image_url and fallback
        const mappedData = (data || []).map((gear: any) => ({
          ...gear,
          imageUrl: gear.imageUrl || gear.image_url || '/images/placeholder-gear.svg' // Use SVG fallback image
        }));
        setAvailableGears(mappedData);
      }
    };

    const fetchUsers = async () => {
      try {
        // Fetch profiles from Supabase
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

    // Optionally, subscribe to real-time updates
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
      // Log data we're submitting
      console.log("Submitting with data:", {
        user_id: userId,
        gear_ids: data.selectedGears,
        reason: data.reason,
        destination: data.destination,
        expected_duration: data.duration,
        team_members: data.teamMembers.length ? data.teamMembers.join(',') : null,
        status: 'Pending'
      });

      // Create the request in Supabase - using the correct table name and schema
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
        console.error("Supabase error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
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
      await notifyGoogleChat(NotificationEventType.USER_REQUEST, {
        userName: userProfile?.full_name || 'Unknown User',
        userEmail: userProfile?.email || 'Unknown Email',
        gearNames: selectedGearNames,
        reason: data.reason,
        destination: data.destination,
        duration: data.duration,
      });

      toast({
        title: "Request Submitted",
        description: "Your gear request has been sent for approval.",
        variant: "success",
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
      console.error('Error submitting request:', error.message || error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: error.message || "Failed to submit your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedGearDetails = availableGears.filter(gear =>
    form.watch("selectedGears").includes(gear.id)
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <h1 className="text-3xl font-bold text-foreground">Request Gear</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">

          {/* Gear Selection Column */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="md:col-span-1"
          >
            <Card className="w-full max-w-full">
              <CardHeader className="py-3 px-2 md:p-6">
                <CardTitle>Select Gear</CardTitle>
                <CardDescription>Choose one or more available items.</CardDescription>
              </CardHeader>
              <CardContent className="py-3 px-2 md:p-6">
                <FormField
                  control={form.control}
                  name="selectedGears"
                  render={({ field }) => (
                    <FormItem>
                      <ScrollArea className="h-[24rem] w-full rounded-md border p-2 md:p-4">
                        {availableGears.map((gear) => (
                          <FormField
                            key={gear.id}
                            control={form.control}
                            name="selectedGears"
                            render={({ field: checkboxField }) => {
                              return (
                                <FormItem
                                  key={gear.id}
                                  className="flex flex-row items-center space-x-3 space-y-0 mb-3"
                                >
                                  <FormControl>
                                    <Checkbox
                                      className="h-6 w-6"
                                      checked={checkboxField.value?.includes(gear.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? checkboxField.onChange([...checkboxField.value, gear.id])
                                          : checkboxField.onChange(
                                            checkboxField.value?.filter(
                                              (value) => value !== gear.id
                                            )
                                          )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal flex items-center gap-2 cursor-pointer">
                                    <Image
                                      src={(gear.imageUrl || gear.image_url) ? (gear.imageUrl || gear.image_url) : '/images/placeholder-gear.svg'}
                                      alt={gear.name}
                                      width={28}
                                      height={28}
                                      className="rounded-sm h-7 w-7"
                                      data-ai-hint={`${gear.category} item`}
                                    />
                                    <span className="text-base">{gear.name}</span> <span className="text-xs text-muted-foreground">({gear.category})</span>
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </ScrollArea>
                      <FormMessage className="mt-2" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Request Details Column */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="md:col-span-2 space-y-3 md:space-y-4"
          >
            <Card className="w-full max-w-full">
              <CardHeader className="py-3 px-2 md:p-6">
                <CardTitle>Request Details</CardTitle>
              </CardHeader>
              <CardContent className="py-3 px-2 md:p-6 space-y-3 md:space-y-4">
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Tag className="h-4 w-4" /> Reason for Use
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2"
                        >
                          {reasonOptions.map((reason) => (
                            <FormItem key={reason} className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={reason} id={`reason-${reason}`} />
                              </FormControl>
                              <FormLabel htmlFor={`reason-${reason}`} className="font-normal cursor-pointer">
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

                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination / Location</FormLabel>
                      <FormControl>
                        <Input className="text-base" placeholder="e.g., Studio B, Client Office, Site Alpha" {...field} />
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
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Expected Duration
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-base">
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {durationOptions.map((duration) => (
                            <SelectItem key={duration} value={duration} className="text-base">
                              {duration}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="teamMembers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Users className="h-4 w-4" /> Team Members <span className="text-muted-foreground">(Optional)</span>
                      </FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange([...field.value, value])}
                        value=""
                      >
                        <FormControl>
                          <SelectTrigger className="text-base">
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
                                <SelectItem
                                  key={user.id}
                                  value={user.id}
                                  className="flex items-center text-base"
                                >
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
              <Card className="w-full max-w-full">
                <CardHeader className="py-3 px-2 md:p-6">
                  <CardTitle>Confirm Gear Condition</CardTitle>
                  <CardDescription>Review the current condition of the selected gear.</CardDescription>
                </CardHeader>
                <CardContent className="py-3 px-2 md:p-6 space-y-2">
                  {selectedGearDetails.map(gear => (
                    <div key={gear.id} className="text-sm p-2 border rounded-md bg-muted/50">
                      <strong>{gear.name}:</strong> <span className="text-muted-foreground">{gear.condition}</span>
                    </div>
                  ))}
                  <FormField
                    control={form.control}
                    name="conditionConfirmed"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-2 md:flex-row md:items-start md:space-x-3 md:space-y-0 pt-4">
                        <FormControl>
                          <Checkbox
                            className="h-6 w-6"
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

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              whileTap={{ scale: 0.98 }}
              className="flex justify-end pt-4"
            >
              <Button type="submit" loading={isLoading} disabled={form.watch("selectedGears").length === 0}>
                <Send className="mr-2 h-4 w-4" />
                Submit Request
              </Button>
            </motion.div>
          </motion.div>
        </form>
      </Form>
    </motion.div>
  );
}

