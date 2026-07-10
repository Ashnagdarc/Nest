// Equipment request page for Nest by Eden Oasis. Handles multi-select requests, validation, and real-time updates.

"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, User, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiGet } from "@/lib/apiClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { GearPickerList } from "@/components/request/GearPickerList";
import { UserPicker } from "@/components/request/UserPicker";
import { ReasonChips } from "@/components/request/ReasonChips";
import { SelectedGearReview } from "@/components/request/SelectedGearReview";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "Admin" | "User";
  department: string | null;
  avatar_url: string | null;
  status: "Active" | "Inactive" | "Suspended";
  phone: string | null;
  location: string | null;
  employee_id: string | null;
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
  is_banned: boolean;
};

type SelectableUser = Pick<Profile, "id" | "full_name" | "email" | "role">;

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

const reasonOptions = [
  "Youtube Shoot",
  "Event Shoot",
  "Site Update Shoot",
  "Off Plan Shoot",
  "Finished House Shoot",
  "Allocation Shoot",
  "Personal",
  "Home",
  "Site",
  "Out of State",
  "Out of country",
  "Other",
];

const durationOptions = [
  "24hours",
  "48hours",
  "72hours",
  "1 week",
  "2 weeks",
  "Month",
  "1year",
];

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
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }
};

