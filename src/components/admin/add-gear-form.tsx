"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { DialogFooter, DialogClose } from "@/components/ui/dialog"; // Import for close button
import { isFileList } from "@/lib/utils/browser-safe";

const gearSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  category: z.string({ required_error: "Please select a category." }),
  description: z.string().optional(),
  serial_number: z.string().min(1, { message: "Serial number is required." }),
  purchase_date: z.string().optional(),
  initial_condition: z.string().min(1, { message: "Initial condition is required." }),
  status: z.enum(["Available", "Damaged", "Under Repair", "New"], {
    required_error: "Please select an initial status.",
  }),
  image_url: z.unknown().optional().transform(val => {
    if (isFileList(val) && val.length > 0) return val[0];
    return undefined;
  }),
  quantity: z.coerce.number().int().min(1, { message: "Quantity must be at least 1." }).default(1),
});

type GearFormValues = z.infer<typeof gearSchema>;

interface AddGearFormProps {
  onSubmit: (data: GearFormValues) => void; // Callback function
}

const LOCAL_STORAGE_KEY = "add-gear-form-draft";

export default function AddGearForm({ onSubmit }: AddGearFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<GearFormValues>({
    resolver: zodResolver(gearSchema),
    defaultValues: {
      name: "",
      category: undefined,
      description: "",
      serial_number: "",
      purchase_date: "",
      initial_condition: "",
      status: "Available",
      image_url: undefined,
      quantity: 1,
    },
  });

  // Restore draft from localStorage on mount
  useEffect(() => {
    const draft = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (draft) {
      try {
        const values = JSON.parse(draft);
        form.reset({ ...form.getValues(), ...values });
      } catch {
        // ignore parse errors
      }
    }
  }, [form]);

  // Save form state to localStorage on change
  useEffect(() => {
    const subscription = form.watch((values) => {
      // Don't persist File objects (image)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { image_url, ...rest } = values;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rest));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Clear draft on submit or cancel
  const clearDraft = () => localStorage.removeItem(LOCAL_STORAGE_KEY);

  const handleFormSubmit = async (data: GearFormValues) => {
    setIsLoading(true);
    // Debug: Form data submission

    // TODO: Add actual API call to save the gear data
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast({
      title: "Gear Added",
      description: `${data.name} has been added successfully.`,
    });
    onSubmit(data); // Now passes image_url as the file
    form.reset(); // Reset form after successful submission
    clearDraft();
    setIsLoading(false);
    // Modal should be closed by the parent component using the onOpenChange prop of Dialog
  };

  return (
    <Form {...form}>
      <div className="max-h-[100dvh] overflow-y-auto px-1 pb-32 sm:pb-8">
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gear Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Canon EOS R5" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Camera">Camera</SelectItem>
                    <SelectItem value="Lens">Lens</SelectItem>
                    <SelectItem value="Drone">Drone</SelectItem>
                    <SelectItem value="Audio">Audio</SelectItem>
                    <SelectItem value="Laptop">Laptop</SelectItem>
                    <SelectItem value="Monitor">Monitor</SelectItem>
                    <SelectItem value="Mouse">Mouse</SelectItem>
                    <SelectItem value="Batteries">Batteries</SelectItem>
                    <SelectItem value="Storage">Storage</SelectItem>
                    <SelectItem value="Cables">Cables</SelectItem>
                    <SelectItem value="Lighting">Lighting</SelectItem>
                    <SelectItem value="Tripod">Tripod</SelectItem>
                    <SelectItem value="Accessory">Accessory</SelectItem>
                    <SelectItem value="Cars">Cars</SelectItem>
                    {/* Add more categories */}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description <span className="text-muted-foreground">(Optional)</span></FormLabel>
                <FormControl>
                  <Textarea placeholder="Brief description of the gear..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="serial_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Serial Number</FormLabel>
                <FormControl>
                  <Input placeholder="Unique serial number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="purchase_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase Date <span className="text-muted-foreground">(Optional)</span></FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="initial_condition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Initial Condition</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., New, Good, Minor scratches" {...field} />
                </FormControl>
                <FormDescription>Describe the condition when added.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Initial Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select initial status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Damaged">Damaged</SelectItem>
                    <SelectItem value="Under Repair">Under Repair</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="image_url"
            render={({ field: { onChange } }) => (
              <FormItem>
                <FormLabel>Gear Image</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(event) => onChange(event.target.files)}
                    className="cursor-pointer"
                  />
                </FormControl>
                <FormDescription>Upload an image of the gear (JPG, PNG).</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input type="number" min={1} step={1} {...field} />
                </FormControl>
                <FormDescription>How many units of this gear do you have?</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={clearDraft}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={isLoading} disabled={isLoading}>
              Add Gear
            </Button>
          </DialogFooter>
        </form>
      </div>
    </Form>
  );
}
