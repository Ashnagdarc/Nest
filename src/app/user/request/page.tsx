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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // If needed for duration
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Send } from 'lucide-react'; // Changed icon to Send
import { createSystemNotification } from '@/lib/notifications';
import { createClient } from '@/lib/supabase/client';

const requestSchema = z.object({
  selectedGears: z.array(z.string()).min(1, { message: "Please select at least one gear item." }),
  reason: z.string().min(5, { message: "Please provide a brief reason (min. 5 characters)." }),
  destination: z.string().min(3, { message: "Destination is required (min. 3 characters)." }),
  duration: z.string().min(1, { message: "Duration is required." }), // Or use a date picker range
  teamMembers: z.string().optional(),
  conditionConfirmed: z.boolean().refine(val => val === true, { message: 'You must confirm the gear condition.' }),
});

type RequestFormValues = z.infer<typeof requestSchema>;

export default function RequestGearPage() {
  const searchParams = useSearchParams();
  const preselectedGearId = searchParams.get('gearId');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [availableGears, setAvailableGears] = useState<any[]>([]);
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      selectedGears: preselectedGearId ? [preselectedGearId] : [],
      reason: "",
      destination: "",
      duration: "",
      teamMembers: "",
      conditionConfirmed: false,
    },
  });

  // Effect to update form default value if preselectedGearId changes
  useEffect(() => {
    if (preselectedGearId) {
      form.reset({ ...form.getValues(), selectedGears: [preselectedGearId] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedGearId, form.reset]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) setUserId(user.id);
    });
  }, [supabase]);

  useEffect(() => {
    const fetchGears = async () => {
      const { data, error } = await supabase.from('gears').select('*').eq('status', 'Available');
      if (!error) setAvailableGears(data || []);
    };
    fetchGears();
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

    // TODO: Implement actual API call to submit the request
    // Associate with the logged-in user

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: "Request Submitted",
      description: "Your gear request has been sent for approval.",
      variant: "success", // Use success variant
    });

    form.reset({ // Reset form, keeping preselection if it exists
      selectedGears: preselectedGearId ? [preselectedGearId] : [],
      reason: "",
      destination: "",
      duration: "",
      teamMembers: "",
      conditionConfirmed: false,
    });
    // Maybe redirect to 'My Requests' page? router.push('/user/my-requests');
    setIsLoading(false);

    if (userId) {
      await createSystemNotification(
        userId,
        'Request Submitted',
        'Your gear request has been sent for approval.'
      );
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Gear Selection Column */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="md:col-span-1"
          >
            <Card>
              <CardHeader>
                <CardTitle>Select Gear</CardTitle>
                <CardDescription>Choose one or more available items.</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="selectedGears"
                  render={({ field }) => (
                    <FormItem>
                      <ScrollArea className="h-[30rem] w-full rounded-md border p-4"> {/* Increased height */}
                        {availableGears.map((gear) => (
                          <FormField
                            key={gear.id}
                            control={form.control}
                            name="selectedGears"
                            render={({ field: checkboxField }) => { // Renamed inner field
                              return (
                                <FormItem
                                  key={gear.id}
                                  className="flex flex-row items-start space-x-3 space-y-0 mb-4"
                                >
                                  <FormControl>
                                    <Checkbox
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
                                    <Image src={gear.imageUrl} alt={gear.name} width={24} height={24} className="rounded-sm" data-ai-hint={`${gear.category} item`} />
                                    {gear.name} <span className="text-xs text-muted-foreground">({gear.category})</span>
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
            className="md:col-span-2 space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle>Request Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Use</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Client photoshoot, internal training, event coverage..." {...field} />
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
                        <Input placeholder="e.g., Studio B, Client Office, Site Alpha" {...field} />
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
                      <FormLabel>Expected Duration</FormLabel>
                      <FormControl>
                        {/* Consider using react-day-picker for date range */}
                        <Input placeholder="e.g., 2 days, 4 hours, Until Friday EOD" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="teamMembers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Members <span className="text-muted-foreground">(Optional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., John Doe, Jane Smith" {...field} />
                      </FormControl>
                      <FormDescription>List others who might use the gear during this request.</FormDescription>
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
                  <CardTitle>Confirm Gear Condition</CardTitle>
                  <CardDescription>Review the current condition of the selected gear.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedGearDetails.map(gear => (
                    <div key={gear.id} className="text-sm p-2 border rounded-md bg-muted/50">
                      <strong>{gear.name}:</strong> <span className="text-muted-foreground">{gear.condition}</span>
                    </div>
                  ))}
                  <FormField
                    control={form.control}
                    name="conditionConfirmed"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-4">
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


            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              whileTap={{ scale: 0.98 }} // Added tap animation
              className="flex justify-end pt-4" // Align button to the right
            >
              <Button type="submit" disabled={isLoading || form.watch("selectedGears").length === 0}>
                <Send className="mr-2 h-4 w-4" /> {/* Changed icon */}
                {isLoading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </motion.div>
          </motion.div>

        </form>
      </Form>
    </motion.div>
  );
}

