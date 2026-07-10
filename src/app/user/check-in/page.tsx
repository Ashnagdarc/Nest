"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle, History, Loader2, PackageCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCheckedOutGears } from "@/hooks/check-in/useCheckedOutGears";
import { useCheckInHistory } from "@/hooks/check-in/useCheckInHistory";
import { useCheckInSubmit, type DamageLevel } from "@/hooks/check-in/useCheckInSubmit";
import { createClient } from "@/lib/supabase/client";
import { BookingReturnCard } from "@/components/check-in/BookingReturnCard";
import { CheckInEmptyState } from "@/components/check-in/CheckInEmptyState";
import { CheckInHeader } from "@/components/check-in/CheckInHeader";
import { CheckInHistoryList } from "@/components/check-in/CheckInHistoryList";
import { PendingReturnsBanner } from "@/components/check-in/PendingReturnsBanner";
import { QrScannerDialog } from "@/components/check-in/QrScannerDialog";
import { ReturnDetailsStep } from "@/components/check-in/ReturnDetailsStep";
import { ReturnReviewStep } from "@/components/check-in/ReturnReviewStep";
import { ReturnStepIndicator } from "@/components/check-in/ReturnStepIndicator";
import {
  groupCheckedOutGears,
  isOverdue,
  matchGearByScanCode,
  type GearReturnGroup,
} from "@/components/check-in/types";

