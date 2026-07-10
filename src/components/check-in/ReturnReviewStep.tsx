import Image from "next/image";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { groupCheckedOutGears, type ProcessedGear } from "./types";

interface ReturnReviewStepProps {
  selectedGears: ProcessedGear[];
  quantities: Record<string, number>;
  damage: string;
  notes: string;
}

const DAMAGE_LABELS: Record<string, string> = {
  none: "No damage",
  minor: "Minor wear",
  major: "Major damage",
};

export function ReturnReviewStep({
  selectedGears,
  quantities,
  damage,
  notes,
}: ReturnReviewStepProps) {
  const totalUnits = selectedGears.reduce(
    (sum, g) => sum + (quantities[g.id] ?? g.returnable_quantity),
    0,
  );

  const reviewGroups = groupCheckedOutGears(selectedGears).map((group) => ({
    ...group,
    gears: group.gears.filter((g) => selectedGears.some((s) => s.id === g.id)),
  }));

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Return summary</h3>
        <Badge variant="secondary">
          {selectedGears.length} item{selectedGears.length !== 1 ? "s" : ""} · {totalUnits} unit
          {totalUnits !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="space-y-3">
        {reviewGroups.map((group) => {
          const groupLabel = group.destination
            ? group.destination
            : group.bookingDate
              ? `Booking · ${format(new Date(group.bookingDate), "MMM d, yyyy")}`
              : "Selected items";

          return (
            <div key={group.key} className="overflow-hidden rounded-xl border border-border">
              <div className="border-b border-border bg-muted/30 px-3 py-2">
                <p className="text-sm font-medium">{groupLabel}</p>
                {group.reason && (
                  <p className="text-xs text-muted-foreground">{group.reason}</p>
                )}
              </div>
              <ul className="divide-y divide-border">
                {group.gears.map((gear) => {
                  const qty = quantities[gear.id] ?? gear.returnable_quantity;
                  return (
                    <li key={gear.id} className="flex items-center gap-3 p-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {gear.image_url ? (
                          <Image src={gear.image_url} alt="" fill className="object-cover" sizes="40px" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{gear.name}</p>
                        {gear.due_date && (
                          <p className="text-xs text-muted-foreground">
                            Due {format(new Date(gear.due_date), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-medium tabular-nums">×{qty}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <dt className="text-xs text-muted-foreground">Condition</dt>
          <dd className="font-medium">{DAMAGE_LABELS[damage] ?? damage}</dd>
        </div>
        {notes.trim() && (
          <div className="rounded-lg bg-muted/50 px-3 py-2 sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Notes</dt>
            <dd className="mt-0.5 whitespace-pre-wrap">{notes}</dd>
          </div>
        )}
      </dl>

      <p className="text-xs text-muted-foreground">
        Submitting sends your return for admin approval. You can submit more returns anytime.
      </p>
    </div>
  );
}