const requestSchema = z
  .object({
    selectedGears: z
      .array(z.string())
      .min(1, { message: "Please select at least one gear item." }),
    quantities: z
      .record(z.string(), z.number().int().min(1).max(50))
      .default({}),
    reason: z.string().min(1, { message: "Please select a reason for use." }),
    otherReason: z.string().optional(),
    bookForUserId: z.string().optional(),
    destination: z
      .string()
      .min(3, { message: "Destination is required (min. 3 characters)." }),
    duration: z.string().min(1, { message: "Please select a duration." }),
    teamMembers: z.array(z.string()).optional().default([]),
    conditionConfirmed: z
      .boolean()
      .refine((val) => val === true, {
        message: "You must confirm the gear condition.",
      }),
  })
  .refine(
    (data) => {
      if (
        data.reason === "Other" &&
        (!data.otherReason || data.otherReason.trim().length === 0)
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Please specify your reason",
      path: ["otherReason"],
    },
  );

/**
 * Request Form Values Type
 *
 * TypeScript type definition derived from the Zod schema
 * for type-safe form handling and validation.
 */
type RequestFormValues = z.infer<typeof requestSchema>;

const REQUEST_FORM_DRAFT_KEY = "user-request-gear-form-draft";
const createClientSubmissionId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const buildRequestDraftKey = (userId: string) => `${REQUEST_FORM_DRAFT_KEY}:${userId}`;

function RequestGearContent() {
  const searchParams = useSearchParams();
  const preselectedGearId = searchParams.get("gearId");
  const router = useRouter();
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(false);
  const [bookingType, setBookingType] = useState<"self" | "other" | null>(null);
  const [availableGears, setAvailableGears] = useState<Gear[]>([]);
  const [availableUsers, setAvailableUsers] = useState<SelectableUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [clientSubmissionId, setClientSubmissionId] = useState(createClientSubmissionId);
  const [isGearsLoaded, setIsGearsLoaded] = useState(false);
  const [restoredDraftForUserId, setRestoredDraftForUserId] = useState<string | null>(null);

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
      otherReason: "",
      bookForUserId: "",
      destination: "",
      duration: "",
      teamMembers: [],
      conditionConfirmed: false,
    },
  });

  const getAvailableUnitsByName = (targetName?: string) => {
    if (!targetName) return 0;
    const norm = targetName.toLowerCase().trim();
    return availableGears
      .filter((x) => (x.name || "").toLowerCase().trim() === norm)
      .reduce((sum, x) => sum + (x.available_quantity || 0), 0);
  };

  const availableGearIds = useMemo(
    () => new Set(availableGears.map((gear) => gear.id)),
    [availableGears],
  );

  const availableGearMap = useMemo(
    () => new Map(availableGears.map((gear) => [gear.id, gear] as const)),
    [availableGears],
  );

  /**
   * Draft Persistence Effect
   *
   * Automatically saves form state to localStorage whenever
   * form values change to prevent data loss.
   */
  useEffect(() => {
    if (!userId || !isGearsLoaded || restoredDraftForUserId === userId) return;

    const scopedDraftKey = buildRequestDraftKey(userId);
    const draft = localStorage.getItem(scopedDraftKey);

    if (!draft) {
      setRestoredDraftForUserId(userId);
      return;
    }

    try {
      const values = JSON.parse(draft) as Partial<RequestFormValues> & {
        selectedGears?: string[];
        quantities?: Record<string, number>;
      };
      const selectedGears = Array.isArray(values.selectedGears)
        ? values.selectedGears
        : [];
      const removedGearIds = selectedGears.filter(
        (gearId) => !availableGearIds.has(gearId),
      );
      const cleanedSelectedGears = selectedGears.filter((gearId) =>
        availableGearIds.has(gearId),
      );
      const cleanedQuantities = Object.fromEntries(
        Object.entries(values.quantities || {}).filter(([gearId]) =>
          cleanedSelectedGears.includes(gearId),
        ),
      );
      const cleanedValues = {
        ...form.getValues(),
        ...values,
        selectedGears: cleanedSelectedGears,
        quantities: cleanedQuantities,
      };
      form.reset(cleanedValues);
      // Always rotate the submission key when restoring a draft so a stale
      // successful request cannot be mistaken for a brand-new booking.
      const nextSubmissionId = createClientSubmissionId();
      setClientSubmissionId(nextSubmissionId);
      localStorage.setItem(
        scopedDraftKey,
        JSON.stringify({
          ...cleanedValues,
          clientSubmissionId: nextSubmissionId,
        }),
      );

      if (removedGearIds.length > 0) {
        const removedLabels = removedGearIds.map(
          (gearId) => availableGearMap.get(gearId)?.name ?? gearId,
        );
        toast({
          title: "Saved draft updated",
          description: `${removedLabels.join(", ")} ${removedLabels.length === 1 ? "was" : "were"} removed because it is no longer selectable.`,
          variant: "destructive",
        });
      }
      setRestoredDraftForUserId(userId);
    } catch (error) {
      console.warn("Failed to restore form draft:", error);
      setRestoredDraftForUserId(userId);
    }
  }, [availableGearIds, availableGearMap, form, isGearsLoaded, restoredDraftForUserId, toast, userId]);

  useEffect(() => {
    if (!userId) return;

    const scopedDraftKey = buildRequestDraftKey(userId);
    const subscription = form.watch((value) => {
      localStorage.setItem(
        scopedDraftKey,
        JSON.stringify({
          ...value,
          clientSubmissionId,
        }),
      );
    });
    return () => subscription.unsubscribe();
  }, [clientSubmissionId, form, userId]);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.id) setUserId(user.id);
      } catch (error) {
        console.error("Failed to get current user:", error);
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
        const { data, error } = await apiGet<{
          data: Gear[];
          error: string | null;
        }>(`/api/gears/available`);
        if (error) {
          console.error("Error fetching gears:", error);
          toast({
            title: "Error loading equipment",
            description:
              "Failed to load available equipment. Please refresh the page.",
            variant: "destructive",
          });
        } else {
          setAvailableGears(data || []);
        }
      } catch (error) {
        console.error("Exception fetching gears:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred while loading equipment.",
          variant: "destructive",
        });
      } finally {
        setIsGearsLoaded(true);
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
          .from("profiles")
          .select("id, email, full_name, role")
          .eq("status", "Active")
          .is("deleted_at", null)
          .order("full_name");
        if (!error) {
          setAvailableUsers((data || []) as SelectableUser[]);
        }
      } catch (error) {
        console.error("Exception fetching users:", error);
      }
    };

    // Initial data loading
    fetchGears();
    fetchUsers();

    const channel = supabase
      .channel("public:gears")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gears" },
        () => {
          fetchGears();
        },
      )
      .subscribe();
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
    if (!userId) {
      toast({
        title: "Authentication Error",
        description: "User not authenticated.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const selectedGearIds = Array.from(new Set(data.selectedGears));
      const missingGearIds = selectedGearIds.filter(
        (gearId) => !availableGearMap.has(gearId),
      );
      if (missingGearIds.length > 0) {
        const removedLabels = missingGearIds.map(
          (gearId) => availableGearMap.get(gearId)?.name ?? gearId,
        );
        form.setValue(
          "selectedGears",
          selectedGearIds.filter((gearId) => availableGearMap.has(gearId)),
          { shouldValidate: true, shouldDirty: true },
        );
        form.setValue(
          "quantities",
          Object.fromEntries(
            Object.entries(data.quantities || {}).filter(([gearId]) =>
              availableGearMap.has(gearId),
            ),
          ),
          { shouldValidate: true, shouldDirty: true },
        );
        toast({
          title: "Unavailable items removed",
          description: `${removedLabels.join(", ")} ${removedLabels.length === 1 ? "is" : "are"} no longer selectable. Please review your request and submit again.`,
          variant: "destructive",
        });
        return;
      }

      const byIdQuantity = data.quantities || {};
      for (const gearId of selectedGearIds) {
        const qty = byIdQuantity[gearId] ?? 1;
        const anchor = availableGearMap.get(gearId);
        if (!anchor) {
          toast({
            title: "Unavailable items removed",
            description: "One or more selected items are no longer selectable. Please review your request and try again.",
            variant: "destructive",
          });
          return;
        }
        const availableForName = getAvailableUnitsByName(anchor.name);
        if (qty > Math.max(1, availableForName)) {
          setIsLoading(false);
          toast({
            title: "Not enough available units",
            description: `Requested ${qty} × ${anchor.name}, but only ${availableForName} available.`,
            variant: "destructive",
          });
          return;
        }
      }

      if (bookingType === "other" && !data.bookForUserId) {
        toast({
          title: "Select a person",
          description: "Choose who you are booking equipment for before submitting.",
          variant: "destructive",
        });
        return;
      }

      const finalReason =
        data.reason === "Other" ? data.otherReason : data.reason;

      const bookedForUserId =
        bookingType === "other" ? data.bookForUserId : userId;

      const requestPayload = {
        booked_for_user_id: bookedForUserId || userId || "",
        reason: finalReason || "",
        destination: data.destination || "",
        expected_duration: data.duration || "",
        due_date: calculateDueDate(data.duration || ""),
        team_members: data.teamMembers.length
          ? data.teamMembers.join(",")
          : null,
        status: "Pending",
        client_submission_id: clientSubmissionId,
        gear_request_gears: selectedGearIds.map((gearId) => ({
          gear_id: gearId,
          quantity:
            data.quantities && typeof data.quantities[gearId] === "number"
              ? data.quantities[gearId]
              : 1,
        })),
      };

      const requestResp = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });
      const requestJson = await requestResp.json().catch(() => null);
      if (!requestResp.ok || requestJson?.error) {
        if (requestJson?.correlation_id) {
          console.error(
            "[Gear Request Submit] correlation_id:",
            requestJson.correlation_id,
          );
        }
        throw new Error(
          requestJson?.user_message ||
            requestJson?.error ||
            "We could not complete your request right now. Please try again.",
        );
      }

      const requestId = (requestJson?.booking?.id || requestJson?.data?.id) as
        | string
        | undefined;
      const isDuplicateSubmission =
        requestJson?.user_message === "Request already submitted." ||
        (Array.isArray(requestJson?.warnings) &&
          requestJson.warnings.some(
            (warning: unknown) =>
              typeof warning === "string" &&
              warning.toLowerCase().includes("duplicate submission"),
          ));

      form.reset();
      if (userId) {
        localStorage.removeItem(buildRequestDraftKey(userId));
      }
      setClientSubmissionId(createClientSubmissionId());

      if (isDuplicateSubmission) {
        toast({
          title: "Request already submitted",
          description:
            "We found an earlier submission with the same request key, so no second booking was created.",
        });
        router.push(requestId ? `/user/my-requests?id=${requestId}` : "/user/my-requests");
        return;
      }

      const gearNames = availableGears
        .filter((g) => data.selectedGears.includes(g.id))
        .map((g) => g.name)
        .join(", ");

      const bookedForUser =
        bookingType === "other" && data.bookForUserId
          ? availableUsers.find((u) => u.id === data.bookForUserId) ?? null
          : null;
      const bookedForDisplay =
        bookedForUser?.full_name || bookedForUser?.email || "the selected person";

      toast({
        title: "Request Submitted Successfully",
        description:
          bookingType === "other"
            ? `Equipment request for ${bookedForDisplay} has been submitted. They will be notified by email and push.`
            : `Your request for ${gearNames} has been submitted.`,
      });
      router.push("/user/my-requests");
    } catch (error) {
      console.error("Error submitting request:", error);
      toast({
        title: "Submission Failed",
        description:
          error instanceof Error
            ? error.message
            : "We could not complete your request right now. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGears = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return availableGears.filter(
      (gear) =>
        gear.name?.toLowerCase().includes(term) ||
        gear.category?.toLowerCase().includes(term) ||
        gear.serial_number?.toLowerCase().includes(term),
    );
  }, [availableGears, searchTerm]);

  const selectedGears = form.watch("selectedGears") || [];
  const selectedGearItems = useMemo(
    () => availableGears.filter((gear) => selectedGears.includes(gear.id)),
    [availableGears, selectedGears],
  );

  const toggleGearSelection = (gearId: string) => {
    const current = form.getValues().selectedGears || [];
    const isSelected = current.includes(gearId);
    const updated = isSelected
      ? current.filter((id) => id !== gearId)
      : [...current, gearId];
    form.setValue("selectedGears", updated, { shouldValidate: true });
  };

  return (
    <div className="w-full min-h-screen">
      {/* Booking Type Selection Modal */}
      <Dialog open={bookingType === null}>
        <DialogContent className="max-w-md rounded-2xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-lg font-semibold">
              Who is this request for?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Choose whether you are booking for yourself or a colleague.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-3">
            <button
              type="button"
              onClick={() => setBookingType("self")}
              className="w-full flex items-center gap-4 rounded-xl border border-border p-4 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-sm">For myself</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  I will use this equipment
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setBookingType("other")}
              className="w-full flex items-center gap-4 rounded-xl border border-border p-4 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-sm">For someone else</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Book on behalf of a colleague — they will be notified
                </p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {bookingType && (
        <div className="w-full max-w-4xl mx-auto space-y-6">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Request Equipment
              </h1>
              <span className="rounded-full px-3 py-1 text-xs font-medium bg-muted text-muted-foreground">
                {bookingType === "self" ? "For myself" : "For someone else"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-muted-foreground text-sm sm:text-base">
                {bookingType === "self"
                  ? "Select equipment and add your project details."
                  : "Select equipment and choose who it is for. They will receive email and push notifications."}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setBookingType(null)}
              >
                Change
              </Button>
            </div>
          </header>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Card className="border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold">
                    Available Gear
                  </CardTitle>
                  <CardDescription>
                    {selectedGears.length > 0
                      ? `${selectedGears.length} item${selectedGears.length !== 1 ? "s" : ""} selected — tap to add or remove.`
                      : "Select the equipment you want to request."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, category, or serial..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="min-h-[44px] pl-10"
                    />
                  </div>

                  <GearPickerList
                    gears={filteredGears}
                    selectedIds={selectedGears}
                    onToggle={toggleGearSelection}
                  />
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold">
                    Request Details
                  </CardTitle>
                  <CardDescription>
                    Provide purpose and timeline for this request.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {bookingType === "other" && (
                    <div className="space-y-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">Booking for</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          They will receive an email and push notification about this booking.
                        </p>
                      </div>
                      <FormField
                        control={form.control}
                        name="bookForUserId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">
                              Select person <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <UserPicker
                                users={availableUsers}
                                excludeIds={userId ? [userId] : []}
                                mode="single"
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="Search colleagues by name or email..."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Reason for use <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <ReasonChips
                            options={reasonOptions}
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("reason") === "Other" && (
                    <FormField
                      control={form.control}
                      name="otherReason"
                      render={({ field }) => (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2">
                            <label className="block text-sm font-medium">
                              Please specify <span className="text-destructive">*</span>
                            </label>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Describe your use case..."
                                className="h-11"
                              />
                            </FormControl>
                            <FormMessage />
                          </div>
                        </motion.div>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="destination"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Destination / location{" "}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., Studio B, Client Office"
                              className="h-11"
                            />
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
                          <FormLabel className="text-sm font-medium">
                            Expected duration <span className="text-destructive">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select duration" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {durationOptions.map((d) => (
                                <SelectItem key={d} value={d}>
                                  {d}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="teamMembers"
                    render={({ field }) => (
                      <FormItem>
                        <div className="space-y-1">
                          <FormLabel className="text-sm font-medium">
                            Team members{" "}
                            <span className="font-normal text-muted-foreground">(optional)</span>
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Add colleagues who will be working with you on this shoot.
                          </p>
                        </div>
                        <FormControl>
                          <UserPicker
                            users={availableUsers}
                            excludeIds={[
                              ...(userId ? [userId] : []),
                              ...(bookingType === "other" && form.watch("bookForUserId")
                                ? [form.watch("bookForUserId") as string]
                                : []),
                              ...field.value,
                            ]}
                            mode="multi"
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Search and add team members..."
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {selectedGears.length > 0 && (
                <>
                  <SelectedGearReview
                    gears={selectedGearItems}
                    quantities={form.watch("quantities") || {}}
                    onQuantityChange={(gearId, quantity) =>
                      form.setValue(`quantities.${gearId}`, quantity, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    getMaxQuantity={getAvailableUnitsByName}
                  />

                  <FormField
                    control={form.control}
                    name="conditionConfirmed"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mt-0.5"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="cursor-pointer text-sm font-medium">
                            I confirm that I have reviewed the gear condition
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            You agree to return equipment in the same condition you received it.
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </>
              )}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/user/browse")}
                  className="h-11 px-6"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !isGearsLoaded || !selectedGears.length}
                  className="h-11 px-8 font-medium sm:ml-auto"
                >
                  {isLoading ? "Processing..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-transparent py-20 flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent animate-spin rounded-full" />
      <span className="text-muted-foreground font-medium">
        Loading equipment request...
      </span>
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