export default function CheckInGearPage() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedGears, setSelectedGears] = useState<string[]>([]);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [damage, setDamage] = useState<DamageLevel>("none");
  const [notes, setNotes] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);

  const { checkedOutGears, pendingCheckInCount, fetchCheckedOutGear, isLoading } = useCheckedOutGears(
    userId,
    toast,
  );
  const { groups: historyGroups, loading: historyLoading, refetch: refetchHistory } = useCheckInHistory(userId);
  const { submit, isSubmitting } = useCheckInSubmit(toast);

  const groupedGears = useMemo(() => groupCheckedOutGears(checkedOutGears), [checkedOutGears]);

  const selectedGearObjects = useMemo(
    () => checkedOutGears.filter((g) => selectedGears.includes(g.id)),
    [checkedOutGears, selectedGears],
  );

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) setUserId(user.id);
    });
  }, []);

  const isGroupSelected = useCallback(
    (group: GearReturnGroup) => group.gears.every((gear) => selectedGears.includes(gear.id)),
    [selectedGears],
  );

  const setGroupSelection = useCallback((group: GearReturnGroup, shouldSelect: boolean) => {
    const groupGearIds = group.gears.map((gear) => gear.id);
    setSelectedGears((prev) =>
      shouldSelect
        ? Array.from(new Set([...prev, ...groupGearIds]))
        : prev.filter((id) => !groupGearIds.includes(id)),
    );
    setSelectedQuantities((prev) => {
      const next = { ...prev };
      if (shouldSelect) {
        group.gears.forEach((gear) => {
          next[gear.id] = Math.max(1, gear.returnable_quantity || 1);
        });
      } else {
        group.gears.forEach((gear) => {
          delete next[gear.id];
        });
      }
      return next;
    });
  }, []);

  const toggleGroup = useCallback(
    (group: GearReturnGroup) => setGroupSelection(group, !isGroupSelected(group)),
    [isGroupSelected, setGroupSelection],
  );

  const handleQuantityChange = useCallback((gearId: string, delta: number, max: number) => {
    setSelectedQuantities((prev) => {
      const current = prev[gearId] ?? max;
      const next = Math.min(max, Math.max(1, current + delta));
      return { ...prev, [gearId]: next };
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedGears(checkedOutGears.map((g) => g.id));
    setSelectedQuantities((prev) => {
      const next = { ...prev };
      checkedOutGears.forEach((gear) => {
        next[gear.id] = Math.max(1, gear.returnable_quantity || 1);
      });
      return next;
    });
  }, [checkedOutGears]);

  const resetForm = useCallback(() => {
    setStep(1);
    setSelectedGears([]);
    setSelectedQuantities({});
    setDamage("none");
    setNotes("");
  }, []);

  const handleScan = useCallback(
    (code: string) => {
      const match = matchGearByScanCode(checkedOutGears, code);
      if (!match) {
        toast({
          title: "Gear not found",
          description: "That code doesn't match any of your returnable equipment.",
          variant: "destructive",
        });
        return;
      }

      const group = groupedGears.find((g) => g.gears.some((gear) => gear.id === match.id));
      if (group) {
        setGroupSelection(group, true);
      } else {
        setSelectedGears((prev) => Array.from(new Set([...prev, match.id])));
        setSelectedQuantities((prev) => ({
          ...prev,
          [match.id]: Math.max(1, match.returnable_quantity || 1),
        }));
      }

      toast({
        title: "Gear selected",
        description: `${match.name} added to your return.`,
      });
    },
    [checkedOutGears, groupedGears, setGroupSelection, toast],
  );

  const canProceedStep1 = selectedGears.length > 0;
  const canProceedStep2 = damage !== "major" || notes.trim().length > 0;
  const hasOverdueSelection = selectedGearObjects.some((g) => isOverdue(g.due_date));

  const handleSubmit = async () => {
    await submit({
      selectedGearIds: selectedGears,
      quantities: selectedQuantities,
      checkedOutGears,
      damage,
      notes,
      onSuccess: () => {
        resetForm();
        void fetchCheckedOutGear();
        void refetchHistory();
      },
    });
  };

  const selectedGroupCount = groupedGears.filter((g) => isGroupSelected(g)).length;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <CheckInHeader onScanClick={() => setScannerOpen(true)} />
      <PendingReturnsBanner count={pendingCheckInCount} />

      <Tabs defaultValue="check-in" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="check-in" className="gap-2">
            <PackageCheck className="h-4 w-4" />
            Return gear
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="check-in" className="space-y-6">
          {isLoading && checkedOutGears.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : checkedOutGears.length === 0 ? (
            <CheckInEmptyState pendingCount={pendingCheckInCount} />
          ) : (
            <>
              <ReturnStepIndicator step={step} />

              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">Select items to return</h2>
                      <p className="text-sm text-muted-foreground">
                        Choose bookings or individual equipment
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {selectedGroupCount} / {groupedGears.length} bookings
                      </Badge>
                      <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
                        Select all
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {groupedGears.map((group) => (
                      <BookingReturnCard
                        key={group.key}
                        group={group}
                        selected={isGroupSelected(group)}
                        quantities={selectedQuantities}
                        onToggleGroup={toggleGroup}
                        onQuantityChange={handleQuantityChange}
                      />
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="button" disabled={!canProceedStep1} onClick={() => setStep(2)}>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  {hasOverdueSelection && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Overdue items selected</AlertTitle>
                      <AlertDescription>
                        One or more items are past their due date. Note any wear in the condition step.
                      </AlertDescription>
                    </Alert>
                  )}

                  <ReturnDetailsStep
                    damage={damage}
                    notes={notes}
                    onDamageChange={(v) => setDamage(v as DamageLevel)}
                    onNotesChange={setNotes}
                  />

                  <div className="flex justify-between gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button type="button" disabled={!canProceedStep2} onClick={() => setStep(3)}>
                      Review
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <ReturnReviewStep
                    selectedGears={selectedGearObjects}
                    quantities={selectedQuantities}
                    damage={damage}
                    notes={notes}
                  />

                  <div className="flex justify-between gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setStep(2)}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      disabled={isSubmitting || !canProceedStep2}
                      onClick={() => void handleSubmit()}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Submit return
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="history">
          <CheckInHistoryList groups={historyGroups} loading={historyLoading} />
        </TabsContent>
      </Tabs>

      <QrScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleScan} />
    </div>
  );
}
