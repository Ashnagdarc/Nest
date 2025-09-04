"use client";

import { useEffect, useState } from "react";
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
import { DialogFooter, DialogClose } from "@/components/ui/dialog";
import Image from "next/image";
import { isFileList, isFile } from "@/lib/utils/browser-safe";

const gearSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    category: z.string({ required_error: "Please select a category." }),
    description: z.string().optional().nullable(),
    serial_number: z.string().min(1, { message: "Serial number is required." }),
    status: z.enum(["Available", "Damaged", "Under Repair", "New", "Checked Out", "Partially Checked Out"], {
        required_error: "Please select a status.",
    }),
    purchase_date: z.string().optional().nullable(),
    condition: z.string().optional().nullable(),
    image_url: z.unknown().optional().transform(val => {
        if (isFileList(val) && val.length > 0) return val[0];
        if (isFile(val)) return val;
        return undefined;
    }),
    quantity: z.coerce.number().int().min(1, { message: "Quantity must be at least 1." }).default(1),
});

type GearFormValues = z.infer<typeof gearSchema>;

interface EditGearFormProps {
    gear: {
        id?: string;
        name?: string;
        category?: string;
        description?: string | null;
        serial_number?: string;
        status?: string;
        purchase_date?: string | null;
        condition?: string | null;
        image_url?: string | null;
        quantity?: number;
    };
    onSubmit: (data: GearFormValues) => void;
    isSubmitting: boolean;
}

export default function EditGearForm({ gear, onSubmit, isSubmitting }: EditGearFormProps) {
    // Debug: EditGearForm received gear
    const [imagePreview, setImagePreview] = useState<string | null>(gear?.image_url || null);
    const LOCAL_STORAGE_KEY = gear?.id ? `edit-gear-form-draft-${gear.id}` : undefined;

    const form = useForm<GearFormValues>({
        resolver: zodResolver(gearSchema),
        defaultValues: {
            name: gear?.name || "",
            category: gear?.category || "",
            description: gear?.description || "",
            serial_number: gear?.serial_number || gear?.serial || "",
            status: gear?.status || "Available",
            purchase_date: gear?.purchase_date || "",
            condition: gear?.condition || "",
            quantity: gear?.quantity || 1,
        },
    });

    // Restore draft from localStorage on mount
    useEffect(() => {
        if (!LOCAL_STORAGE_KEY) return;
        const draft = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (draft) {
            try {
                const values = JSON.parse(draft);
                form.reset({ ...form.getValues(), ...values });
            } catch { /* ignore parse errors */ }
        }
    }, [form, LOCAL_STORAGE_KEY]);

    // Save form state to localStorage on change
    useEffect(() => {
        if (!LOCAL_STORAGE_KEY) return;
        const subscription = form.watch((values) => {
            // Don't persist File objects (image_url)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { image_url, ...rest } = values;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rest));
        });
        return () => subscription.unsubscribe();
    }, [form, LOCAL_STORAGE_KEY]);

    // Clear draft on submit or cancel
    const clearDraft = () => {
        if (LOCAL_STORAGE_KEY) localStorage.removeItem(LOCAL_STORAGE_KEY);
    };

    // Update form when gear changes
    useEffect(() => {
        if (gear) {
            // Debug: Resetting form with gear data
            form.reset({
                name: gear.name || "",
                category: gear.category || "",
                description: gear.description || "",
                serial_number: gear.serial_number || gear.serial || "",
                status: gear.status || "Available",
                purchase_date: gear.purchase_date || "",
                condition: gear.condition || "",
                image_url: undefined,
                quantity: gear.quantity || 1,
            });
            setImagePreview(gear.image_url || null);
        }
    }, [gear, form]);

    // Preview the selected image
    const handleImageChange = (files: FileList | null) => {
        if (files && files.length > 0) {
            // Update the form with the first file from the FileList
            const file = files[0];
            form.setValue("image_url", file);

            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFormSubmit = (data: GearFormValues) => {
        // Debug: Form submitted with values
        onSubmit(data);
        clearDraft();
    };

    return (
        <Form {...form}>
            <div className="max-h-[100dvh] overflow-y-auto px-1 pb-32 sm:pb-8">
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter gear name..." {...field} />
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
                                        <SelectItem value="Gimbal">Gimbal</SelectItem>
                                        <SelectItem value="Computer">Computer</SelectItem>
                                        <SelectItem value="Microphone">Microphone</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                        <SelectItem value="Cars">Cars</SelectItem>
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
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Enter gear description..."
                                        {...field}
                                        value={field.value || ""}
                                    />
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
                                    <Input
                                        placeholder="Enter serial number..."
                                        {...field}
                                        value={field.value || ""}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Available">Available</SelectItem>
                                        <SelectItem value="Damaged">Damaged</SelectItem>
                                        <SelectItem value="Under Repair">Under Repair</SelectItem>
                                        <SelectItem value="New">New</SelectItem>
                                        <SelectItem value="Checked Out">Checked Out</SelectItem>
                                        <SelectItem value="Partially Checked Out">Partially Checked Out</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="condition"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Condition</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Enter gear condition..."
                                        {...field}
                                        value={field.value || ""}
                                    />
                                </FormControl>
                                <FormDescription>Describe the current physical condition of the gear.</FormDescription>
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

                    <div className="space-y-2">
                        <FormLabel>Gear Image</FormLabel>
                        {imagePreview && (
                            <div className="mb-2">
                                <Image
                                    src={imagePreview}
                                    alt="Gear preview"
                                    width={100}
                                    height={100}
                                    className="rounded-md object-cover"
                                    unoptimized
                                />
                            </div>
                        )}
                        <FormField
                            control={form.control}
                            name="image_url"
                            render={() => (
                                <FormItem>
                                    <FormControl>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(event) => handleImageChange(event.target.files)}
                                            className="cursor-pointer"
                                        />
                                    </FormControl>
                                    <FormDescription>Upload a new image of the gear (JPG, PNG).</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <DialogClose asChild>
                            <Button type="button" variant="outline" onClick={clearDraft}>
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </div>
        </Form>
    );
}