import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createSystemNotification } from "@/lib/notifications";
import type { ProcessedGear } from "@/components/check-in/types";

export type DamageLevel = "none" | "minor" | "major";

function conditionFromDamage(damage: DamageLevel): string {
  switch (damage) {
    case "major":
      return "Damaged";
    case "minor":
      return "Minor wear";
    case "none":
      return "Good";
    default: {
      const _exhaustive: never = damage;
      return _exhaustive;
    }
  }
}

interface SubmitParams {
  selectedGearIds: string[];
  quantities: Record<string, number>;
  checkedOutGears: ProcessedGear[];
  damage: DamageLevel;
  notes: string;
  onSuccess?: () => void;
}

export function useCheckInSubmit(
  toast: (params: { title: string; description?: string; variant?: "default" | "destructive" }) => void,
) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async ({
    selectedGearIds,
    quantities,
    checkedOutGears,
    damage,
    notes,
    onSuccess,
  }: SubmitParams) => {
    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user found");

      const userId = user.id;
      const condition = conditionFromDamage(damage);
      const trimmedNotes = notes.trim() || null;
      const damageNotes = damage === "major" ? trimmedNotes : null;

      const checkedInGearNames: string[] = [];
      const groupedSubmissionItems = new Map<
        string,
        Array<{ name: string; quantity: number; condition: string; notes?: string; damageNotes?: string }>
      >();

      for (const gearId of selectedGearIds) {
        const gear = checkedOutGears.find((g) => g.id === gearId);
        if (!gear) continue;

        const maxReturnable = Math.max(1, gear.returnable_quantity || 1);
        const returnQuantity = Math.max(1, Number(quantities[gearId] ?? maxReturnable));

        if (!Number.isFinite(returnQuantity) || returnQuantity < 1) {
          throw new Error(`Invalid return quantity for ${gear.name}`);
        }
        if (returnQuantity > maxReturnable) {
          throw new Error(`Return quantity for ${gear.name} exceeds outstanding amount.`);
        }

        checkedInGearNames.push(`${gear.name} (x${returnQuantity})`);
        const requestGroupKey = gear.current_request_id || "no-request";
        const requestItems = groupedSubmissionItems.get(requestGroupKey) || [];
        requestItems.push({
          name: gear.name,
          quantity: returnQuantity,
          condition,
          notes: trimmedNotes || undefined,
          damageNotes: damageNotes || undefined,
        });
        groupedSubmissionItems.set(requestGroupKey, requestItems);

        const { error: checkinError } = await supabase.from("checkins").insert({
          user_id: userId,
          gear_id: gearId,
          request_id: gear.current_request_id,
          action: "Check In",
          quantity: returnQuantity,
          status: "Pending Admin Approval",
          condition,
          damage_notes: damageNotes,
          notes: trimmedNotes,
        });

        if (checkinError) {
          throw new Error(`Failed to create check-in record: ${checkinError.message}`);
        }

        const { data: admins } = await supabase.from("profiles").select("id").eq("role", "Admin");
        if (admins) {
          for (const admin of admins) {
            await createSystemNotification(
              admin.id,
              "Pending Check-in",
              `New gear check-in pending approval for ${gear.name}.`,
            );
          }
        }
      }

      try {
        for (const [requestId, items] of groupedSubmissionItems.entries()) {
          if (items.length === 0) continue;
          await fetch("/api/checkins/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              requestId: requestId === "no-request" ? null : requestId,
              gearNames: items.map((item) => `${item.name} (x${item.quantity})`),
              items,
              condition,
              notes: trimmedNotes || undefined,
              damageNotes: damageNotes || undefined,
            }),
          });
        }
      } catch (emailError) {
        console.error("Failed to send check-in email notifications:", emailError);
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .single();

      await fetch("/api/notifications/google-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "USER_CHECKIN",
          payload: {
            userName: profileData?.full_name || "Unknown User",
            userEmail: profileData?.email || "Unknown Email",
            gearNames: checkedInGearNames,
            checkinDate: new Date().toLocaleString(),
            condition,
            notes: damageNotes || trimmedNotes,
          },
        }),
      });

      toast({
        title: "Check-in submitted",
        description: "Your return is pending admin approval. You can submit more returns anytime.",
      });

      onSuccess?.();
    } catch (error) {
      console.error("Error during check-in:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit check-in. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting };
}
