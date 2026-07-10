"use client";

import { useEffect, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ImageIcon, Package } from "lucide-react";
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
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { isFileList } from "@/lib/utils/browser-safe";
import { gearCategoryOptions, getCategoryIcon } from "@/lib/utils/category";
import { cn } from "@/lib/utils";

const gearSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    category: z.string({ required_error: "Please select a category." }),
    description: z.string().optional(),
    serial_number: z.string().min(1, { message: "Serial number is required." }),
    purchase_date: z.string().optional(),
    condition: z.string().min(1, { message: "Condition is required." }),
    status: z.enum(["Available", "Damaged", "Under Repair", "New"], {
        required_error: "Please select an initial status.",
    }),
    image_url: z
        .unknown()
        .optional()
        .transform((val) => {
            if (isFileList(val) && val.length > 0) return val[0];
            return undefined;
        }),
    quantity: z.coerce.number().int().min(1, { message: "Quantity must be at least 1." }).default(1),
});

export type AddGearFormValues = z.infer<typeof gearSchema>;

interface AddGearFormProps {
    onSubmit: (data: AddGearFormValues) => void | Promise<void>;
    isSubmitting?: boolean;
}

const LOCAL_STORAGE_KEY = "add-gear-form-draft";

const STATUS_OPTIONS = [
    { value: "Available", label: "Available", hint: "Ready to book" },
    { value: "New", label: "New", hint: "Just added to inventory" },
    { value: "Damaged", label: "Damaged", hint: "Needs review" },
    { value: "Under Repair", label: "Under repair", hint: "Temporarily unavailable" },
] as const;

function FormSection({
    title,
    description,
    children,
    className,
}: {
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn("space-y-4", className)}>
            <div>
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
            </div>
            {children}
        </section>
    );
}

export default function AddGearForm({ onSubmit, isSubmitting = false }: AddGearFormProps) {
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const form = useForm<AddGearFormValues>({
        resolver: zodResolver(gearSchema),
        defaultValues: {
            name: "",
            category: "",
            description: "",
            serial_number: "",
            purchase_date: "",
            condition: "",
            status: "Available",
            image_url: undefined,
            quantity: 1,
        },
    });

    useEffect(() => {
        const draft = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!draft) return;
        try {
            const values = JSON.parse(draft) as Partial<AddGearFormValues>;
            form.reset({ ...form.getValues(), ...values });
        } catch {
            // ignore invalid draft
        }
    }, [form]);

    useEffect(() => {
        const subscription = form.watch((values) => {
            const { image_url: _image, ...rest } = values;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rest));
        });
        return () => subscription.unsubscribe();
    }, [form]);

    const clearDraft = () => localStorage.removeItem(LOCAL_STORAGE_KEY);

    const handleImageChange = (files: FileList | null) => {
        if (!files?.length) {
            form.setValue("image_url", undefined);
            setImagePreview(null);
            return;
        }

        const file = files[0];
        form.setValue("image_url", file);

        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleFormSubmit = async (data: AddGearFormValues) => {
        await onSubmit(data);
        form.reset({
            name: "",
            category: "",
            description: "",
            serial_number: "",
            purchase_date: "",
            condition: "",
            status: "Available",
            image_url: undefined,
            quantity: 1,
        });
        setImagePreview(null);
        clearDraft();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-8 overflow-y-auto px-6 py-5">
                    <FormSection title="Basics" description="What is this piece of equipment?">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className="sm:col-span-2">
                                        <FormLabel>Equipment name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Canon EOS R5" {...field} />
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
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {gearCategoryOptions.map(({ value, label }) => (
                                                    <SelectItem key={value} value={value}>
                                                        <span className="inline-flex items-center gap-2">
                                                            {getCategoryIcon(value, 16)}
                                                            {label}
                                                        </span>
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
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quantity</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={1} step={1} {...field} />
                                        </FormControl>
                                        <FormDescription>Units in stock for this item.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="sm:col-span-2">
                                        <FormLabel>
                                            Description <span className="font-normal text-muted-foreground">(optional)</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea
                                                rows={3}
                                                placeholder="Notes, specs, or location hints..."
                                                className="resize-none"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </FormSection>

                    <FormSection title="Identification" description="Tracking and condition when added.">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="serial_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Serial number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Unique identifier" className="font-mono text-sm" {...field} />
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
                                        <FormLabel>
                                            Purchase date <span className="font-normal text-muted-foreground">(optional)</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="condition"
                                render={({ field }) => (
                                    <FormItem className="sm:col-span-2">
                                        <FormLabel>Condition</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. New, Good, minor wear" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem className="sm:col-span-2">
                                        <FormLabel>Initial status</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {STATUS_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            {STATUS_OPTIONS.find((o) => o.value === field.value)?.hint ??
                                                "Sets availability when the record is created."}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </FormSection>

                    <FormSection title="Photo" description="Helps staff identify gear quickly.">
                        <FormField
                            control={form.control}
                            name="image_url"
                            render={() => (
                                <FormItem>
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                                            {imagePreview ? (
                                                <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <Package className="h-10 w-10 text-muted-foreground/50" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <FormLabel className="sr-only">Equipment photo</FormLabel>
                                            <FormControl>
                                                <label
                                                    className={cn(
                                                        "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 transition-colors",
                                                        "hover:border-primary/50 hover:bg-muted/40"
                                                    )}
                                                >
                                                    <ImageIcon className="mb-2 h-6 w-6 text-muted-foreground" />
                                                    <span className="text-sm font-medium">Upload image</span>
                                                    <span className="mt-1 text-xs text-muted-foreground">PNG or JPG</span>
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        className="sr-only"
                                                        onChange={(e) => handleImageChange(e.target.files)}
                                                    />
                                                </label>
                                            </FormControl>
                                            {imagePreview && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-xs"
                                                    onClick={() => handleImageChange(null)}
                                                >
                                                    Remove photo
                                                </Button>
                                            )}
                                            <FormDescription>Optional — you can add one later when editing.</FormDescription>
                                            <FormMessage />
                                        </div>
                                    </div>
                                </FormItem>
                            )}
                        />
                    </FormSection>
                </div>

                <DialogFooter className="shrink-0 gap-2 border-t bg-muted/20 px-6 py-4">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={clearDraft} disabled={isSubmitting}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
                        {isSubmitting ? "Adding…" : "Add equipment"}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
